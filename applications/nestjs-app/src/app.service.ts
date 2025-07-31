import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

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

  getHealth(): { status: string; timestamp: string; queueUrl: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queueUrl: this.queueUrl,
    };
  }
}
