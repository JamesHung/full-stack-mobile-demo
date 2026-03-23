export const NOTE_STATUSES = [
  "draft",
  "uploaded",
  "processing",
  "completed",
  "failed",
] as const;

export const JOB_STATUSES = ["queued", "running", "completed", "failed"] as const;

export type NoteStatus = (typeof NOTE_STATUSES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSessionDto {
  accessToken: string;
  tokenType: "Bearer";
  user: UserDto;
}

export interface CreateNoteRequestDto {
  title?: string;
}

export interface UploadAudioInputDto {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number;
}

export interface AudioAssetDto extends UploadAudioInputDto {
  id: string;
  uploadedAt: string;
}

export interface ProcessingJobDto {
  id: string;
  attempt: number;
  status: JobStatus;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  failureReason?: string | null;
}

export interface NoteListItemDto {
  id: string;
  title: string;
  status: NoteStatus;
  summaryPreview?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDetailDto extends NoteListItemDto {
  transcript?: string | null;
  summary?: string | null;
  tags: string[];
  audio?: AudioAssetDto | null;
  latestJob?: ProcessingJobDto | null;
}

export interface NoteListResponseDto {
  items: NoteListItemDto[];
}

export interface UploadAudioResponseDto {
  note: NoteDetailDto;
  job: ProcessingJobDto;
}

export interface RetryResponseDto {
  note: NoteDetailDto;
  job: ProcessingJobDto;
}
