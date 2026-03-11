import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import MarkdownText from './MarkdownText.js';
import * as api from '../api.js';
import { useAppState } from '../AppContext.js';
import { WHISPER_MODELS } from '../types.js';
import type { ChatMessage, LocalModel, RunningModel, PullProgress } from '../types.js';


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


interface Command { cmd: string; description: string }
const COMMANDS: Command[] = [
  { cmd: '/models', description: 'Browse and mount/unmount LLMs and ASR models'  },
  { cmd: '/asr',    description: 'Record voice and transcribe (on-device Whisper)' },
  { cmd: '/clear',  description: 'Clear conversation history'                      },
  { cmd: '/model',  description: 'Show currently mounted model'                    },
  { cmd: '/help',   description: 'List all commands'                               },
];

const CHAT_HEIGHT = 6; // messages visible at once


type Phase =
  | { kind: 'idle' }
  | { kind: 'waiting' }
  | { kind: 'streaming' }
  | { kind: 'tool_call';   name: string; args: Record<string, unknown> }
  | { kind: 'tool_result'; tool: string; result: unknown };


type ModelSection = 'llm' | 'asr';


export default function ChatTab(): React.ReactElement {
  const {
    mountedLLM, activeWhisperModel, functionGemmaModel,
    setMountedLLM, setActiveWhisperModel,
  } = useAppState();

  const [input, setInput]           = useState('');
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [streaming, setStreaming]   = useState(false);
  const [currentReply, setCurrent]  = useState('');
  const [phase, setPhase]           = useState<Phase>({ kind: 'idle' });
  const [sysMsg, setSysMsg]         = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx]   = useState(0);
  const [paletteFilter, setFilter]    = useState('');

  // ASR
  const [recording, setRecording]     = useState(false);
  const [asrLoading, setAsrLoading]   = useState(false);
  const recordingRef  = useRef(false);
  const asrLoadingRef = useRef(false);

  const [modelsOpen, setModelsOpen]         = useState(false);
  const [modelSection, setModelSection]     = useState<ModelSection>('llm');
  const [localModels, setLocalModels]       = useState<LocalModel[]>([]);
  const [runningModels, setRunningModels]   = useState<RunningModel[]>([]);
  const [modelsLoading, setModelsLoading]   = useState(false);
  const [modelsStatus, setModelsStatus]     = useState('');
  const [modelsSelIdx, setModelsSelIdx]     = useState(0);
  const [showDownload, setShowDownload]     = useState(false);
  const [downloadInput, setDownloadInput]   = useState('');
  const [pullProgress, setPullProgress]     = useState<PullProgress | null>(null);
  const [pullingName, setPullingName]       = useState('');

  const isMounted     = useRef(true);
  const mountedLLMRef = useRef(mountedLLM);
  mountedLLMRef.current = mountedLLM;

  useEffect(() => () => { isMounted.current = false; }, []);

  const refreshModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const [loc, run] = await Promise.all([api.listModels(), api.runningModels()]);
      if (!isMounted.current) return;
      setLocalModels(loc.models ?? []);
      setRunningModels(run.models ?? []);
      const running = run.models ?? [];
      const current = mountedLLMRef.current;
      if (current && !running.some(r => r.name === current)) setMountedLLM(null);
      setModelsStatus('');
    } catch (e) { setModelsStatus(`Error: ${(e as Error).message}`); }
    setModelsLoading(false);
  }, [setMountedLLM]);

  // Refresh when models overlay opens
  useEffect(() => {
    if (modelsOpen) void refreshModels();
  }, [modelsOpen, refreshModels]);

  const pullModel = useCallback(async (name: string) => {
    setPullingName(name);
    setPullProgress({ status: 'Starting…', digest: '', total: 0, completed: 0, percent: 0 });
    setModelsStatus('');
    try {
      for await (const prog of api.pullModelStream(name)) {
        if (!isMounted.current) return;
        if (prog.status === 'done') break;
        setPullProgress(prog);
      }
      setModelsStatus(`Downloaded: ${name}`);
      void refreshModels();
    } catch (e) {
      setModelsStatus(`Pull error: ${(e as Error).message}`);
    }
    if (isMounted.current) { setPullProgress(null); setPullingName(''); }
  }, [refreshModels]);

  const activateWhisper = useCallback(async (modelName: string) => {
    setModelsStatus(`Setting Whisper model: ${modelName}…`);
    try {
      await api.setWhisperModel(modelName);
      setActiveWhisperModel(modelName);
      setModelsStatus(`Whisper model set: ${modelName}`);
    } catch (e) { setModelsStatus(`Error: ${(e as Error).message}`); }
  }, [setActiveWhisperModel]);

  const toggleLLM = useCallback(async (name: string) => {
    const isRunning = runningModels.some(r => r.name === name);
    if (isRunning) {
      setModelsStatus(`Unloading ${name}…`);
      try {
        await api.unloadModel(name);
        setMountedLLM(null);
        setModelsStatus(`Unmounted: ${name}`);
        void refreshModels();
      } catch (e) { setModelsStatus(`Error: ${(e as Error).message}`); }
    } else {
      setModelsStatus(`Mounting ${name}…`);
      try {
        await api.loadModel(name);
        setMountedLLM(name);
        setModelsStatus(`Mounted: ${name}`);
        setTimeout(() => { void refreshModels(); }, 600);
      } catch (e) { setModelsStatus(`Error: ${(e as Error).message}`); }
    }
  }, [runningModels, setMountedLLM, refreshModels]);

  const sendMessage = useCallback(async (text: string) => {
    const replyModel = mountedLLM;
    if (!text.trim() || streaming) return;
    if (!replyModel) {
      setSysMsg('No model mounted — type /models to select one');
      return;
    }
    const toolModel = functionGemmaModel ?? replyModel;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setStreaming(true);
    setCurrent('');
    setPhase({ kind: 'waiting' });
    setSysMsg('');
    setScrollOffset(0);

    let reply = '';
    try {
      for await (const event of api.agenticChatStream(replyModel, history, undefined, 0.7, toolModel)) {
        switch (event.type) {
          case 'token':
            reply += event.token;
            setCurrent(reply);
            setPhase({ kind: 'streaming' });
            break;
          case 'tool_call':
            setPhase({ kind: 'tool_call', name: event.name, args: event.arguments });
            break;
          case 'tool_result':
            setPhase({ kind: 'tool_result', tool: event.tool, result: event.result });
            break;
          case 'done':
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            setCurrent('');
            setPhase({ kind: 'idle' });
            setStreaming(false);
            setScrollOffset(0);
            break;
          case 'error':
            setSysMsg(`[Error: ${event.message}]`);
            setMessages(prev => [...prev, { role: 'assistant', content: reply || `[Error: ${event.message}]` }]);
            setCurrent('');
            setPhase({ kind: 'idle' });
            setStreaming(false);
            setScrollOffset(0);
            break;
        }
      }
    } catch (e) {
      const msg = `[Error: ${(e as Error).message}]`;
      setMessages(prev => [...prev, { role: 'assistant', content: reply || msg }]);
      setCurrent('');
      setPhase({ kind: 'idle' });
      setStreaming(false);
      setScrollOffset(0);
    }
  }, [mountedLLM, functionGemmaModel, messages, streaming]);

  const startASR = useCallback(async () => {
    if (asrLoadingRef.current || recordingRef.current) return;
    asrLoadingRef.current = true;
    setAsrLoading(true);
    setSysMsg('Starting microphone…');
    try {
      await api.startRecording();
      recordingRef.current = true;
      setRecording(true);
      setSysMsg('Recording… press [s] to stop');
    } catch (e) { setSysMsg(`ASR error: ${(e as Error).message}`); }
    asrLoadingRef.current = false;
    setAsrLoading(false);
  }, []);

  const stopASR = useCallback(async () => {
    if (asrLoadingRef.current) return;
    asrLoadingRef.current = true;
    setAsrLoading(true);
    setSysMsg('Transcribing…');
    try {
      const result = await api.stopRecording();
      if (result.text) {
        setInput(result.text);
        setSysMsg(`Transcribed [${result.language ?? 'auto'}] — press Enter to send`);
      } else {
        setSysMsg('No speech detected');
      }
    } catch (e) { setSysMsg(`ASR error: ${(e as Error).message}`); }
    asrLoadingRef.current = false;
    setAsrLoading(false);
  }, []);

  const execCommand = useCallback((cmd: string) => {
    setPaletteOpen(false);
    setFilter('');
    setInput('');
    switch (cmd) {
      case '/models':
        setModelsOpen(true);
        setModelSection('llm');
        setModelsSelIdx(0);
        setModelsStatus('');
        break;
      case '/asr':
        void startASR();
        break;
      case '/clear':
        setMessages([]); setCurrent(''); setSysMsg(''); setPhase({ kind: 'idle' }); setScrollOffset(0);
        break;
      case '/model':
        setSysMsg(`Mounted: ${mountedLLM ?? 'none'} | Whisper: ${activeWhisperModel ?? 'base'}`);
        break;
      case '/help':
        setSysMsg(COMMANDS.map(c => `${c.cmd} — ${c.description}`).join('  |  '));
        break;
    }
  }, [startASR, mountedLLM, activeWhisperModel]);

  const filteredCmds = COMMANDS.filter(c =>
    c.cmd.startsWith(paletteFilter) ||
    c.description.toLowerCase().includes(paletteFilter.replace('/', '').toLowerCase())
  );

  const sectionLen = modelSection === 'llm' ? localModels.length : WHISPER_MODELS.length;
  const isPulling  = pullingName !== '';

  useInput((_inp, key) => {
    // Models overlay consumes all keys
    if (modelsOpen) {
      if (showDownload) {
        if (key.escape) { setShowDownload(false); setDownloadInput(''); }
        return;
      }
      if (key.escape)    { setModelsOpen(false); setModelsStatus(''); return; }
      if (_inp === 'l')  { setModelSection('llm'); setModelsSelIdx(0); return; }
      if (_inp === 'a')  { setModelSection('asr'); setModelsSelIdx(0); return; }
      if (_inp === 'r')  { void refreshModels(); return; }
      if (_inp === 'n')  { setShowDownload(true); setDownloadInput(''); return; }
      if (key.upArrow)   { setModelsSelIdx(i => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setModelsSelIdx(i => Math.min(sectionLen - 1, i + 1)); return; }
      if (key.return) {
        if (modelSection === 'llm') {
          const m = localModels[modelsSelIdx];
          if (m) void toggleLLM(m.name);
        } else {
          const w = WHISPER_MODELS[modelsSelIdx];
          if (w) void activateWhisper(w.name);
        }
        return;
      }
      if (_inp === 'd' && modelSection === 'llm') {
        const m = localModels[modelsSelIdx];
        if (m) {
          api.deleteModel(m.name)
            .then(() => { setModelsStatus(`Deleted: ${m.name}`); void refreshModels(); })
            .catch(e => setModelsStatus(`Error: ${(e as Error).message}`));
        }
        return;
      }
      return;
    }

    // ── Chat scroll (works even while streaming) ──────────────────────────────
    if (!paletteOpen) {
      if (key.upArrow) {
        setScrollOffset(o => Math.min(o + 1, Math.max(0, messages.length - CHAT_HEIGHT)));
        return;
      }
      if (key.downArrow) {
        setScrollOffset(o => Math.max(0, o - 1));
        return;
      }
    }

    if (streaming) return;

    if (recordingRef.current && _inp === 's') {
      recordingRef.current = false;
      setRecording(false);
      void stopASR();
      return;
    }

    if (paletteOpen) {
      if (key.escape)    { setPaletteOpen(false); setFilter(''); setInput(''); return; }
      if (key.upArrow)   { setPaletteIdx(i => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setPaletteIdx(i => Math.min(filteredCmds.length - 1, i + 1)); return; }
      if (key.return) {
        const cmd = filteredCmds[paletteIdx];
        if (cmd) execCommand(cmd.cmd);
        return;
      }
      return;
    }

    if (key.escape) { setPaletteOpen(false); setFilter(''); }
  });

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.startsWith('/')) {
      setPaletteOpen(true);
      setFilter(val);
      setPaletteIdx(0);
    } else if (paletteOpen) {
      setPaletteOpen(false);
      setFilter('');
    }
  };

  const handleSubmit = (val: string) => {
    if (paletteOpen) return;
    setInput('');
    if (val.trim()) void sendMessage(val);
  };

  const totalMsgs     = messages.length;
  const maxOffset     = Math.max(0, totalMsgs - CHAT_HEIGHT);
  const clampedOff    = Math.min(scrollOffset, maxOffset);
  const windowEnd     = totalMsgs - clampedOff;
  const windowStart   = Math.max(0, windowEnd - CHAT_HEIGHT);
  const visible       = messages.slice(windowStart, windowEnd);
  const canScrollUp   = windowStart > 0;
  const canScrollDown = clampedOff > 0;
  const noModel  = !mountedLLM;
  const pullPct  = pullProgress?.percent ?? 0;

  const phaseLabel = (): React.ReactElement | null => {
    switch (phase.kind) {
      case 'waiting':
        return <Text color="yellow"><Spinner type="dots" />  Thinking…</Text>;
      case 'tool_call':
        return (
          <Text color="red">
            Running: <Text bold>{phase.name}</Text>
            {'('}<Text color="gray">{JSON.stringify(phase.args)}</Text>{')'}
          </Text>
        );
      case 'tool_result':
        return (
          <Text color="gray" dimColor>
            Result [{phase.tool}]: {JSON.stringify(phase.result).slice(0, 120)}
          </Text>
        );
      default:
        return null;
    }
  };

  if (modelsOpen) {
    return (
      <Box flexDirection="column">
        {/* Header */}
        <Box marginBottom={1}>
          <Text color="red" bold>Models  </Text>
          <Text color={modelSection === 'llm' ? 'red' : 'gray'} bold={modelSection === 'llm'}>[l] LLMs  </Text>
          <Text color={modelSection === 'asr' ? 'red' : 'gray'} bold={modelSection === 'asr'}>[a] ASR  </Text>
          <Text color="gray" dimColor>  [n] download  [r] refresh  [d] delete  Esc close</Text>
        </Box>

        {/* Download input */}
        {showDownload && (
          <Box marginBottom={1}>
            <Text color="red">Download model: </Text>
            <TextInput
              value={downloadInput}
              onChange={setDownloadInput}
              onSubmit={v => {
                setShowDownload(false);
                setDownloadInput('');
                if (v.trim()) void pullModel(v.trim());
              }}
              placeholder="e.g. llama3.2, mistral, phi4…  (Esc to cancel)"
            />
          </Box>
        )}

        {modelsLoading && !showDownload && !isPulling && (
          <Text color="yellow"><Spinner type="dots" /> Refreshing…</Text>
        )}

        {/* LLM list */}
        {modelSection === 'llm' && (
          <Box flexDirection="column">
            {localModels.length === 0 && !modelsLoading && (
              <Text color="gray" dimColor>No LLMs installed. Press [n] to download one.</Text>
            )}
            {localModels.map((m, i) => {
              const isRunning = runningModels.some(r => r.name === m.name);
              const isSel     = i === modelsSelIdx;
              const isMntd    = m.name === mountedLLM;
              return (
                <Box key={m.name}>
                  <Text color={isRunning ? 'yellow' : isSel ? 'red' : 'white'} bold={isSel || isRunning}>
                    {isSel ? '▶ ' : '  '}
                    <Text color={isRunning ? 'yellow' : 'gray'}>{isRunning ? '● ' : '○ '}</Text>
                    {m.name.padEnd(36)}
                    <Text color="gray">{fmtBytes(m.size).padEnd(10)}</Text>
                    <Text color="gray" dimColor>{m.details?.parameter_size ?? ''}</Text>
                    {isMntd && <Text color="yellow" bold>  ← active</Text>}
                  </Text>
                </Box>
              );
            })}
            <Box marginTop={1}>
              <Text color="gray" dimColor>Enter = mount/unmount  ● loaded  ○ unloaded</Text>
            </Box>
          </Box>
        )}

        {/* ASR list */}
        {modelSection === 'asr' && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="gray" dimColor>
                Whisper runs on-device. Select a size to activate (weights download on first use).
              </Text>
            </Box>
            {WHISPER_MODELS.map((w, i) => {
              const isActive = w.name === activeWhisperModel;
              const isSel    = i === modelsSelIdx;
              return (
                <Box key={w.name}>
                  <Text color={isActive ? 'yellow' : isSel ? 'red' : 'white'} bold={isSel || isActive}>
                    {isSel ? '▶ ' : '  '}
                    <Text color={isActive ? 'yellow' : 'gray'}>{isActive ? '● ' : '○ '}</Text>
                    {w.label.padEnd(24)}
                    <Text color="gray">{w.size.padEnd(12)}</Text>
                    {isActive && <Text color="yellow" bold>← active</Text>}
                  </Text>
                </Box>
              );
            })}
            <Box marginTop={1}>
              <Text color="gray" dimColor>Enter = activate model</Text>
            </Box>
          </Box>
        )}

        {/* Download progress */}
        {isPulling && (
          <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
            <Box>
              <Text color="red" bold><Spinner type="dots" />{'  '}</Text>
              <Text color="white" bold>Downloading </Text>
              <Text color="cyan" bold>{pullingName}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="yellow">[{buildBar(pullPct, 40)}] {pullPct.toFixed(1)}%</Text>
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

        {/* Status */}
        {modelsStatus && !isPulling && (
          <Box marginTop={1}>
            <Text color={modelsStatus.startsWith('Error') || modelsStatus.startsWith('Pull error') ? 'red' : 'yellow'}>
              {modelsStatus}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">

      {/* Model status bar */}
      <Box marginBottom={1}>
        {noModel ? (
          <Text color="red">No model mounted — type /models to select one</Text>
        ) : (
          <Box>
            <Text color="yellow" bold>● </Text>
            <Text color="yellow" bold>{mountedLLM}</Text>
            {activeWhisperModel && (
              <Text color="gray" dimColor>  · Whisper: {activeWhisperModel}</Text>
            )}
            <Text color="gray" dimColor>  · type / for commands</Text>
          </Box>
        )}
      </Box>

      {/* Scroll indicator */}
      {(canScrollUp || canScrollDown) && (
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            {canScrollUp ? `↑ ${windowStart} above  ` : ''}
            {canScrollDown ? '↓ newer below  ' : ''}
            ↑↓ scroll
          </Text>
        </Box>
      )}

      {/* Message history */}
      <Box flexDirection="column" marginBottom={1}>
        {visible.map((m, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text color={m.role === 'user' ? 'red' : 'yellow'} bold>
              {m.role === 'user' ? 'You' : 'Otomato '}
            </Text>
            <Box paddingLeft={2}>
              {m.role === 'assistant'
                ? <MarkdownText>{m.content}</MarkdownText>
                : <Text wrap="wrap">{m.content}</Text>}
            </Box>
          </Box>
        ))}

        {streaming && phase.kind !== 'streaming' && phase.kind !== 'idle' && (
          <Box paddingLeft={2} marginTop={0}>
            {phaseLabel()}
          </Box>
        )}

        {streaming && phase.kind === 'streaming' && currentReply && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow" bold>Otomato <Spinner type="dots" /></Text>
            <Box paddingLeft={2}><MarkdownText>{currentReply}</MarkdownText></Box>
          </Box>
        )}
      </Box>

      {/* Command palette */}
      {paletteOpen && (
        <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="red" bold>Commands</Text>
          {filteredCmds.length === 0 && <Text color="gray" dimColor>No matching commands</Text>}
          {filteredCmds.map((c, i) => (
            <Box key={c.cmd}>
              <Text color={i === paletteIdx ? 'red' : 'gray'} bold={i === paletteIdx}>
                {i === paletteIdx ? '▶ ' : '  '}
                <Text color={i === paletteIdx ? 'white' : 'gray'} bold>{c.cmd}</Text>
                <Text color="gray" dimColor>  {c.description}</Text>
              </Text>
            </Box>
          ))}
          <Text color="gray" dimColor>↑↓ navigate  Enter select  Esc cancel</Text>
        </Box>
      )}

      {/* ASR / system status */}
      {(sysMsg || recording || asrLoading) && (
        <Box marginBottom={1}>
          {recording ? (
            <Text color="red"><Spinner type="dots" />  RECORDING — press [s] to stop</Text>
          ) : asrLoading ? (
            <Text color="yellow"><Spinner type="dots" />  {sysMsg}</Text>
          ) : (
            <Text color="gray" dimColor>{sysMsg}</Text>
          )}
        </Box>
      )}

      {/* Input */}
      {!streaming && !recording && (
        <Box borderStyle="round" borderColor={noModel ? 'gray' : 'red'} paddingX={1}>
          <Text color={noModel ? 'gray' : 'red'}>{'> '}</Text>
          <TextInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            placeholder={noModel ? 'Type /models to mount a model…' : 'Message or / for commands…'}
          />
        </Box>
      )}
    </Box>
  );
}
