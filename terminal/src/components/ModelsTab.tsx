// src/components/ModelsTab.tsx
// Two sections: LLMs · ASR (Whisper)
// Enter on any row = mount/unmount. Green = mounted/active.
// [n] download by name, [r] refresh, [d] delete.
// Download progress is shown inline at the bottom — the model list stays visible.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import * as api from '../api.js';
import { useAppState } from '../AppContext.js';
import { WHISPER_MODELS } from '../types.js';
import type { LocalModel, RunningModel, PullProgress } from '../types.js';

type Section = 'llm' | 'asr';

function buildBar(pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
function fmtBytes(b: number): string {
  if (!b) return '';
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${b} B`;
}

export default function ModelsTab(): React.ReactElement {
  const { mountedLLM, setMountedLLM, activeWhisperModel, setActiveWhisperModel } = useAppState();

  const [section, setSection]         = useState<Section>('llm');
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [runningModels, setRunning]   = useState<RunningModel[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');

  // Inline download progress — null means not downloading
  const [pullProgress, setPullProg]   = useState<PullProgress | null>(null);
  const [pullingName, setPullingName] = useState('');

  const [downloadInput, setDownload]  = useState('');
  const [showDownload, setShowDL]     = useState(false);

  const isMounted     = useRef(true);
  const mountedLLMRef = useRef(mountedLLM);
  mountedLLMRef.current = mountedLLM;

  useEffect(() => () => { isMounted.current = false; }, []);

  const sectionLen = section === 'llm' ? localModels.length : WHISPER_MODELS.length;

  // ── refresh model lists ───────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [loc, run] = await Promise.all([api.listModels(), api.runningModels()]);
      if (!isMounted.current) return;
      setLocalModels(loc.models ?? []);
      setRunning(run.models ?? []);
      const running = run.models ?? [];
      const current = mountedLLMRef.current;
      if (current && !running.some(r => r.name === current)) {
        setMountedLLM(null);
      }
      setStatus('');
    } catch (e) { setStatus(`Error: ${(e as Error).message}`); }
    setLoading(false);
  }, [setMountedLLM]);

  useEffect(() => { void refresh(); }, [refresh]);

  // ── pull a model — keeps browse view visible, shows progress inline ───────
  const pullModel = useCallback(async (name: string): Promise<boolean> => {
    setPullingName(name);
    setPullProg({ status: 'Starting…', digest: '', total: 0, completed: 0, percent: 0 });
    setStatus('');
    let success = false;
    try {
      for await (const prog of api.pullModelStream(name)) {
        if (!isMounted.current) return false;
        if (prog.status === 'done') break;
        setPullProg(prog);
      }
      setStatus(`Downloaded: ${name}`);
      success = true;
      void refresh();
    } catch (e) {
      setStatus(`Pull error: ${(e as Error).message}`);
    }
    if (isMounted.current) {
      setPullProg(null);
      setPullingName('');
    }
    return success;
  }, [refresh]);

  // ── activate Whisper model ────────────────────────────────────────────────
  const activateWhisper = useCallback(async (modelName: string) => {
    setStatus(`Setting Whisper model: ${modelName}…`);
    try {
      await api.setWhisperModel(modelName);
      setActiveWhisperModel(modelName);
      setStatus(`Whisper model set: ${modelName} (weights download on first use)`);
    } catch (e) { setStatus(`Error: ${(e as Error).message}`); }
  }, [setActiveWhisperModel]);

  // ── mount / unmount LLM ───────────────────────────────────────────────────
  const toggleLLM = useCallback(async (name: string) => {
    const isRunning = runningModels.some(r => r.name === name);
    if (isRunning) {
      setStatus(`Unloading ${name}…`);
      try {
        await api.unloadModel(name);
        setMountedLLM(null);
        setStatus(`Unmounted: ${name}`);
        void refresh();
      } catch (e) { setStatus(`Error: ${(e as Error).message}`); }
    } else {
      setStatus(`Mounting ${name}…`);
      try {
        await api.loadModel(name);
        setMountedLLM(name);
        setStatus(`Mounted: ${name}`);
        setTimeout(() => { void refresh(); }, 600);
      } catch (e) { setStatus(`Error: ${(e as Error).message}`); }
    }
  }, [runningModels, setMountedLLM, refresh]);

  // ── keyboard ──────────────────────────────────────────────────────────────
  useInput((input, key) => {
    // While downloading, only allow cancelling the name input
    if (showDownload) {
      if (key.escape) { setShowDL(false); setDownload(''); }
      return;
    }

    if (input === 'l') { setSection('llm'); setSelectedIdx(0); }
    if (input === 'a') { setSection('asr'); setSelectedIdx(0); }

    if (input === 'r') void refresh();
    if (input === 'n') { setShowDL(true); setDownload(''); }

    if (key.upArrow)   setSelectedIdx(i => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIdx(i => Math.min(sectionLen - 1, i + 1));

    if (key.return) {
      if (section === 'llm') {
        const m = localModels[selectedIdx];
        if (m) void toggleLLM(m.name);
      } else if (section === 'asr') {
        const w = WHISPER_MODELS[selectedIdx];
        if (w) void activateWhisper(w.name);
      }
    }

    if (input === 'd' && section === 'llm') {
      const m = localModels[selectedIdx];
      if (m) {
        api.deleteModel(m.name)
          .then(() => { setStatus(`Deleted: ${m.name}`); void refresh(); })
          .catch(e => setStatus(`Error: ${(e as Error).message}`));
      }
    }
  });

  const isPulling = pullingName !== '';
  const pullPct   = pullProgress?.percent ?? 0;

  return (
    <Box flexDirection="column">

      {/* Section header */}
      <Box marginBottom={1}>
        <Text color={section === 'llm' ? 'cyan' : 'gray'} bold={section === 'llm'}>  [l] LLMs  </Text>
        <Text color={section === 'asr' ? 'cyan' : 'gray'} bold={section === 'asr'}>  [a] ASR   </Text>
        <Text color="gray" dimColor>  [n] download  [r] refresh  [d] delete</Text>
      </Box>

      {/* Download name input */}
      {showDownload && (
        <Box marginBottom={1}>
          <Text color="cyan">Download model: </Text>
          <TextInput
            value={downloadInput}
            onChange={setDownload}
            onSubmit={v => {
              setShowDL(false);
              setDownload('');
              if (v.trim()) void pullModel(v.trim());
            }}
            placeholder="e.g. llama3.2, mistral, phi4…  (Esc to cancel)"
          />
        </Box>
      )}

      {loading && !showDownload && !isPulling && (
        <Text color="yellow"><Spinner type="dots" /> Refreshing…</Text>
      )}

      {/* ── LLM section ──────────────────────────────────────────────────── */}
      {section === 'llm' && (
        <Box flexDirection="column">
          {localModels.length === 0 && !loading && (
            <Text color="gray" dimColor>No LLMs installed. Press [n] to download one.</Text>
          )}
          {localModels.map((m, i) => {
            const isRunning = runningModels.some(r => r.name === m.name);
            const isSel     = i === selectedIdx;
            const isMntd    = m.name === mountedLLM;
            return (
              <Box key={m.name}>
                <Text
                  color={isRunning ? 'green' : isSel ? 'cyan' : 'white'}
                  bold={isSel || isRunning}
                >
                  {isSel ? '▶ ' : '  '}
                  <Text color={isRunning ? 'green' : 'gray'}>{isRunning ? '● ' : '○ '}</Text>
                  {m.name.padEnd(36)}
                  <Text color="gray">{fmtBytes(m.size).padEnd(10)}</Text>
                  <Text color="gray" dimColor>{m.details?.parameter_size ?? ''}</Text>
                  {isMntd && <Text color="green" bold>  ← active</Text>}
                </Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="gray" dimColor>Enter = mount/unmount  ● loaded  ○ unloaded</Text>
          </Box>
        </Box>
      )}

      {/* ── ASR / Whisper section ─────────────────────────────────────────── */}
      {section === 'asr' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray" dimColor>
              Whisper runs on-device. Select a size to activate (weights download on first use).
            </Text>
          </Box>
          {WHISPER_MODELS.map((w, i) => {
            const isActive = w.name === activeWhisperModel;
            const isSel    = i === selectedIdx;
            return (
              <Box key={w.name}>
                <Text
                  color={isActive ? 'green' : isSel ? 'cyan' : 'white'}
                  bold={isSel || isActive}
                >
                  {isSel ? '▶ ' : '  '}
                  <Text color={isActive ? 'green' : 'gray'}>{isActive ? '● ' : '○ '}</Text>
                  {w.label.padEnd(24)}
                  <Text color="gray">{w.size.padEnd(12)}</Text>
                  {isActive && <Text color="green" bold>← active</Text>}
                </Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="gray" dimColor>Enter = activate model</Text>
          </Box>
        </Box>
      )}

      {/* ── Inline download progress ──────────────────────────────────────── */}
      {isPulling && (
        <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="cyan" paddingX={1}>
          <Box>
            <Text color="cyan" bold>
              <Spinner type="dots" />{'  '}
            </Text>
            <Text color="white" bold>Downloading </Text>
            <Text color="cyan" bold>{pullingName}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="yellow">
              [{buildBar(pullPct, 40)}] {pullPct.toFixed(1)}%
            </Text>
          </Box>
          {(pullProgress?.total ?? 0) > 0 && (
            <Text color="gray">
              {fmtBytes(pullProgress!.completed)} / {fmtBytes(pullProgress!.total)}
              {'  '}{pullProgress?.status}
            </Text>
          )}
          {(pullProgress?.total ?? 0) === 0 && pullProgress?.status && (
            <Text color="gray" dimColor>{pullProgress.status}</Text>
          )}
        </Box>
      )}

      {/* Status bar */}
      {status && !isPulling && (
        <Box marginTop={1}>
          <Text color={status.startsWith('Error') || status.startsWith('Pull error') ? 'red' : 'green'}>
            {status}
          </Text>
        </Box>
      )}
    </Box>
  );
}
