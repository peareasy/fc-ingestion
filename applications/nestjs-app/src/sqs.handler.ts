import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

export interface SQSMessage {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
  Attributes?: Record<string, string>;
}

export interface ProcessedMessage {
  messageId: string;
  receiptHandle: string;
  data: any;
  processedAt: string;
}

@Injectable()
export class SQSHandler {
  private readonly logger = new Logger(SQSHandler.name);

  @MessagePattern('process-message')
  async handleMessage(
    @Payload() message: SQSMessage,
  ): Promise<ProcessedMessage> {
    this.logger.log(`Processing message: ${message.MessageId}`);

    try {
      // Parse the message body
      const messageData = JSON.parse(message.Body);

      // Process the message data
      const processedData = await this.processMessageData(messageData);

      this.logger.log(`Successfully processed message: ${message.MessageId}`);

      return {
        messageId: message.MessageId,
        receiptHandle: message.ReceiptHandle,
        data: processedData,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error processing message ${message.MessageId}:`,
        error,
      );
      throw error; // This will cause the message to be moved to DLQ after retries
    }
  }

  private async processMessageData(data: any): Promise<any> {
    // Add your data processing logic here
    // This is where you would implement your business logic
    // For example: data validation, transformation, storage, etc.

    this.logger.log('Processing data:', JSON.stringify(data, null, 2));

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return processed data
    return {
      ...data,
      processed: true,
      processingTimestamp: new Date().toISOString(),
    };
  }
}
