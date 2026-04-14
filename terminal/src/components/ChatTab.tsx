import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import MarkdownText from './MarkdownText.js';
import ModelsTab from './ModelsTab.js';
import * as api from '../api.js';
import type { AutomateTask, PluginInfo } from '../api.js';
import { useAppState } from '../AppContext.js';
import type { ChatMessage } from '../types.js';





interface Command { cmd: string; description: string }
const COMMANDS: Command[] = [
  { cmd: '/models',   description: 'Browse and mount/unmount LLMs and ASR models'  },
  { cmd: '/asr',      description: 'Record voice and transcribe (on-device Whisper)' },
  { cmd: '/plugins',  description: 'Browse installed plugins and their tools'        },
  { cmd: '/clear',    description: 'Clear conversation history'                      },
  { cmd: '/automate', description: 'Run tasks from an automate.md file sequentially' },
  { cmd: '/help',     description: 'List all commands'                               },
];

const CHAT_HEIGHT = 6; // messages visible at once


type Phase =
  | { kind: 'idle' }
  | { kind: 'waiting' }
  | { kind: 'streaming' }
  | { kind: 'tool_call';   name: string; args: Record<string, unknown> }
  | { kind: 'tool_result'; tool: string; result: unknown };





export default function ChatTab(): React.ReactElement {
  const { mountedLLM, activeWhisperModel } = useAppState();

  const [input, setInput]           = useState('');
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [streaming, setStreaming]   = useState(false);
  const [currentReply, setCurrent]  = useState('');
  const [phase, setPhase]           = useState<Phase>({ kind: 'idle' });
  const [sysMsg, setSysMsg]         = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx]   = useState(0);
  const [paletteFilter, setFilter]    = useState('');

  const [recording, setRecording]     = useState(false);
  const [asrLoading, setAsrLoading]   = useState(false);
  const recordingRef  = useRef(false);
  const asrLoadingRef = useRef(false);

  const [modelsOpen, setModelsOpen]         = useState(false);

  const [automateRunning, setAutomateRunning] = useState(false);
  const [automateTasks, setAutomateTasks]   = useState<AutomateTask[]>([]);
  const [automateIdx, setAutomateIdx]       = useState(0);

  const [pluginsOpen, setPluginsOpen]       = useState(false);
  const [pluginsList, setPluginsList]       = useState<PluginInfo[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [pluginsSelIdx, setPluginsSelIdx]   = useState(0);
  const [pluginsStatus, setPluginsStatus]   = useState('');

  const abortControllerRef  = useRef<AbortController | null>(null);
  const escPressedOnceRef   = useRef(false);
  const escTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [interrupted, setInterrupted] = useState(false);

  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const historyIdxRef  = useRef(-1);
  const savedDraftRef  = useRef('');

  const isMounted     = useRef(true);
  const mountedLLMRef = useRef(mountedLLM);
  mountedLLMRef.current = mountedLLM;

  useEffect(() => () => { isMounted.current = false; }, []);



  const sendMessage = useCallback(async (text: string) => {
    const replyModel = mountedLLM;
    if (!text.trim() || streaming) return;
    if (!replyModel) {
      setSysMsg('No model mounted — type /models to select one');
      return;
    }
    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setStreaming(true);
    setCurrent('');
    setPhase({ kind: 'waiting' });
    setSysMsg('');
    setScrollOffset(0);
    setInterrupted(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let reply = '';
    try {
      for await (const event of api.agenticChatStream(replyModel, history, undefined, 0.7, controller.signal)) {
        if (controller.signal.aborted) break;
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
            break;
          case 'error':
            setSysMsg(`[Error: ${event.message}]`);
            setMessages(prev => [...prev, { role: 'assistant', content: reply || `[Error: ${event.message}]` }]);
            setCurrent('');
            setPhase({ kind: 'idle' });
            setStreaming(false);
            break;
        }
      }
    } catch (e) {
      const isAbort = (e as Error).name === 'AbortError';
      if (!isAbort) {
        const msg = `[Error: ${(e as Error).message}]`;
        setMessages(prev => [...prev, { role: 'assistant', content: reply || msg }]);
      }
      setCurrent('');
      setPhase({ kind: 'idle' });
      setStreaming(false);
    }

    if (controller.signal.aborted) {
      if (reply) setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setCurrent('');
      setPhase({ kind: 'idle' });
      setStreaming(false);
    }
    abortControllerRef.current = null;
  }, [mountedLLM, messages, streaming]);

  const runAutomation = useCallback(async (filePath: string) => {
    const replyModel = mountedLLM;
    if (!replyModel) {
      setSysMsg('No model mounted — type /models to select one');
      return;
    }

    setSysMsg(`Loading automation file: ${filePath}`);
    let parsed: api.AutomateParseResult;
    try {
      parsed = await api.parseAutomateFile(filePath);
    } catch (e) {
      setSysMsg(`Automate error: ${(e as Error).message}`);
      return;
    }

    if (parsed.count === 0) {
      setSysMsg('No tasks found in file.');
      return;
    }

    setAutomateTasks(parsed.tasks);
    setAutomateIdx(0);
    setAutomateRunning(true);
    setSysMsg(`Running automation: ${parsed.count} task${parsed.count > 1 ? 's' : ''} from ${parsed.file}`);
    setInterrupted(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let currentMessages: ChatMessage[] = [...messages];

    for (let i = 0; i < parsed.tasks.length; i++) {
      if (!isMounted.current || controller.signal.aborted) break;
      const task = parsed.tasks[i]!;
      setAutomateIdx(i);

      const userMsg: ChatMessage = { role: 'user', content: task.prompt };
      currentMessages = [...currentMessages, userMsg];
      setMessages(currentMessages);
      setStreaming(true);
      setCurrent('');
      setPhase({ kind: 'waiting' });
      setScrollOffset(0);

      let reply = '';
      try {
        for await (const event of api.agenticChatStream(replyModel, currentMessages, undefined, 0.7, controller.signal)) {
          if (!isMounted.current || controller.signal.aborted) break;
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
              currentMessages = [...currentMessages, { role: 'assistant', content: reply }];
              setMessages(currentMessages);
              setCurrent('');
              setPhase({ kind: 'idle' });
              setStreaming(false);
              setScrollOffset(0);
              reply = '';
              break;
            case 'error':
              setSysMsg(`[Task ${i + 1} error: ${event.message}]`);
              currentMessages = [...currentMessages, { role: 'assistant', content: reply || `[Error: ${event.message}]` }];
              setMessages(currentMessages);
              setCurrent('');
              setPhase({ kind: 'idle' });
              setStreaming(false);
              setScrollOffset(0);
              reply = '';
              break;
          }
        }
      } catch (e) {
        const isAbort = (e as Error).name === 'AbortError';
        if (!isAbort) {
          const msg = `[Task ${i + 1} error: ${(e as Error).message}]`;
          currentMessages = [...currentMessages, { role: 'assistant', content: reply || msg }];
          setMessages(currentMessages);
        }
        setCurrent('');
        setPhase({ kind: 'idle' });
        setStreaming(false);
        setScrollOffset(0);
        break;
      }

      if (controller.signal.aborted) {
        if (reply) {
          currentMessages = [...currentMessages, { role: 'assistant', content: reply }];
          setMessages(currentMessages);
        }
        setCurrent('');
        setPhase({ kind: 'idle' });
        setStreaming(false);
        setScrollOffset(0);
        break;
      }
    }

    abortControllerRef.current = null;

    if (isMounted.current) {
      setAutomateRunning(false);
      setAutomateTasks([]);
      setAutomateIdx(0);
      if (!interrupted) {
        setSysMsg(`Automation complete — ${parsed.count} task${parsed.count > 1 ? 's' : ''} finished`);
      }
    }
  }, [mountedLLM, messages, streaming]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const refreshPlugins = useCallback(async () => {
    setPluginsLoading(true);
    setPluginsStatus('');
    try {
      const res = await api.listPlugins();
      if (!isMounted.current) return;
      setPluginsList(res.plugins ?? []);
    } catch (e) { setPluginsStatus(`Error: ${(e as Error).message}`); }
    setPluginsLoading(false);
  }, []);

  useEffect(() => {
    if (pluginsOpen) void refreshPlugins();
  }, [pluginsOpen, refreshPlugins]);

  const execCommand = useCallback((cmd: string) => {
    setPaletteOpen(false);
    setFilter('');
    setInput('');

    if (cmd.startsWith('/automate')) {
      const parts = cmd.trim().split(/\s+/);
      const filePath = parts[1] ?? 'automate.md';
      void runAutomation(filePath);
      return;
    }

    switch (cmd) {
      case '/models':
        setModelsOpen(true);
        break;
      case '/plugins':
        setPluginsOpen(true);
        setPluginsSelIdx(0);
        setPluginsStatus('');
        break;
      case '/asr':
        void startASR();
        break;
      case '/clear':
        setMessages([]); setCurrent(''); setSysMsg(''); setPhase({ kind: 'idle' }); setScrollOffset(0);
        break;
      case '/help':
        setSysMsg(COMMANDS.map(c => `${c.cmd} — ${c.description}`).join('  |  '));
        break;
    }
  }, [startASR, mountedLLM, runAutomation]);

  const filteredCmds = COMMANDS.filter(c =>
    c.cmd.startsWith(paletteFilter) ||
    c.description.toLowerCase().includes(paletteFilter.replace('/', '').toLowerCase())
  );

  useInput((_inp, key) => {
    if (modelsOpen) return;

    if (pluginsOpen) {
      if (key.escape) { setPluginsOpen(false); setPluginsStatus(''); return; }
      if (_inp === 'r') {
        setPluginsStatus('Reloading…');
        api.reloadPlugins()
          .then(res => {
            if (!isMounted.current) return;
            setPluginsList(res.plugins ?? []);
            setPluginsSelIdx(0);
            setPluginsStatus(`Reloaded — ${res.count} plugin${res.count !== 1 ? 's' : ''} loaded`);
          })
          .catch(e => setPluginsStatus(`Error: ${(e as Error).message}`));
        return;
      }
      if (key.upArrow)   { setPluginsSelIdx(i => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setPluginsSelIdx(i => Math.min(pluginsList.length - 1, i + 1)); return; }
      return;
    }

    // Chat scroll OR input history (↑↓)
    if (!paletteOpen) {
      if (key.upArrow) {
        if (inputHistory.length > 0 && !streaming) {
          // Start browsing or go further back
          if (historyIdxRef.current === -1) {
            savedDraftRef.current = input; // save current draft
            historyIdxRef.current = inputHistory.length - 1;
          } else {
            historyIdxRef.current = Math.max(0, historyIdxRef.current - 1);
          }
          setInput(inputHistory[historyIdxRef.current] ?? '');
        } else {
          setScrollOffset(o => Math.min(o + 1, Math.max(0, messages.length - CHAT_HEIGHT)));
        }
        return;
      }
      if (key.downArrow) {
        if (historyIdxRef.current !== -1) {
          const nextIdx = historyIdxRef.current + 1;
          if (nextIdx >= inputHistory.length) {
            // Reached the bottom — restore draft
            historyIdxRef.current = -1;
            setInput(savedDraftRef.current);
          } else {
            historyIdxRef.current = nextIdx;
            setInput(inputHistory[nextIdx] ?? '');
          }
        } else {
          setScrollOffset(o => Math.max(0, o - 1));
        }
        return;
      }
    }

    // Double-ESC interrupt
    if (streaming && key.escape) {
      if (escPressedOnceRef.current) {
        if (escTimerRef.current) clearTimeout(escTimerRef.current);
        escPressedOnceRef.current = false;
        setInterrupted(true);
        setSysMsg('Interrupted');
        abortControllerRef.current?.abort();
      } else {
        escPressedOnceRef.current = true;
        setSysMsg('Press Esc again to stop generation');
        escTimerRef.current = setTimeout(() => {
          escPressedOnceRef.current = false;
          setSysMsg('');
        }, 1000);
      }
      return;
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
        if (cmd) {
          if (cmd.cmd === '/automate') {
            setPaletteOpen(false);
            setFilter('');
            setInput('/automate ');
            setSysMsg('Type a file path after /automate and press Enter (default: automate.md)');
          } else {
            execCommand(cmd.cmd);
          }
        }
        return;
      }
      if (key.backspace || key.delete) return;
      return;
    }

    if (key.escape) { setPaletteOpen(false); setFilter(''); }
  });

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.startsWith('/automate ')) {
      setPaletteOpen(false);
      setFilter('');
    } else if (val.startsWith('/')) {
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
    const trimmed = val.trim();
    if (!trimmed) return;
    // Push to input history, reset browsing state
    setInputHistory(prev => {
      if (prev[prev.length - 1] === trimmed) return prev; // no duplicate consecutive
      return [...prev, trimmed];
    });
    historyIdxRef.current = -1;
    savedDraftRef.current = '';
    if (trimmed.startsWith('/automate')) {
      execCommand(trimmed);
      return;
    }
    void sendMessage(trimmed);
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

  const phaseLabel = (): React.ReactElement | null => {
    switch (phase.kind) {
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
    return <ModelsTab onClose={() => setModelsOpen(false)} />;
  }

  if (pluginsOpen) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="red" bold>Plugins  </Text>
          <Text color="gray" dimColor>  [r] reload  Esc close</Text>
        </Box>

        {pluginsLoading && (
          <Text color="yellow"><Text color="yellow"><Spinner type="dots" /> Loading…</Text></Text>
        )}

        {!pluginsLoading && pluginsList.length === 0 && (
          <Text color="gray" dimColor>No plugins found. Drop .py files into the plugins/ folder.</Text>
        )}

        {pluginsList.map((p, i) => {
          const isSel = i === pluginsSelIdx;
          return (
            <Box key={p.file} flexDirection="column">
              <Text color={isSel ? 'red' : 'gray'} bold={isSel}>
                {isSel ? '▶ ' : '  '}
                <Text color={isSel ? 'white' : 'gray'} bold={isSel}>{p.name}</Text>
                <Text color="gray" dimColor>  v{p.version}  </Text>
                <Text color="gray" dimColor>{p.description}</Text>
              </Text>
              {isSel && (
                <Box paddingLeft={4} flexDirection="column">
                  <Text color="gray" dimColor>
                    Tools: {p.tools.length === 0 ? 'none' : p.tools.join(', ')}
                  </Text>
                  <Text color="gray" dimColor>File: {p.file}</Text>
                </Box>
              )}
            </Box>
          );
        })}

        {pluginsList.length > 0 && (
          <Box marginTop={1}>
            <Text color="gray" dimColor>↑↓ navigate  [r] reload plugins</Text>
          </Box>
        )}

        {pluginsStatus && (
          <Box marginTop={1}>
            <Text color={pluginsStatus.startsWith('Error') ? 'red' : 'yellow'}>{pluginsStatus}</Text>
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
            {streaming
              ? <Text color="gray" dimColor>  · Esc×2 to interrupt</Text>
              : <Text color="gray" dimColor>  · type / for commands</Text>
            }
          </Box>
        )}
      </Box>

      {/* Scroll indicator */}
      {(canScrollUp || canScrollDown) && (
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            {canScrollUp   ? `↑ ${windowStart} above  ` : ''}
            {canScrollDown ? `↓ ${clampedOff} below  ` : ''}
            ↑↓ scroll
          </Text>
        </Box>
      )}

      {/* Message history */}
      <Box flexDirection="column" marginBottom={1}>
        {visible.map((m, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text color={m.role === 'user' ? 'red' : 'yellow'} bold>
              {m.role === 'user' ? 'You' : 'Ohtomato '}
            </Text>
            <Box paddingLeft={2}>
              {m.role === 'assistant'
                ? <MarkdownText>{m.content}</MarkdownText>
                : <Text wrap="wrap">{m.content}</Text>}
            </Box>
          </Box>
        ))}

        {/* Phase indicator */}
        {streaming && phase.kind !== 'streaming' && phase.kind !== 'idle' && (
          <Box paddingLeft={2}>
            {phaseLabel()}
          </Box>
        )}

        {/* Waiting spinner */}
        {streaming && phase.kind === 'waiting' && (
          <Box paddingLeft={2}>
            <Text color="yellow"><Spinner type="dots" />  Thinking…</Text>
          </Box>
        )}

        {/* Live streaming reply */}
        {streaming && phase.kind === 'streaming' && currentReply && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow" bold>Ohtomato <Spinner type="dots" /></Text>
            <Box paddingLeft={2}><MarkdownText>{currentReply}</MarkdownText></Box>
          </Box>
        )}
      </Box>

      {/* Automate progress bar */}
      {automateRunning && automateTasks.length > 0 && (
        <Box marginBottom={1} borderStyle="round" borderColor="red" paddingX={1} flexDirection="column">
          <Box>
            <Text color="red" bold><Spinner type="dots" />{'  '}</Text>
            <Text color="white" bold>Automate  </Text>
            <Text color="gray" dimColor>
              Task {automateIdx + 1}/{automateTasks.length}:{'  '}
            </Text>
            <Text color="yellow" bold>{automateTasks[automateIdx]?.title ?? ''}</Text>
          </Box>
          <Box>
            <Text color="gray" dimColor>
              {'['}
              {'█'.repeat(automateIdx + 1)}
              {'░'.repeat(Math.max(0, automateTasks.length - automateIdx - 1))}
              {']'}
              {'  '}{Math.round(((automateIdx + 1) / automateTasks.length) * 100)}%
            </Text>
          </Box>
        </Box>
      )}

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

      {/* ASR / system / interrupt status */}
      {(sysMsg || recording || asrLoading) && (
        <Box marginBottom={1}>
          {recording ? (
            <Text color="red"><Spinner type="dots" />  RECORDING — press [s] to stop</Text>
          ) : asrLoading ? (
            <Text color="yellow"><Spinner type="dots" />  {sysMsg}</Text>
          ) : interrupted ? (
            <Text color="red">{sysMsg}</Text>
          ) : sysMsg === 'Press Esc again to stop generation' ? (
            <Text color="yellow">{sysMsg}</Text>
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
