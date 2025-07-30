import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Post('ingest')
  async ingestData(@Body() data: any) {
    const messageId = await this.appService.sendMessage(data);
    return {
      success: true,
      messageId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('messages')
  async getMessages() {
    const messages = await this.appService.receiveMessages();
    return {
      count: messages.length,
      messages: messages.map((msg) => ({
        messageId: msg.MessageId,
        body: msg.Body ? JSON.parse(msg.Body) : null,
        receiptHandle: msg.ReceiptHandle,
      })),
    };
  }

  @Delete('messages/:receiptHandle')
  async deleteMessage(@Param('receiptHandle') receiptHandle: string) {
    await this.appService.deleteMessage(receiptHandle);
    return {
      success: true,
      message: 'Message deleted successfully',
    };
  }
}
