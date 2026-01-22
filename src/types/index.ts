export type ExportSize = "630x354" | "850x480" | "1920x1080";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  sourceKey: string;
  startTime: number; // seconds
  duration: number; // seconds
  size: ExportSize;
  removeAudio: boolean;
  resultKey?: string;
  resultUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateJobRequest {
  sourceKey: string;
  startTime: number;
  duration: number;
  size: ExportSize;
  removeAudio: boolean;
}

export interface CreateJobResponse {
  jobId: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
}
