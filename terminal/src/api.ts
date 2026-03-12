// src/api.ts — typed FastAPI client
import fetch, { type RequestInit } from 'node-fetch';
import type {
  ApiModelsResponse,
  ApiRunningResponse,
  ApiSearchResponse,
  ApiToolsResponse,
  ApiRecordingStatus,
  LocalModel,
  RunningModel,
  SearchModel,
  ToolDefinition,
  TranscribeResult,
  PullProgress,
  ChatMessage,
  AgenticEvent,
} from './types.js';

const BASE = process.env['API_URL'] ?? 'http://localhost:8000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Models ───────────────────────────────────────────────────────────────────

export const listModels = (): Promise<ApiModelsResponse> =>
  request('/models');

export const runningModels = (): Promise<ApiRunningResponse> =>
  request('/models/running');

export const searchModels = (q = ''): Promise<ApiSearchResponse> =>
  request(`/models/search?q=${encodeURIComponent(q)}`);

export const deleteModel = (name: string): Promise<{ success: boolean; model: string }> =>
  request(`/models/${encodeURIComponent(name)}`, { method: 'DELETE' });

export const loadModel = (model: string): Promise<{ success: boolean; model: string; status: string }> =>
  request('/models/load', { method: 'POST', body: JSON.stringify({ model }) });

export const unloadModel = (model: string): Promise<{ success: boolean; model: string; status: string }> =>
  request('/models/unload', { method: 'POST', body: JSON.stringify({ model }) });

export const unloadAllModels = (): Promise<{ unloaded: number; models: string[] }> =>
  request('/models/unload-all', { method: 'POST' });

export async function* pullModelStream(model: string): AsyncGenerator<PullProgress> {
  const res = await fetch(`${BASE}/models/pull?model=${encodeURIComponent(model)}`, { method: 'POST' });
  if (!res.body) throw new Error('No response body');
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const text = decoder.decode(chunk as Buffer);
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)) as PullProgress; } catch { /* skip malformed */ }
      }
    }
  }
}

// ── Inference ────────────────────────────────────────────────────────────────

export async function* chatStream(
  model: string,
  messages: ChatMessage[],
  systemPrompt?: string,
  temperature = 0.7,
): AsyncGenerator<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, system_prompt: systemPrompt, temperature, stream: true }),
  });
  if (!res.body) throw new Error('No response body');
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const text = decoder.decode(chunk as Buffer);
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try { yield (JSON.parse(line.slice(6)) as { token: string }).token; } catch { /* skip */ }
      }
    }
  }
}

export async function* agenticChatStream(
  model: string,
  messages: ChatMessage[],
  systemPrompt?: string,
  temperature = 0.7,
): AsyncGenerator<AgenticEvent> {
  const res = await fetch(`${BASE}/chat/agentic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, system_prompt: systemPrompt, temperature }),
  });
  if (!res.body) throw new Error('No response body');
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const text = decoder.decode(chunk as Buffer);
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)) as AgenticEvent; } catch { /* skip malformed */ }
      }
    }
  }
}

// ── Automate ─────────────────────────────────────────────────────────────────

export interface AutomateTask {
  title: string;
  prompt: string;
}

export interface AutomateParseResult {
  file: string;
  tasks: AutomateTask[];
  count: number;
}

export const parseAutomateFile = (path: string): Promise<AutomateParseResult> =>
  request('/automate/parse', {
    method: 'POST',
    body: JSON.stringify({ path, cwd: process.cwd() }),
  });

// ── Tools ────────────────────────────────────────────────────────────────────

export const listTools = (): Promise<ApiToolsResponse> =>
  request('/tools');

export const executeTool = (
  tool_name: string,
  arguments_: Record<string, unknown>,
): Promise<{ tool: string; result: unknown }> =>
  request('/tools/execute', {
    method: 'POST',
    body: JSON.stringify({ tool_name, arguments: arguments_ }),
  });

// ── ASR ──────────────────────────────────────────────────────────────────────

export const startRecording = (): Promise<{ status: string; sample_rate?: number }> =>
  request('/asr/record/start', { method: 'POST' });

export const stopRecording = (language?: string): Promise<TranscribeResult> =>
  request(`/asr/record/stop${language ? `?language=${encodeURIComponent(language)}` : ''}`, {
    method: 'POST',
  });

export const recordingStatus = (): Promise<ApiRecordingStatus> =>
  request('/asr/record/status');

export const setWhisperModel = (modelSize: string): Promise<{ default_model: string }> =>
  request(`/asr/model?model_size=${encodeURIComponent(modelSize)}`, { method: 'POST' });

// Re-export types for convenience
export type {
  LocalModel, RunningModel, SearchModel, ToolDefinition,
  TranscribeResult, PullProgress, ChatMessage, AgenticEvent,
};
