// src/types.ts — shared type definitions for all API responses and UI state

export interface ModelDetails {
  family: string | null;
  parameter_size: string | null;
  quantization_level: string | null;
}

export interface LocalModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string | null;
  details: ModelDetails;
}

export interface RunningModel {
  name: string;
  size: number;
  size_vram: number;
  expires_at: string | null;
}

export interface SearchModel {
  name: string;
  description: string;
  size: string;
}

export interface PullProgress {
  status: string;
  digest: string;
  total: number;
  completed: number;
  percent: number;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TranscriptEntry {
  text: string;
  language: string | null;
  ts: string;
  segments?: TranscriptSegment[];
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscribeResult {
  text: string;
  language: string | null;
  duration: number | null;
  segments: TranscriptSegment[];
}

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

export interface ToolCallResult {
  type: 'tool_call' | 'text' | 'error';
  tool_call?: { name: string; arguments: Record<string, unknown> };
  content?: string;
  raw?: string;
  error?: string;
  /** Tool calls executed during the agentic loop, in order */
  tool_steps?: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
}

export interface ApiModelsResponse   { models: LocalModel[];  count: number }
export interface ApiRunningResponse  { models: RunningModel[]; count: number }
export interface ApiSearchResponse   { models: SearchModel[];  count: number }
export interface ApiToolsResponse    { tools: ToolDefinition[];  count: number }
export interface ApiRecordingStatus  { recording: boolean }

// Whisper model registry
export interface WhisperModelInfo {
  name: string;           // e.g. "base"
  label: string;          // display name
  size: string;           // approx download size
  ollamaTag: string;      // tag used for download check (stored locally as marker)
}

export const WHISPER_MODELS: WhisperModelInfo[] = [
  { name: 'tiny',     label: 'Whisper Tiny',     size: '~75 MB',  ollamaTag: 'whisper:tiny'     },
  { name: 'base',     label: 'Whisper Base',     size: '~145 MB', ollamaTag: 'whisper:base'     },
  { name: 'small',    label: 'Whisper Small',    size: '~466 MB', ollamaTag: 'whisper:small'    },
  { name: 'medium',   label: 'Whisper Medium',   size: '~1.5 GB', ollamaTag: 'whisper:medium'   },
  { name: 'large',    label: 'Whisper Large',    size: '~2.9 GB', ollamaTag: 'whisper:large'    },
  { name: 'large-v2', label: 'Whisper Large v2', size: '~2.9 GB', ollamaTag: 'whisper:large-v2' },
  { name: 'large-v3', label: 'Whisper Large v3', size: '~2.9 GB', ollamaTag: 'whisper:large-v3' },
];

// Shared app state passed down via context
export interface AppState {
  mountedLLM: string | null;
  activeWhisperModel: string | null;
  functionGemmaModel: string | null;
  setMountedLLM: (name: string | null) => void;
  setActiveWhisperModel: (name: string | null) => void;
  setFunctionGemmaModel: (name: string | null) => void;
}

// Agentic pipeline SSE event types
export type AgenticEvent =
  | { type: 'token';       token: string }
  | { type: 'tool_call';   name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'done' }
  | { type: 'error';       message: string };
