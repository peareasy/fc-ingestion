import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { DataService } from './services/data.service';
import { S3Service } from './services/s3.service';

interface SQSMessage {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
  Attributes?: Record<string, string>;
}

interface S3FileMessage {
  type: 's3_file';
  s3Key: string;
  metadata?: Record<string, any>;
}

interface DirectDataMessage {
  type: 'direct_data';
  data: any;
}

type ProcessableMessage = S3FileMessage | DirectDataMessage;

@Injectable()
export class SQSMicroservice implements OnModuleInit {
  private readonly logger = new Logger(SQSMicroservice.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private isPolling = false;

  constructor(
    private readonly dataService: DataService,
    private readonly s3Service: S3Service,
  ) {
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'eu-west-1',
    });
    this.queueUrl = process.env.QUEUE_URL || '';
  }

  async onModuleInit() {
    if (!this.queueUrl) {
      this.logger.error('QUEUE_URL environment variable is not set');
      return;
    }

    this.logger.log(`Starting SQS polling for queue: ${this.queueUrl}`);
    this.startPolling();
  }

  private async startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    while (this.isPolling) {
      try {
        await this.pollMessages();
        // Wait a bit before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error('Error polling messages:', error);
        // Wait longer on error before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async pollMessages() {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20, // Long polling
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
    });

    const result = await this.sqsClient.send(command);

    if (result.Messages && result.Messages.length > 0) {
      this.logger.log(`Received ${result.Messages.length} messages`);

      // Process messages in parallel
      await Promise.all(
        result.Messages.map((message) =>
          this.processMessage(message as SQSMessage),
        ),
      );
    }
  }

  private async processMessage(message: SQSMessage) {
    try {
      this.logger.log(`Processing message: ${message.MessageId}`);

      // Parse the message body
      const messageData = JSON.parse(message.Body) as ProcessableMessage;

      // Handle different message types
      if (messageData.type === 's3_file') {
        await this.processS3FileMessage(messageData, message.MessageId);
      } else if (messageData.type === 'direct_data') {
        await this.processDirectDataMessage(messageData, message.MessageId);
      } else {
        // Legacy support for direct JSON messages
        await this.processLegacyMessage(messageData, message.MessageId);
      }

      // Delete the message after processing
      await this.deleteMessage(message.ReceiptHandle);

      this.logger.log(
        `Successfully processed and deleted message: ${message.MessageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing message ${message.MessageId}:`,
        error,
      );
      // Don't delete the message on error - let it go to DLQ after retries
    }
  }

  private async processS3FileMessage(
    messageData: S3FileMessage,
    messageId: string,
  ) {
    this.logger.log(`Processing S3 file: ${messageData.s3Key}`);

    const startTime = Date.now();

    try {
      // Check if file exists in S3
      const fileExists = await this.s3Service.fileExists(messageData.s3Key);
      if (!fileExists) {
        throw new Error(`S3 file not found: ${messageData.s3Key}`);
      }

      // Get file info
      const fileInfo = await this.s3Service.getFileInfo(messageData.s3Key);
      this.logger.log(
        `File info: ${fileInfo.s3Key} (${fileInfo.fileSize} bytes)`,
      );

      // Download and parse the JSON file from S3
      const records = await this.s3Service.downloadAndParseJsonFile(
        messageData.s3Key,
      );

      this.logger.log(
        `Processing ${records.length} records from S3 file: ${messageData.s3Key}`,
      );

      // Process each record and save to MongoDB
      for (let i = 0; i < records.length; i++) {
        const recordStartTime = Date.now();

        try {
          const processedRecord = await this.processRecord(records[i], i);
          const processingTimeMs = Date.now() - recordStartTime;

          // Save to MongoDB
          await this.dataService.saveProcessedData({
            s3Key: messageData.s3Key,
            messageId: messageId,
            recordIndex: i,
            originalData: records[i],
            processedData: processedRecord,
            processingTimeMs,
            status: 'success',
          });
        } catch (error) {
          const processingTimeMs = Date.now() - recordStartTime;

          // Save error to MongoDB
          await this.dataService.saveProcessedData({
            s3Key: messageData.s3Key,
            messageId: messageId,
            recordIndex: i,
            originalData: records[i],
            processedData: null,
            processingTimeMs,
            status: 'error',
            errorMessage: error.message,
          });
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      this.logger.log(
        `Successfully processed S3 file ${messageData.s3Key}: ${records.length} records in ${totalProcessingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process S3 file ${messageData.s3Key}: ${error.message}`,
      );
      throw error;
    }
  }

  private async processDirectDataMessage(
    messageData: DirectDataMessage,
    messageId: string,
  ) {
    this.logger.log(`Processing direct data message: ${messageId}`);
    const startTime = Date.now();

    try {
      const processedData = await this.processRecord(messageData.data, 0);
      const processingTimeMs = Date.now() - startTime;

      // Save to MongoDB
      await this.dataService.saveProcessedData({
        s3Key: 'direct_message',
        messageId: messageId,
        recordIndex: 0,
        originalData: messageData.data,
        processedData: processedData,
        processingTimeMs,
        status: 'success',
      });
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      // Save error to MongoDB
      await this.dataService.saveProcessedData({
        s3Key: 'direct_message',
        messageId: messageId,
        recordIndex: 0,
        originalData: messageData.data,
        processedData: null,
        processingTimeMs,
        status: 'error',
        errorMessage: error.message,
      });
    }
  }

  private async processLegacyMessage(messageData: any, messageId: string) {
    this.logger.log(`Processing legacy message: ${messageId}`);
    this.logger.log('Message body:', JSON.stringify(messageData, null, 2));

    const startTime = Date.now();

    try {
      const processedData = await this.processRecord(messageData, 0);
      const processingTimeMs = Date.now() - startTime;

      // Save to MongoDB
      await this.dataService.saveProcessedData({
        s3Key: 'legacy_message',
        messageId: messageId,
        recordIndex: 0,
        originalData: messageData,
        processedData: processedData,
        processingTimeMs,
        status: 'success',
      });
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      // Save error to MongoDB
      await this.dataService.saveProcessedData({
        s3Key: 'legacy_message',
        messageId: messageId,
        recordIndex: 0,
        originalData: messageData,
        processedData: null,
        processingTimeMs,
        status: 'error',
        errorMessage: error.message,
      });
    }
  }

  private async processRecord(record: any, index: number) {
    // Add your data processing logic here
    // This is where you would implement your business logic
    // For example: data validation, transformation, storage, etc.

    this.logger.log(
      `Processing record ${index}:`,
      JSON.stringify(record, null, 2),
    );

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return processed data
    return {
      ...record,
      processed: true,
      processingTimestamp: new Date().toISOString(),
      recordIndex: index,
    };
  }

  private async deleteMessage(receiptHandle: string) {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }

  async stopPolling() {
    this.isPolling = false;
    this.logger.log('Stopping SQS polling');
  }
}
