// Shared types and utilities for FC Ingestion

export interface IngestionMessage {
  id: string;
  timestamp: string;
  data: any;
  source: string;
}

export interface ProcessingResult {
  success: boolean;
  messageId: string;
  error?: string;
  processedAt: string;
}

export const QUEUE_NAMES = {
  INGESTION: "FcIngestionQueue",
  DEAD_LETTER: "FcIngestionDLQ",
} as const;

export const AWS_REGIONS = {
  US_EAST_1: "us-east-1",
  US_WEST_2: "us-west-2",
  EU_WEST_1: "eu-west-1",
} as const;
