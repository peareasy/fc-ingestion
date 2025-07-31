import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SqsModule } from '@ssut/nestjs-sqs';
import { AppService } from './app.service';
import { SQSHandler } from './sqs.handler';
import {
  ProcessedData,
  ProcessedDataSchema,
} from './schemas/processed-data.schema';
import { DataService } from './services/data.service';
import { S3Service } from './services/s3.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/fc-ingestion',
      {
        // MongoDB Atlas connection options
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    ),
    MongooseModule.forFeature([
      { name: ProcessedData.name, schema: ProcessedDataSchema },
    ]),
    SqsModule.register({
      consumers: [
        {
          name: 'fc-ingestion-queue.fifo',
          queueUrl: process.env.QUEUE_URL || '',
          region: process.env.AWS_REGION || 'eu-west-1',
        },
      ],
      producers: [],
    }),
  ],
  controllers: [SQSHandler],
  providers: [AppService, DataService, S3Service],
})
export class AppModule {}
