// src/AppContext.ts — global shared state via React context
import { createContext, useContext } from 'react';
import type { AppState } from './types.js';

export const AppContext = createContext<AppState>({
  mountedLLM: null,
  activeWhisperModel: null,
  functionGemmaModel: null,
  setMountedLLM: () => undefined,
  setActiveWhisperModel: () => undefined,
  setFunctionGemmaModel: () => undefined,
});

export function useAppState(): AppState {
  return useContext(AppContext);
}
