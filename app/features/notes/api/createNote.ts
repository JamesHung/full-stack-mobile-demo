import type {
  AuthSessionDto,
  CreateNoteRequestDto,
  NoteDetailDto,
  NoteListResponseDto,
  RetryResponseDto,
  UploadAudioInputDto,
  UploadAudioResponseDto,
} from "@voice-notes/shared";
import { ApiClient, createJsonRequest } from "../../../lib/api/client";

export async function demoLogin(client: ApiClient, email: string): Promise<AuthSessionDto> {
  return client.request("/auth/demo-login", createJsonRequest({ email }));
}

export async function createNote(client: ApiClient, payload: CreateNoteRequestDto): Promise<NoteDetailDto> {
  return client.request("/notes", createJsonRequest(payload));
}

export async function listNotes(client: ApiClient): Promise<NoteListResponseDto> {
  return client.request("/notes");
}

export async function getNoteDetail(client: ApiClient, noteId: string): Promise<NoteDetailDto> {
  return client.request(`/notes/${noteId}`);
}

export async function retryNote(client: ApiClient, noteId: string): Promise<RetryResponseDto> {
  return client.request(`/notes/${noteId}/retry`, { method: "POST" });
}

export async function uploadAudio(
  client: ApiClient,
  noteId: string,
  payload: UploadAudioInputDto,
): Promise<UploadAudioResponseDto> {
  return client.request(`/notes/${noteId}/audio`, createJsonRequest(payload));
}
