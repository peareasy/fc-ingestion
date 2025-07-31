import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppService } from './app.service';
import { SQSHandler } from './sqs.handler';
import { SQSMicroservice } from './sqs.microservice';
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
  ],
  controllers: [],
  providers: [AppService, SQSHandler, SQSMicroservice, DataService, S3Service],
})
export class AppModule {}
