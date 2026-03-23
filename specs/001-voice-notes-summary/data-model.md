# Data Model: Voice Notes Summary

## User

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | Primary identifier |
| `email` | string | yes | Unique login identity for future expansion |
| `displayName` | string | yes | Friendly name shown in app |
| `authProvider` | enum(`demo`) | yes | MVP only uses demo auth |
| `createdAt` | datetime | yes | Audit timestamp |

**Validation rules**

- `email` must be syntactically valid even for seeded demo users
- All note queries must scope by `userId`

## VoiceNote

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | Primary note identifier |
| `userId` | UUID | yes | Owner reference |
| `title` | string | no | Optional user-supplied or generated title |
| `status` | enum | yes | `draft`, `uploaded`, `processing`, `completed`, `failed` |
| `summary` | text | no | Final summarized result |
| `summaryPreview` | string | no | Truncated summary used in list UI |
| `transcript` | text | no | Full transcription result |
| `tags` | string[] | no | Extracted labels |
| `errorCode` | string | no | Stable machine-readable failure code |
| `errorMessage` | string | no | User-visible failure explanation |
| `latestJobId` | UUID | no | Most recent processing attempt |
| `audioAssetId` | UUID | no | Attached source audio |
| `createdAt` | datetime | yes | Creation timestamp |
| `updatedAt` | datetime | yes | Last mutation timestamp |
| `completedAt` | datetime | no | Present only when status is `completed` |

**Validation rules**

- `status=completed` requires non-empty `transcript` and non-empty `summary`
- `status=failed` requires `errorCode` and `errorMessage`
- `summaryPreview` must be derived from `summary`, not independently authored
- `tags` should contain unique, non-empty strings

## AudioAsset

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | Primary asset identifier |
| `noteId` | UUID | yes | Associated note |
| `storageKey` | string | yes | Filesystem or object-storage path |
| `fileName` | string | yes | Original filename |
| `mimeType` | string | yes | Accepted audio MIME type |
| `fileSizeBytes` | integer | yes | Upload validation input |
| `durationSeconds` | integer | no | Extracted metadata when available |
| `uploadedAt` | datetime | yes | Upload timestamp |

**Validation rules**

- Allowed MIME types must be limited to the supported mobile recording/upload formats
- `fileSizeBytes` must be below the MVP upload limit
- Each note can only point to one active source asset for MVP

## ProcessingJob

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | Primary job identifier |
| `noteId` | UUID | yes | Associated note |
| `attempt` | integer | yes | Retry sequence starting at 1 |
| `status` | enum(`queued`, `running`, `completed`, `failed`) | yes | Worker lifecycle |
| `startedAt` | datetime | no | Set when worker begins |
| `finishedAt` | datetime | no | Set when worker ends |
| `failureReason` | string | no | Internal diagnostic detail |
| `createdAt` | datetime | yes | Queue timestamp |

**Validation rules**

- `attempt` increments on every retry for the same note
- Only one job may be in `queued` or `running` for a note at a time
- `status=failed` requires `failureReason`

## Relationships

- `User 1 -> many VoiceNote`
- `VoiceNote 1 -> 0..1 AudioAsset`
- `VoiceNote 1 -> many ProcessingJob`
- `VoiceNote.latestJobId -> ProcessingJob.id`

## State Transitions

### VoiceNote status

| From | To | Trigger |
|---|---|---|
| `draft` | `uploaded` | Audio upload succeeds and job is queued |
| `uploaded` | `processing` | Worker starts job |
| `processing` | `completed` | Transcript, summary, and tags are persisted |
| `processing` | `failed` | Worker fails and error info is persisted |
| `failed` | `uploaded` | User retries and a new job is queued |

### ProcessingJob status

| From | To | Trigger |
|---|---|---|
| `queued` | `running` | Worker locks and starts job |
| `running` | `completed` | Processing succeeds |
| `running` | `failed` | Processing fails |

## Derived Read Models

- **NoteListItem**: `id`, `title`, `status`, `summaryPreview`, `createdAt`, `updatedAt`, `errorMessage`
- **NoteDetail**: `NoteListItem` plus `transcript`, `summary`, `tags`, `audio metadata`, `latest job attempt`

## Security And Ownership Rules

- Every note query and mutation requires authenticated `userId`
- Retry is only allowed when the note owner matches the caller and the current status is `failed`
- Upload and detail endpoints must reject access to notes owned by other users
