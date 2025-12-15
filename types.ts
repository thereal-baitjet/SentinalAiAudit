export interface SecurityEvent {
  timestamp: string; // HH:MM:SS
  severity: number; // 1, 3, 5
  classification: string;
  description: string;
  confidence: number;
}

export interface VideoMeta {
  duration: string;
  lighting: string;
}

export interface AnalysisResult {
  video_meta: VideoMeta;
  events: SecurityEvent[];
  summary: string;
}

export enum AnalysisState {
  IDLE,
  UPLOADING,
  ANALYZING,
  COMPLETE,
  ERROR,
}
