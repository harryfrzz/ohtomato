#!/usr/bin/env node

// ../automato/terminal/src/index.tsx
import { render } from "ink";

// ../automato/terminal/src/App.tsx
import { useState as useState2, useEffect as useEffect2 } from "react";
import { Box as Box3, Text as Text3, useInput as useInput2, useApp } from "ink";

// ../automato/terminal/src/components/Logo.tsx
import { Box, Text } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
var TOMATO = [
  `  ,---.  `,
  ` ( ,~. ) `,
  `(  \\_/  )`,
  `(       )`,
  ` (     ) `,
  `  '---'  `
];
var OTOMATO = [
  ` \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 `,
  `\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557`,
  `\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551`,
  `\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551`,
  `\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551   \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551   \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D`,
  ` \u255A\u2550\u2550\u2550\u2550\u2550\u255D    \u255A\u2550\u255D    \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D   \u255A\u2550\u255D    \u255A\u2550\u2550\u2550\u2550\u2550\u255D `
];
function Logo() {
  return /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginBottom: 1, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "row", children: [
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginRight: 1, children: TOMATO.map((line, i) => /* @__PURE__ */ jsx(Text, { color: "red", bold: true, children: line }, i)) }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: OTOMATO.map((line, i) => /* @__PURE__ */ jsx(Text, { color: "red", bold: true, children: line }, i)) })
  ] }) });
}

// ../automato/terminal/src/components/ChatTab.tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { Box as Box2, Text as Text2, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";

// ../automato/terminal/src/api.ts
import fetch from "node-fetch";
var BASE = process.env["API_URL"] ?? "http://localhost:8000";
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}
var listModels = () => request("/models");
var runningModels = () => request("/models/running");
var deleteModel = (name) => request(`/models/${encodeURIComponent(name)}`, { method: "DELETE" });
var loadModel = (model) => request("/models/load", { method: "POST", body: JSON.stringify({ model }) });
var unloadModel = (model) => request("/models/unload", { method: "POST", body: JSON.stringify({ model }) });
var unloadAllModels = () => request("/models/unload-all", { method: "POST" });
async function* pullModelStream(model) {
  const res = await fetch(`${BASE}/models/pull?model=${encodeURIComponent(model)}`, { method: "POST" });
  if (!res.body) throw new Error("No response body");
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const text = decoder.decode(chunk);
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
        }
      }
    }
  }
}
async function* agenticChatStream(model, messages, systemPrompt, temperature = 0.7, toolModel = "qwen3:0.6b") {
  const res = await fetch(`${BASE}/chat/agentic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, tool_model: toolModel, messages, system_prompt: systemPrompt, temperature })
  });
  if (!res.body) throw new Error("No response body");
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const text = decoder.decode(chunk);
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
        }
      }
    }
  }
}
var startRecording = () => request("/asr/record/start", { method: "POST" });
var stopRecording = (language) => request(`/asr/record/stop${language ? `?language=${encodeURIComponent(language)}` : ""}`, {
  method: "POST"
});
var setWhisperModel = (modelSize) => request(`/asr/model?model_size=${encodeURIComponent(modelSize)}`, { method: "POST" });

// ../automato/terminal/src/AppContext.ts
import { createContext, useContext } from "react";
var AppContext = createContext({
  mountedLLM: null,
  activeWhisperModel: null,
  functionGemmaModel: null,
  setMountedLLM: () => void 0,
  setActiveWhisperModel: () => void 0,
  setFunctionGemmaModel: () => void 0
});
function useAppState() {
  return useContext(AppContext);
}

// ../automato/terminal/src/types.ts
var WHISPER_MODELS = [
  { name: "tiny", label: "Whisper Tiny", size: "~75 MB", ollamaTag: "whisper:tiny" },
  { name: "base", label: "Whisper Base", size: "~145 MB", ollamaTag: "whisper:base" },
  { name: "small", label: "Whisper Small", size: "~466 MB", ollamaTag: "whisper:small" },
  { name: "medium", label: "Whisper Medium", size: "~1.5 GB", ollamaTag: "whisper:medium" },
  { name: "large", label: "Whisper Large", size: "~2.9 GB", ollamaTag: "whisper:large" },
  { name: "large-v2", label: "Whisper Large v2", size: "~2.9 GB", ollamaTag: "whisper:large-v2" },
  { name: "large-v3", label: "Whisper Large v3", size: "~2.9 GB", ollamaTag: "whisper:large-v3" }
];

// ../automato/terminal/src/components/ChatTab.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function buildBar(pct, width) {
  const filled = Math.round(pct / 100 * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}
function fmtBytes(b) {
  if (!b) return "";
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${b} B`;
}
var COMMANDS = [
  { cmd: "/models", description: "Browse and mount/unmount LLMs and ASR models" },
  { cmd: "/asr", description: "Record voice and transcribe (on-device Whisper)" },
  { cmd: "/clear", description: "Clear conversation history" },
  { cmd: "/model", description: "Show currently mounted model" },
  { cmd: "/help", description: "List all commands" }
];
function ChatTab() {
  const {
    mountedLLM,
    activeWhisperModel,
    functionGemmaModel,
    setMountedLLM,
    setActiveWhisperModel
  } = useAppState();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [currentReply, setCurrent] = useState("");
  const [phase, setPhase] = useState({ kind: "idle" });
  const [sysMsg, setSysMsg] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [paletteFilter, setFilter] = useState("");
  const [recording, setRecording] = useState(false);
  const [asrLoading, setAsrLoading] = useState(false);
  const recordingRef = useRef(false);
  const asrLoadingRef = useRef(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [modelSection, setModelSection] = useState("llm");
  const [localModels, setLocalModels] = useState([]);
  const [runningModels2, setRunningModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsStatus, setModelsStatus] = useState("");
  const [modelsSelIdx, setModelsSelIdx] = useState(0);
  const [showDownload, setShowDownload] = useState(false);
  const [downloadInput, setDownloadInput] = useState("");
  const [pullProgress, setPullProgress] = useState(null);
  const [pullingName, setPullingName] = useState("");
  const isMounted = useRef(true);
  const mountedLLMRef = useRef(mountedLLM);
  mountedLLMRef.current = mountedLLM;
  useEffect(() => () => {
    isMounted.current = false;
  }, []);
  const refreshModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const [loc, run] = await Promise.all([listModels(), runningModels()]);
      if (!isMounted.current) return;
      setLocalModels(loc.models ?? []);
      setRunningModels(run.models ?? []);
      const running = run.models ?? [];
      const current = mountedLLMRef.current;
      if (current && !running.some((r) => r.name === current)) setMountedLLM(null);
      setModelsStatus("");
    } catch (e) {
      setModelsStatus(`Error: ${e.message}`);
    }
    setModelsLoading(false);
  }, [setMountedLLM]);
  useEffect(() => {
    if (modelsOpen) void refreshModels();
  }, [modelsOpen, refreshModels]);
  const pullModel = useCallback(async (name) => {
    setPullingName(name);
    setPullProgress({ status: "Starting\u2026", digest: "", total: 0, completed: 0, percent: 0 });
    setModelsStatus("");
    try {
      for await (const prog of pullModelStream(name)) {
        if (!isMounted.current) return;
        if (prog.status === "done") break;
        setPullProgress(prog);
      }
      setModelsStatus(`Downloaded: ${name}`);
      void refreshModels();
    } catch (e) {
      setModelsStatus(`Pull error: ${e.message}`);
    }
    if (isMounted.current) {
      setPullProgress(null);
      setPullingName("");
    }
  }, [refreshModels]);
  const activateWhisper = useCallback(async (modelName) => {
    setModelsStatus(`Setting Whisper model: ${modelName}\u2026`);
    try {
      await setWhisperModel(modelName);
      setActiveWhisperModel(modelName);
      setModelsStatus(`Whisper model set: ${modelName}`);
    } catch (e) {
      setModelsStatus(`Error: ${e.message}`);
    }
  }, [setActiveWhisperModel]);
  const toggleLLM = useCallback(async (name) => {
    const isRunning = runningModels2.some((r) => r.name === name);
    if (isRunning) {
      setModelsStatus(`Unloading ${name}\u2026`);
      try {
        await unloadModel(name);
        setMountedLLM(null);
        setModelsStatus(`Unmounted: ${name}`);
        void refreshModels();
      } catch (e) {
        setModelsStatus(`Error: ${e.message}`);
      }
    } else {
      setModelsStatus(`Mounting ${name}\u2026`);
      try {
        await loadModel(name);
        setMountedLLM(name);
        setModelsStatus(`Mounted: ${name}`);
        setTimeout(() => {
          void refreshModels();
        }, 600);
      } catch (e) {
        setModelsStatus(`Error: ${e.message}`);
      }
    }
  }, [runningModels2, setMountedLLM, refreshModels]);
  const sendMessage = useCallback(async (text) => {
    const replyModel = mountedLLM;
    if (!text.trim() || streaming) return;
    if (!replyModel) {
      setSysMsg("No model mounted \u2014 type /models to select one");
      return;
    }
    const toolModel = functionGemmaModel ?? replyModel;
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setStreaming(true);
    setCurrent("");
    setPhase({ kind: "waiting" });
    setSysMsg("");
    let reply = "";
    try {
      for await (const event of agenticChatStream(replyModel, history, void 0, 0.7, toolModel)) {
        switch (event.type) {
          case "token":
            reply += event.token;
            setCurrent(reply);
            setPhase({ kind: "streaming" });
            break;
          case "tool_call":
            setPhase({ kind: "tool_call", name: event.name, args: event.arguments });
            break;
          case "tool_result":
            setPhase({ kind: "tool_result", tool: event.tool, result: event.result });
            break;
          case "done":
            setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
            setCurrent("");
            setPhase({ kind: "idle" });
            setStreaming(false);
            break;
          case "error":
            setSysMsg(`[Error: ${event.message}]`);
            setMessages((prev) => [...prev, { role: "assistant", content: reply || `[Error: ${event.message}]` }]);
            setCurrent("");
            setPhase({ kind: "idle" });
            setStreaming(false);
            break;
        }
      }
    } catch (e) {
      const msg = `[Error: ${e.message}]`;
      setMessages((prev) => [...prev, { role: "assistant", content: reply || msg }]);
      setCurrent("");
      setPhase({ kind: "idle" });
      setStreaming(false);
    }
  }, [mountedLLM, functionGemmaModel, messages, streaming]);
  const startASR = useCallback(async () => {
    if (asrLoadingRef.current || recordingRef.current) return;
    asrLoadingRef.current = true;
    setAsrLoading(true);
    setSysMsg("Starting microphone\u2026");
    try {
      await startRecording();
      recordingRef.current = true;
      setRecording(true);
      setSysMsg("Recording\u2026 press [s] to stop");
    } catch (e) {
      setSysMsg(`ASR error: ${e.message}`);
    }
    asrLoadingRef.current = false;
    setAsrLoading(false);
  }, []);
  const stopASR = useCallback(async () => {
    if (asrLoadingRef.current) return;
    asrLoadingRef.current = true;
    setAsrLoading(true);
    setSysMsg("Transcribing\u2026");
    try {
      const result = await stopRecording();
      if (result.text) {
        setInput(result.text);
        setSysMsg(`Transcribed [${result.language ?? "auto"}] \u2014 press Enter to send`);
      } else {
        setSysMsg("No speech detected");
      }
    } catch (e) {
      setSysMsg(`ASR error: ${e.message}`);
    }
    asrLoadingRef.current = false;
    setAsrLoading(false);
  }, []);
  const execCommand = useCallback((cmd) => {
    setPaletteOpen(false);
    setFilter("");
    setInput("");
    switch (cmd) {
      case "/models":
        setModelsOpen(true);
        setModelSection("llm");
        setModelsSelIdx(0);
        setModelsStatus("");
        break;
      case "/asr":
        void startASR();
        break;
      case "/clear":
        setMessages([]);
        setCurrent("");
        setSysMsg("");
        setPhase({ kind: "idle" });
        break;
      case "/model":
        setSysMsg(`Mounted: ${mountedLLM ?? "none"} | Whisper: ${activeWhisperModel ?? "base"}`);
        break;
      case "/help":
        setSysMsg(COMMANDS.map((c) => `${c.cmd} \u2014 ${c.description}`).join("  |  "));
        break;
    }
  }, [startASR, mountedLLM, activeWhisperModel]);
  const filteredCmds = COMMANDS.filter(
    (c) => c.cmd.startsWith(paletteFilter) || c.description.toLowerCase().includes(paletteFilter.replace("/", "").toLowerCase())
  );
  const sectionLen = modelSection === "llm" ? localModels.length : WHISPER_MODELS.length;
  const isPulling = pullingName !== "";
  useInput((_inp, key) => {
    if (modelsOpen) {
      if (showDownload) {
        if (key.escape) {
          setShowDownload(false);
          setDownloadInput("");
        }
        return;
      }
      if (key.escape) {
        setModelsOpen(false);
        setModelsStatus("");
        return;
      }
      if (_inp === "l") {
        setModelSection("llm");
        setModelsSelIdx(0);
        return;
      }
      if (_inp === "a") {
        setModelSection("asr");
        setModelsSelIdx(0);
        return;
      }
      if (_inp === "r") {
        void refreshModels();
        return;
      }
      if (_inp === "n") {
        setShowDownload(true);
        setDownloadInput("");
        return;
      }
      if (key.upArrow) {
        setModelsSelIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setModelsSelIdx((i) => Math.min(sectionLen - 1, i + 1));
        return;
      }
      if (key.return) {
        if (modelSection === "llm") {
          const m = localModels[modelsSelIdx];
          if (m) void toggleLLM(m.name);
        } else {
          const w = WHISPER_MODELS[modelsSelIdx];
          if (w) void activateWhisper(w.name);
        }
        return;
      }
      if (_inp === "d" && modelSection === "llm") {
        const m = localModels[modelsSelIdx];
        if (m) {
          deleteModel(m.name).then(() => {
            setModelsStatus(`Deleted: ${m.name}`);
            void refreshModels();
          }).catch((e) => setModelsStatus(`Error: ${e.message}`));
        }
        return;
      }
      return;
    }
    if (streaming) return;
    if (recordingRef.current && _inp === "s") {
      recordingRef.current = false;
      setRecording(false);
      void stopASR();
      return;
    }
    if (paletteOpen) {
      if (key.escape) {
        setPaletteOpen(false);
        setFilter("");
        setInput("");
        return;
      }
      if (key.upArrow) {
        setPaletteIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setPaletteIdx((i) => Math.min(filteredCmds.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const cmd = filteredCmds[paletteIdx];
        if (cmd) execCommand(cmd.cmd);
        return;
      }
      return;
    }
    if (key.escape) {
      setPaletteOpen(false);
      setFilter("");
    }
  });
  const handleInputChange = (val) => {
    setInput(val);
    if (val.startsWith("/")) {
      setPaletteOpen(true);
      setFilter(val);
      setPaletteIdx(0);
    } else if (paletteOpen) {
      setPaletteOpen(false);
      setFilter("");
    }
  };
  const handleSubmit = (val) => {
    if (paletteOpen) return;
    setInput("");
    if (val.trim()) void sendMessage(val);
  };
  const visible = messages.slice(-6);
  const noModel = !mountedLLM;
  const pullPct = pullProgress?.percent ?? 0;
  const phaseLabel = () => {
    switch (phase.kind) {
      case "waiting":
        return /* @__PURE__ */ jsxs2(Text2, { color: "green", children: [
          /* @__PURE__ */ jsx2(Spinner, { type: "dots" }),
          "  Thinking\u2026"
        ] });
      case "tool_call":
        return /* @__PURE__ */ jsxs2(Text2, { color: "yellow", children: [
          "Running: ",
          /* @__PURE__ */ jsx2(Text2, { bold: true, children: phase.name }),
          "(",
          /* @__PURE__ */ jsx2(Text2, { color: "gray", children: JSON.stringify(phase.args) }),
          ")"
        ] });
      case "tool_result":
        return /* @__PURE__ */ jsxs2(Text2, { color: "gray", dimColor: true, children: [
          "Result [",
          phase.tool,
          "]: ",
          JSON.stringify(phase.result).slice(0, 120)
        ] });
      default:
        return null;
    }
  };
  if (modelsOpen) {
    return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs2(Box2, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx2(Text2, { color: "cyan", bold: true, children: "Models  " }),
        /* @__PURE__ */ jsx2(Text2, { color: modelSection === "llm" ? "cyan" : "gray", bold: modelSection === "llm", children: "[l] LLMs  " }),
        /* @__PURE__ */ jsx2(Text2, { color: modelSection === "asr" ? "cyan" : "gray", bold: modelSection === "asr", children: "[a] ASR  " }),
        /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "  [n] download  [r] refresh  [d] delete  Esc close" })
      ] }),
      showDownload && /* @__PURE__ */ jsxs2(Box2, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx2(Text2, { color: "cyan", children: "Download model: " }),
        /* @__PURE__ */ jsx2(
          TextInput,
          {
            value: downloadInput,
            onChange: setDownloadInput,
            onSubmit: (v) => {
              setShowDownload(false);
              setDownloadInput("");
              if (v.trim()) void pullModel(v.trim());
            },
            placeholder: "e.g. llama3.2, mistral, phi4\u2026  (Esc to cancel)"
          }
        )
      ] }),
      modelsLoading && !showDownload && !isPulling && /* @__PURE__ */ jsxs2(Text2, { color: "yellow", children: [
        /* @__PURE__ */ jsx2(Spinner, { type: "dots" }),
        " Refreshing\u2026"
      ] }),
      modelSection === "llm" && /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", children: [
        localModels.length === 0 && !modelsLoading && /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "No LLMs installed. Press [n] to download one." }),
        localModels.map((m, i) => {
          const isRunning = runningModels2.some((r) => r.name === m.name);
          const isSel = i === modelsSelIdx;
          const isMntd = m.name === mountedLLM;
          return /* @__PURE__ */ jsx2(Box2, { children: /* @__PURE__ */ jsxs2(Text2, { color: isRunning ? "green" : isSel ? "cyan" : "white", bold: isSel || isRunning, children: [
            isSel ? "\u25B6 " : "  ",
            /* @__PURE__ */ jsx2(Text2, { color: isRunning ? "green" : "gray", children: isRunning ? "\u25CF " : "\u25CB " }),
            m.name.padEnd(36),
            /* @__PURE__ */ jsx2(Text2, { color: "gray", children: fmtBytes(m.size).padEnd(10) }),
            /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: m.details?.parameter_size ?? "" }),
            isMntd && /* @__PURE__ */ jsx2(Text2, { color: "green", bold: true, children: "  \u2190 active" })
          ] }) }, m.name);
        }),
        /* @__PURE__ */ jsx2(Box2, { marginTop: 1, children: /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "Enter = mount/unmount  \u25CF loaded  \u25CB unloaded" }) })
      ] }),
      modelSection === "asr" && /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx2(Box2, { marginBottom: 1, children: /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "Whisper runs on-device. Select a size to activate (weights download on first use)." }) }),
        WHISPER_MODELS.map((w, i) => {
          const isActive = w.name === activeWhisperModel;
          const isSel = i === modelsSelIdx;
          return /* @__PURE__ */ jsx2(Box2, { children: /* @__PURE__ */ jsxs2(Text2, { color: isActive ? "green" : isSel ? "cyan" : "white", bold: isSel || isActive, children: [
            isSel ? "\u25B6 " : "  ",
            /* @__PURE__ */ jsx2(Text2, { color: isActive ? "green" : "gray", children: isActive ? "\u25CF " : "\u25CB " }),
            w.label.padEnd(24),
            /* @__PURE__ */ jsx2(Text2, { color: "gray", children: w.size.padEnd(12) }),
            isActive && /* @__PURE__ */ jsx2(Text2, { color: "green", bold: true, children: "\u2190 active" })
          ] }) }, w.name);
        }),
        /* @__PURE__ */ jsx2(Box2, { marginTop: 1, children: /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "Enter = activate model" }) })
      ] }),
      isPulling && /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginTop: 1, borderStyle: "round", borderColor: "cyan", paddingX: 1, children: [
        /* @__PURE__ */ jsxs2(Box2, { children: [
          /* @__PURE__ */ jsxs2(Text2, { color: "cyan", bold: true, children: [
            /* @__PURE__ */ jsx2(Spinner, { type: "dots" }),
            "  "
          ] }),
          /* @__PURE__ */ jsx2(Text2, { color: "white", bold: true, children: "Downloading " }),
          /* @__PURE__ */ jsx2(Text2, { color: "cyan", bold: true, children: pullingName })
        ] }),
        /* @__PURE__ */ jsx2(Box2, { marginTop: 1, children: /* @__PURE__ */ jsxs2(Text2, { color: "yellow", children: [
          "[",
          buildBar(pullPct, 40),
          "] ",
          pullPct.toFixed(1),
          "%"
        ] }) }),
        (pullProgress?.total ?? 0) > 0 && /* @__PURE__ */ jsxs2(Text2, { color: "gray", children: [
          fmtBytes(pullProgress.completed),
          " / ",
          fmtBytes(pullProgress.total),
          "  ",
          pullProgress?.status
        ] }),
        (pullProgress?.total ?? 0) === 0 && pullProgress?.status && /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: pullProgress.status })
      ] }),
      modelsStatus && !isPulling && /* @__PURE__ */ jsx2(Box2, { marginTop: 1, children: /* @__PURE__ */ jsx2(Text2, { color: modelsStatus.startsWith("Error") || modelsStatus.startsWith("Pull error") ? "red" : "green", children: modelsStatus }) })
    ] });
  }
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx2(Box2, { marginBottom: 1, children: noModel ? /* @__PURE__ */ jsx2(Text2, { color: "red", children: "No model mounted \u2014 type /models to select one" }) : /* @__PURE__ */ jsxs2(Box2, { children: [
      /* @__PURE__ */ jsx2(Text2, { color: "green", bold: true, children: "\u25CF " }),
      /* @__PURE__ */ jsx2(Text2, { color: "green", bold: true, children: mountedLLM }),
      activeWhisperModel && /* @__PURE__ */ jsxs2(Text2, { color: "gray", dimColor: true, children: [
        "  \xB7 Whisper: ",
        activeWhisperModel
      ] }),
      /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "  \xB7 type / for commands" })
    ] }) }),
    /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginBottom: 1, children: [
      visible.map((m, i) => /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginBottom: 0, children: [
        /* @__PURE__ */ jsx2(Text2, { color: m.role === "user" ? "cyan" : "green", bold: true, children: m.role === "user" ? "You" : "AI " }),
        /* @__PURE__ */ jsx2(Box2, { paddingLeft: 2, children: /* @__PURE__ */ jsx2(Text2, { wrap: "wrap", children: m.content }) })
      ] }, i)),
      streaming && phase.kind !== "streaming" && phase.kind !== "idle" && /* @__PURE__ */ jsx2(Box2, { paddingLeft: 2, marginTop: 0, children: phaseLabel() }),
      streaming && phase.kind === "streaming" && currentReply && /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginBottom: 0, children: [
        /* @__PURE__ */ jsxs2(Text2, { color: "green", bold: true, children: [
          "AI ",
          /* @__PURE__ */ jsx2(Spinner, { type: "dots" })
        ] }),
        /* @__PURE__ */ jsx2(Box2, { paddingLeft: 2, children: /* @__PURE__ */ jsx2(Text2, { wrap: "wrap", children: currentReply }) })
      ] })
    ] }),
    paletteOpen && /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginBottom: 1, borderStyle: "round", borderColor: "cyan", paddingX: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { color: "cyan", bold: true, children: "Commands" }),
      filteredCmds.length === 0 && /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "No matching commands" }),
      filteredCmds.map((c, i) => /* @__PURE__ */ jsx2(Box2, { children: /* @__PURE__ */ jsxs2(Text2, { color: i === paletteIdx ? "cyan" : "gray", bold: i === paletteIdx, children: [
        i === paletteIdx ? "\u25B6 " : "  ",
        /* @__PURE__ */ jsx2(Text2, { color: i === paletteIdx ? "white" : "gray", bold: true, children: c.cmd }),
        /* @__PURE__ */ jsxs2(Text2, { color: "gray", dimColor: true, children: [
          "  ",
          c.description
        ] })
      ] }) }, c.cmd)),
      /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: "\u2191\u2193 navigate  Enter select  Esc cancel" })
    ] }),
    (sysMsg || recording || asrLoading) && /* @__PURE__ */ jsx2(Box2, { marginBottom: 1, children: recording ? /* @__PURE__ */ jsxs2(Text2, { color: "red", children: [
      /* @__PURE__ */ jsx2(Spinner, { type: "dots" }),
      "  RECORDING \u2014 press [s] to stop"
    ] }) : asrLoading ? /* @__PURE__ */ jsxs2(Text2, { color: "yellow", children: [
      /* @__PURE__ */ jsx2(Spinner, { type: "dots" }),
      "  ",
      sysMsg
    ] }) : /* @__PURE__ */ jsx2(Text2, { color: "gray", dimColor: true, children: sysMsg }) }),
    !streaming && !recording && /* @__PURE__ */ jsxs2(Box2, { borderStyle: "round", borderColor: noModel ? "gray" : "cyan", paddingX: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { color: noModel ? "gray" : "cyan", children: "> " }),
      /* @__PURE__ */ jsx2(
        TextInput,
        {
          value: input,
          onChange: handleInputChange,
          onSubmit: handleSubmit,
          placeholder: noModel ? "Type /models to mount a model\u2026" : "Message or / for commands\u2026"
        }
      )
    ] })
  ] });
}

// ../automato/terminal/src/App.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function App() {
  const [mountedLLM, setMountedLLM] = useState2(null);
  const [activeWhisperModel, setActiveWhisper] = useState2(null);
  const [functionGemmaModel, setFunctionGemma] = useState2(null);
  const [quitting, setQuitting] = useState2(false);
  const { exit } = useApp();
  useEffect2(() => {
    if (!quitting) return;
    const cleanup = async () => {
      try {
        await unloadAllModels();
      } catch {
      }
      exit();
    };
    void cleanup();
  }, [quitting, exit]);
  useInput2((input, key) => {
    if (quitting) return;
    if (input === "q" && key.ctrl) setQuitting(true);
  });
  if (quitting) {
    return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", paddingX: 1, children: [
      /* @__PURE__ */ jsx3(Logo, {}),
      /* @__PURE__ */ jsx3(Text3, { color: "yellow", children: "Unloading models\u2026" })
    ] });
  }
  return /* @__PURE__ */ jsx3(AppContext.Provider, { value: {
    mountedLLM,
    activeWhisperModel,
    functionGemmaModel,
    setMountedLLM,
    setActiveWhisperModel: setActiveWhisper,
    setFunctionGemmaModel: setFunctionGemma
  }, children: /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", paddingX: 1, paddingTop: 2, children: [
    /* @__PURE__ */ jsx3(Logo, {}),
    /* @__PURE__ */ jsx3(Box3, { marginBottom: 1, children: /* @__PURE__ */ jsx3(Text3, { color: "gray", children: "\u2500".repeat(70) }) }),
    /* @__PURE__ */ jsxs3(Box3, { marginBottom: 1, children: [
      /* @__PURE__ */ jsx3(Text3, { color: "gray", dimColor: true, children: "/ commands  " }),
      /* @__PURE__ */ jsx3(Text3, { color: "gray", dimColor: true, children: "\u2191\u2193 history  " }),
      /* @__PURE__ */ jsx3(Text3, { color: "gray", dimColor: true, children: "/models mount  " }),
      /* @__PURE__ */ jsx3(Text3, { color: "gray", dimColor: true, children: "/asr voice  " }),
      /* @__PURE__ */ jsx3(Text3, { color: "gray", dimColor: true, children: "ctrl+q quit" })
    ] }),
    /* @__PURE__ */ jsx3(ChatTab, {})
  ] }) });
}

// ../automato/terminal/src/index.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
render(/* @__PURE__ */ jsx4(App, {}));
