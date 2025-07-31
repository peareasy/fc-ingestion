import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export interface S3FileInfo {
  s3Key: string;
  bucketName: string;
  fileSize?: number;
  lastModified?: Date;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-west-1',
    });
    this.bucketName = process.env.S3_BUCKET_NAME || '';
  }

  /**
   * Download and parse a JSON file from S3
   */
  async downloadAndParseJsonFile(s3Key: string): Promise<any[]> {
    try {
      this.logger.log(`Downloading JSON file from S3: ${s3Key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      // Convert the readable stream to string
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const fileContent = new TextDecoder().decode(
        new Uint8Array(chunks.flatMap((chunk) => Array.from(chunk))),
      );

      this.logger.log(
        `Successfully downloaded file: ${s3Key} (${fileContent.length} bytes)`,
      );

      // Parse JSON content
      const jsonData = JSON.parse(fileContent);

      // Handle different JSON structures
      if (Array.isArray(jsonData)) {
        this.logger.log(`Parsed ${jsonData.length} records from JSON array`);
        return jsonData;
      } else if (jsonData.records && Array.isArray(jsonData.records)) {
        this.logger.log(
          `Parsed ${jsonData.records.length} records from records field`,
        );
        return jsonData.records;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        this.logger.log(
          `Parsed ${jsonData.data.length} records from data field`,
        );
        return jsonData.data;
      } else {
        // Single object, wrap in array
        this.logger.log('Parsed single record from JSON object');
        return [jsonData];
      }
    } catch (error) {
      this.logger.error(
        `Error downloading/parsing JSON file ${s3Key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get file information from S3
   */
  async getFileInfo(s3Key: string): Promise<S3FileInfo> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      return {
        s3Key,
        bucketName: this.bucketName,
        fileSize: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (error) {
      this.logger.error(
        `Error getting file info for ${s3Key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Validate that a file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}
