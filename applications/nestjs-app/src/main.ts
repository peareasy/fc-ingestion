import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Log startup information
  console.log('FC Ingestion Service starting...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Queue URL:', process.env.QUEUE_URL || 'not set');
  console.log('S3 Bucket:', process.env.S3_BUCKET_NAME || 'not set');
  console.log(
    'MongoDB URI:',
    process.env.MONGODB_URI ? 'configured' : 'not set',
  );
  console.log('AWS Region:', process.env.AWS_REGION || 'eu-west-1');
  console.log('S3 Integration: enabled');
  console.log('MongoDB Integration: enabled');

  // The app will start polling SQS automatically via SQSMicroservice.onModuleInit()
  console.log('Service started successfully - listening for SQS messages');
  console.log('Ready to process S3 files and store data in MongoDB');

  // Keep the application running without HTTP server
  // The app will continue running to process SQS messages
  await new Promise(() => {
    // This promise never resolves, keeping the app alive
  });
}
bootstrap();
