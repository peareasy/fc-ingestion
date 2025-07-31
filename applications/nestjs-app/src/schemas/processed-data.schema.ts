import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProcessedDataDocument = ProcessedData & Document;

@Schema({ timestamps: true })
export class ProcessedData {
  @Prop({ required: true })
  s3Key: string;

  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  recordIndex: number;

  @Prop({ type: Object, required: true })
  originalData: any;

  @Prop({ type: Object, required: true })
  processedData: any;

  @Prop({ required: true })
  processingTimestamp: Date;

  @Prop({ default: 'success' })
  status: 'success' | 'error';

  @Prop()
  errorMessage?: string;

  @Prop({ required: true })
  processingTimeMs: number;
}

export const ProcessedDataSchema = SchemaFactory.createForClass(ProcessedData);

// Add indexes for better query performance
ProcessedDataSchema.index({ s3Key: 1, messageId: 1 });
ProcessedDataSchema.index({ processingTimestamp: -1 });
ProcessedDataSchema.index({ status: 1 });
