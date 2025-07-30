import { Injectable, Logger } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor() {
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'eu-west-1',
    });
    this.queueUrl = process.env.QUEUE_URL || '';
  }

  getHello(): string {
    return 'FC Ingestion Service is running!';
  }

  async sendMessage(data: any): Promise<string> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          data,
          source: 'nestjs-app',
        }),
      });

      const result = await this.sqsClient.send(command);
      this.logger.log(`Message sent successfully: ${result.MessageId}`);
      return result.MessageId || 'unknown';
    } catch (error) {
      this.logger.error('Error sending message to SQS:', error);
      throw error;
    }
  }

  async receiveMessages(maxMessages: number = 10): Promise<any[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20, // Long polling
      });

      const result = await this.sqsClient.send(command);
      this.logger.log(`Received ${result.Messages?.length || 0} messages`);
      return result.Messages || [];
    } catch (error) {
      this.logger.error('Error receiving messages from SQS:', error);
      throw error;
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
      this.logger.log('Message deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting message from SQS:', error);
      throw error;
    }
  }

  getHealth(): { status: string; timestamp: string; queueUrl: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queueUrl: this.queueUrl,
    };
  }
}
