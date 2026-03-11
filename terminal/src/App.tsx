import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Logo from './components/Logo.js';
import ChatTab from './components/ChatTab.js';
import { AppContext } from './AppContext.js';
import * as api from './api.js';

export default function App(): React.ReactElement {
  const [mountedLLM, setMountedLLM]            = useState<string | null>(null);
  const [activeWhisperModel, setActiveWhisper] = useState<string | null>(null);
  const [functionGemmaModel, setFunctionGemma] = useState<string | null>(null);
  const [quitting, setQuitting]                = useState(false);
  const { exit } = useApp();

  useEffect(() => {
    if (!quitting) return;
    const cleanup = async () => {
      try { await api.unloadAllModels(); } catch { /* ignore */ }
      exit();
    };
    void cleanup();
  }, [quitting, exit]);

  useInput((input, key) => {
    if (quitting) return;
    if (input === 'q' && key.ctrl) setQuitting(true);
  });

  if (quitting) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Logo />
        <Text color="red">Unloading models…</Text>
      </Box>
    );
  }

  return (
    <AppContext.Provider value={{
      mountedLLM,
      activeWhisperModel,
      functionGemmaModel,
      setMountedLLM,
      setActiveWhisperModel: setActiveWhisper,
      setFunctionGemmaModel: setFunctionGemma,
    }}>
      <Box flexDirection="column" paddingX={1} paddingTop={2}>
        <Logo />
        <Box marginBottom={1}>
          <Text color="gray">{'─'.repeat(70)}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="red" dimColor>/ commands  </Text>
          <Text color="red" dimColor>↑↓ history  </Text>
          <Text color="red" dimColor>/models  </Text>
          <Text color="red" dimColor>/asr  </Text>
          <Text color="red" dimColor>ctrl+q quit</Text>
        </Box>
        <ChatTab />
      </Box>
    </AppContext.Provider>
  );
}
