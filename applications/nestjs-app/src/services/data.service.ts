import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProcessedData,
  ProcessedDataDocument,
} from '../schemas/processed-data.schema';

export interface DataProcessingResult {
  s3Key: string;
  messageId: string;
  recordIndex: number;
  originalData: any;
  processedData: any;
  processingTimeMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    @InjectModel(ProcessedData.name)
    private processedDataModel: Model<ProcessedDataDocument>,
  ) {}

  /**
   * Save processed data to MongoDB
   */
  async saveProcessedData(
    result: DataProcessingResult,
  ): Promise<ProcessedData> {
    try {
      const processedData = new this.processedDataModel({
        s3Key: result.s3Key,
        messageId: result.messageId,
        recordIndex: result.recordIndex,
        originalData: result.originalData,
        processedData: result.processedData,
        processingTimestamp: new Date(),
        status: result.status,
        errorMessage: result.errorMessage,
        processingTimeMs: result.processingTimeMs,
      });

      const saved = await processedData.save();
      this.logger.log(
        `Saved processed data: ${result.s3Key} - Record ${result.recordIndex}`,
      );
      return saved;
    } catch (error) {
      this.logger.error(`Error saving processed data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get processed data by S3 key
   */
  async getProcessedDataByS3Key(s3Key: string): Promise<ProcessedData[]> {
    try {
      return await this.processedDataModel
        .find({ s3Key })
        .sort({ recordIndex: 1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error fetching processed data for ${s3Key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get processed data by message ID
   */
  async getProcessedDataByMessageId(
    messageId: string,
  ): Promise<ProcessedData[]> {
    try {
      return await this.processedDataModel
        .find({ messageId })
        .sort({ recordIndex: 1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error fetching processed data for message ${messageId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    totalRecords: number;
    successCount: number;
    errorCount: number;
    averageProcessingTime: number;
  }> {
    try {
      const stats = await this.processedDataModel.aggregate([
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            errorCount: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
            },
            averageProcessingTime: { $avg: '$processingTimeMs' },
          },
        },
      ]);

      return (
        stats[0] || {
          totalRecords: 0,
          successCount: 0,
          errorCount: 0,
          averageProcessingTime: 0,
        }
      );
    } catch (error) {
      this.logger.error(`Error fetching processing stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent processing activity
   */
  async getRecentActivity(limit: number = 10): Promise<ProcessedData[]> {
    try {
      return await this.processedDataModel
        .find()
        .sort({ processingTimestamp: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Error fetching recent activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete processed data older than specified days
   */
  async deleteOldData(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.processedDataModel
        .deleteMany({ processingTimestamp: { $lt: cutoffDate } })
        .exec();

      this.logger.log(`Deleted ${result.deletedCount} old records`);
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error(`Error deleting old data: ${error.message}`);
      throw error;
    }
  }
}
