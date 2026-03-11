#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.js
var import_react7 = __toESM(require("react"), 1);
var import_ink7 = require("ink");

// src/App.js
var import_react6 = __toESM(require("react"), 1);
var import_ink6 = require("ink");

// src/components/Logo.js
var import_react = __toESM(require("react"), 1);
var import_ink = require("ink");
var import_jsx_runtime = require("react/jsx-runtime");
var ASCII_LOGO = `
 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557
\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u2588\u2588\u2551  \u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551   \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551   \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D
\u255A\u2550\u255D  \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D    \u255A\u2550\u255D    \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D   \u255A\u2550\u255D    \u255A\u2550\u2550\u2550\u2550\u2550\u255D 
`.trim();
function Logo() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_ink.Box, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ink.Text, { color: "cyan", bold: true, children: ASCII_LOGO }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ink.Text, { color: "gray", dimColor: true, children: "  LLM Automation Tool  \u2022  Ollama + Whisper + FunctionGemma" })
  ] });
}

// src/components/ModelsTab.js
var import_react2 = __toESM(require("react"), 1);
var import_ink2 = require("ink");
var import_ink_text_input = __toESM(require("ink-text-input"), 1);
var import_ink_select_input = __toESM(require("ink-select-input"), 1);
var import_ink_spinner = __toESM(require("ink-spinner"), 1);

// src/api.js
var import_node_fetch = __toESM(require("node-fetch"), 1);
var BASE = process.env.API_URL || "http://localhost:8000";
async function request(path, options = {}) {
  const res = await (0, import_node_fetch.default)(`${BASE}${path}`, {
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
var searchModels = (q = "") => request(`/models/search?q=${encodeURIComponent(q)}`);
var deleteModel = (name) => request(`/models/${encodeURIComponent(name)}`, { method: "DELETE" });
var loadModel = (model) => request("/models/load", { method: "POST", body: JSON.stringify({ model }) });
var unloadModel = (model) => request("/models/unload", { method: "POST", body: JSON.stringify({ model }) });
async function* pullModelStream(model) {
  const res = await (0, import_node_fetch.default)(`${BASE}/models/pull?model=${encodeURIComponent(model)}`);
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
async function* chatStream(model, messages, systemPrompt, temperature = 0.7) {
  const res = await (0, import_node_fetch.default)(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, system_prompt: systemPrompt, temperature, stream: true })
  });
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const text = decoder.decode(chunk);
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ") && !line.includes("[DONE]")) {
        try {
          yield JSON.parse(line.slice(6)).token;
        } catch {
        }
      }
    }
  }
}
var listTools = () => request("/tools");
var toolCall = (message, model, tools) => request("/tools/call", { method: "POST", body: JSON.stringify({ message, model, tools, stream: false }) });
var startRecording = () => request("/asr/record/start", { method: "POST" });
var stopRecording = () => request("/asr/record/stop", { method: "POST" });

// src/components/ModelsTab.js
var import_jsx_runtime2 = require("react/jsx-runtime");
var VIEWS = { LIST: "list", SEARCH: "search", PULLING: "pulling" };
function ModelsTab() {
  const [view, setView] = (0, import_react2.useState)(VIEWS.LIST);
  const [localModels, setLocalModels] = (0, import_react2.useState)([]);
  const [runningModels2, setRunning] = (0, import_react2.useState)([]);
  const [searchResults, setSearch] = (0, import_react2.useState)([]);
  const [searchQuery, setQuery] = (0, import_react2.useState)("");
  const [pullProgress, setPullProg] = (0, import_react2.useState)({});
  const [pullingModel, setPulling] = (0, import_react2.useState)("");
  const [statusMsg, setStatus] = (0, import_react2.useState)("");
  const [loading, setLoading] = (0, import_react2.useState)(false);
  const [selectedIdx, setSelectedIdx] = (0, import_react2.useState)(0);
  const refresh = (0, import_react2.useCallback)(async () => {
    setLoading(true);
    try {
      const [loc, run] = await Promise.all([listModels(), runningModels()]);
      setLocalModels(loc.models || []);
      setRunning(run.models || []);
      setStatus("");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }, []);
  (0, import_react2.useEffect)(() => {
    refresh();
  }, []);
  const doSearch = (0, import_react2.useCallback)(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await searchModels(searchQuery);
      setSearch(res.models || []);
    } catch (e) {
      setStatus(`Search error: ${e.message}`);
    }
    setLoading(false);
  }, [searchQuery]);
  const pullModel = (0, import_react2.useCallback)(async (modelName) => {
    setView(VIEWS.PULLING);
    setPulling(modelName);
    setPullProg({ status: "Starting...", percent: 0 });
    try {
      for await (const prog of pullModelStream(modelName)) {
        if (prog.status === "done") break;
        setPullProg(prog);
      }
      setStatus(`Downloaded: ${modelName}`);
      refresh();
    } catch (e) {
      setStatus(`Pull error: ${e.message}`);
    }
    setView(VIEWS.LIST);
    setPulling("");
  }, [refresh]);
  const loadModel2 = (0, import_react2.useCallback)(async (name) => {
    setStatus(`Loading ${name}...`);
    try {
      await loadModel(name);
      setStatus(`Mounted: ${name}`);
      refresh();
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  }, [refresh]);
  const unloadModel2 = (0, import_react2.useCallback)(async (name) => {
    setStatus(`Unloading ${name}...`);
    try {
      await unloadModel(name);
      setStatus(`Unmounted: ${name}`);
      refresh();
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  }, [refresh]);
  const deleteModel2 = (0, import_react2.useCallback)(async (name) => {
    setStatus(`Deleting ${name}...`);
    try {
      await deleteModel(name);
      setStatus(`Deleted: ${name}`);
      refresh();
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  }, [refresh]);
  (0, import_ink2.useInput)((input, key) => {
    if (view === VIEWS.LIST) {
      if (input === "r") refresh();
      if (input === "s") {
        setView(VIEWS.SEARCH);
        setSearch([]);
        setQuery("");
      }
      if (key.upArrow) setSelectedIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectedIdx((i) => Math.min(localModels.length - 1, i + 1));
      const model = localModels[selectedIdx];
      if (model) {
        const isRunning = runningModels2.some((r) => r.name === model.name);
        if (input === "m") isRunning ? unloadModel2(model.name) : loadModel2(model.name);
        if (input === "d") deleteModel2(model.name);
      }
    }
    if (view === VIEWS.SEARCH && key.escape) {
      setView(VIEWS.LIST);
    }
  });
  if (view === VIEWS.PULLING) {
    const pct = pullProgress.percent ?? 0;
    const bar = buildBar(pct, 40);
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Box, { flexDirection: "column", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Text, { bold: true, color: "cyan", children: [
        "Downloading: ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "white", children: pullingModel })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Box, { marginTop: 1, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Text, { color: "yellow", children: [
        "[",
        bar,
        "] ",
        pct.toFixed(1),
        "%"
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", dimColor: true, children: pullProgress.status }),
      pullProgress.total > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Text, { color: "gray", children: [
        fmt(pullProgress.completed),
        " / ",
        fmt(pullProgress.total)
      ] })
    ] });
  }
  if (view === VIEWS.SEARCH) {
    const searchItems = searchResults.map((m) => ({
      label: `${m.name.padEnd(28)} ${m.size.padEnd(10)} ${m.description}`,
      value: m.name
    }));
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Box, { flexDirection: "column", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { bold: true, color: "cyan", children: "Search Ollama Hub" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Box, { marginTop: 1, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", children: "Query: " }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_ink_text_input.default,
          {
            value: searchQuery,
            onChange: setQuery,
            onSubmit: doSearch,
            placeholder: "e.g. llama, gemma, mistral..."
          }
        )
      ] }),
      loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Box, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Text, { color: "yellow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink_spinner.default, { type: "dots" }),
        " Searching..."
      ] }) }),
      searchItems.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", dimColor: true, children: "\u2191\u2193 navigate  Enter to pull  Esc to go back" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_ink_select_input.default,
          {
            items: searchItems,
            onSelect: (item) => pullModel(item.value)
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", dimColor: true, children: "Press Esc to go back" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Box, { flexDirection: "column", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Box, { marginBottom: 1, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { bold: true, color: "cyan", children: "Local Models" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", dimColor: true, children: "  [r]efresh  [s]earch hub  [m]ount/unmount  [d]elete" })
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Text, { color: "yellow", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink_spinner.default, { type: "dots" }),
      " Loading..."
    ] }),
    localModels.length === 0 && !loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", dimColor: true, children: "No local models. Press [s] to search and download." }),
    localModels.map((m, i) => {
      const isRunning = runningModels2.some((r) => r.name === m.name);
      const isSelected = i === selectedIdx;
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Box, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_ink2.Text, { color: isSelected ? "cyan" : "white", bold: isSelected, children: [
        isSelected ? "\u25B6 " : "  ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: isRunning ? "green" : "gray", children: isRunning ? "\u25CF " : "\u25CB " }),
        m.name.padEnd(35),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", children: fmtBytes(m.size).padEnd(10) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", dimColor: true, children: m.details?.parameter_size || "" })
      ] }) }, m.name);
    }),
    statusMsg && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Box, { marginTop: 1, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: statusMsg.startsWith("Error") ? "red" : "green", children: statusMsg }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Box, { marginTop: 1, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_ink2.Text, { color: "gray", dimColor: true, children: "\u25CF mounted  \u25CB not loaded" }) })
  ] });
}
function buildBar(pct, width) {
  const filled = Math.round(pct / 100 * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}
function fmt(bytes) {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  return bytes + " B";
}
function fmtBytes(bytes) {
  if (!bytes) return "";
  return fmt(bytes);
}

// src/components/ChatTab.js
var import_react3 = __toESM(require("react"), 1);
var import_ink3 = require("ink");
var import_ink_text_input2 = __toESM(require("ink-text-input"), 1);
var import_ink_spinner2 = __toESM(require("ink-spinner"), 1);
var import_jsx_runtime3 = require("react/jsx-runtime");
function ChatTab() {
  const [model, setModel] = (0, import_react3.useState)("llama3.2");
  const [input, setInput] = (0, import_react3.useState)("");
  const [messages, setMessages] = (0, import_react3.useState)([]);
  const [streaming, setStreaming] = (0, import_react3.useState)(false);
  const [editingModel, setEditing] = (0, import_react3.useState)(false);
  const [modelInput, setModelInput] = (0, import_react3.useState)("");
  const [currentReply, setCurrent] = (0, import_react3.useState)("");
  const sendMessage = (0, import_react3.useCallback)(async (text) => {
    if (!text.trim() || streaming) return;
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setStreaming(true);
    setCurrent("");
    let reply = "";
    try {
      for await (const token of chatStream(model, history)) {
        reply += token;
        setCurrent(reply);
      }
    } catch (e) {
      reply = `[Error: ${e.message}]`;
      setCurrent(reply);
    }
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setCurrent("");
    setStreaming(false);
  }, [model, messages, streaming]);
  (0, import_ink3.useInput)((input_, key) => {
    if (key.escape && editingModel) {
      setEditing(false);
      return;
    }
    if (input_ === "e" && !editingModel && !streaming) {
      setEditing(true);
      setModelInput(model);
    }
    if (input_ === "c" && !editingModel) {
      setMessages([]);
      setCurrent("");
    }
  });
  const visibleMessages = messages.slice(-8);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_ink3.Box, { flexDirection: "column", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_ink3.Box, { marginBottom: 1, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { bold: true, color: "cyan", children: "Chat" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { color: "gray", dimColor: true, children: "  [e]dit model  [c]lear history" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { color: "gray", children: "  Model: " }),
      editingModel ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        import_ink_text_input2.default,
        {
          value: modelInput,
          onChange: setModelInput,
          onSubmit: (v) => {
            setModel(v);
            setEditing(false);
          }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { color: "yellow", children: model })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_ink3.Box, { flexDirection: "column", marginBottom: 1, children: [
      visibleMessages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_ink3.Box, { marginBottom: 0, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_ink3.Text, { color: m.role === "user" ? "cyan" : "green", bold: true, children: [
          m.role === "user" ? "You" : "AI ",
          ":",
          " "
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { wrap: "wrap", children: m.content })
      ] }, i)),
      streaming && currentReply && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_ink3.Box, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { color: "green", bold: true, children: "AI : " }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { wrap: "wrap", children: currentReply }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { color: "gray", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink_spinner2.default, { type: "dots" }) })
      ] })
    ] }),
    !editingModel && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_ink3.Box, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_ink3.Text, { color: "cyan", children: "> " }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        import_ink_text_input2.default,
        {
          value: input,
          onChange: setInput,
          onSubmit: (v) => {
            sendMessage(v);
            setInput("");
          },
          placeholder: "Type a message and press Enter..."
        }
      )
    ] })
  ] });
}

// src/components/ToolsTab.js
var import_react4 = __toESM(require("react"), 1);
var import_ink4 = require("ink");
var import_ink_text_input3 = __toESM(require("ink-text-input"), 1);
var import_ink_spinner3 = __toESM(require("ink-spinner"), 1);
var import_jsx_runtime4 = require("react/jsx-runtime");
var TOOL_MODEL = "functiongemma";
function ToolsTab() {
  const [tools, setTools] = (0, import_react4.useState)([]);
  const [query, setQuery] = (0, import_react4.useState)("");
  const [result, setResult] = (0, import_react4.useState)(null);
  const [loading, setLoading] = (0, import_react4.useState)(false);
  const [status, setStatus] = (0, import_react4.useState)("");
  const [model, setModel] = (0, import_react4.useState)(TOOL_MODEL);
  const [editingModel, setEditing] = (0, import_react4.useState)(false);
  const [modelInput, setModelInput] = (0, import_react4.useState)("");
  (0, import_react4.useEffect)(() => {
    listTools().then((r) => setTools(r.tools || [])).catch((e) => setStatus(`Error loading tools: ${e.message}`));
  }, []);
  const runToolCall = (0, import_react4.useCallback)(async (text) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setStatus("");
    try {
      const res = await toolCall(text, model, null);
      setResult(res);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }, [loading, model]);
  (0, import_ink4.useInput)((input, key) => {
    if (key.escape && editingModel) {
      setEditing(false);
      return;
    }
    if (input === "e" && !editingModel && !loading) {
      setEditing(true);
      setModelInput(model);
    }
    if (input === "r" && !editingModel) {
      setResult(null);
      setStatus("");
    }
  });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Box, { flexDirection: "column", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Box, { marginBottom: 1, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { bold: true, color: "cyan", children: "Tool Calling" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "gray", dimColor: true, children: "  [e]dit model  [r]eset  \u2014 powered by FunctionGemma" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Box, { marginBottom: 1, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "gray", children: "Model: " }),
      editingModel ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        import_ink_text_input3.default,
        {
          value: modelInput,
          onChange: setModelInput,
          onSubmit: (v) => {
            setModel(v);
            setEditing(false);
          }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "yellow", children: model })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Box, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Text, { color: "gray", dimColor: true, children: [
        "Available tools (",
        tools.length,
        "):"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Box, { flexWrap: "wrap", children: tools.map((t) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Box, { marginRight: 2, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "magenta", children: t.name }) }, t.name)) })
    ] }),
    !editingModel && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Box, { marginBottom: 1, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "cyan", children: "> " }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        import_ink_text_input3.default,
        {
          value: query,
          onChange: setQuery,
          onSubmit: (v) => {
            runToolCall(v);
            setQuery("");
          },
          placeholder: "Ask something that needs a tool..."
        }
      )
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Text, { color: "yellow", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink_spinner3.default, { type: "dots" }),
      " Calling FunctionGemma..."
    ] }),
    result && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Box, { flexDirection: "column", marginTop: 1, borderStyle: "round", borderColor: "cyan", padding: 1, children: result.type === "tool_call" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Text, { bold: true, color: "green", children: [
        "Tool called: ",
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "white", children: result.tool_call?.name })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "gray", children: "Arguments:" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: "yellow", children: JSON.stringify(result.tool_call?.arguments, null, 2) })
    ] }) : result.type === "text" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { bold: true, color: "cyan", children: "Response:" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { wrap: "wrap", children: result.content })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_ink4.Text, { color: "red", children: [
      "Error: ",
      result.error
    ] }) }),
    status && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_ink4.Text, { color: status.startsWith("Error") ? "red" : "green", children: status })
  ] });
}

// src/components/ASRTab.js
var import_react5 = __toESM(require("react"), 1);
var import_ink5 = require("ink");
var import_ink_spinner4 = __toESM(require("ink-spinner"), 1);
var import_jsx_runtime5 = require("react/jsx-runtime");
function ASRTab() {
  const [recording, setRecording] = (0, import_react5.useState)(false);
  const [transcripts, setTranscripts] = (0, import_react5.useState)([]);
  const [status, setStatus] = (0, import_react5.useState)("");
  const [loading, setLoading] = (0, import_react5.useState)(false);
  const startRec = (0, import_react5.useCallback)(async () => {
    if (recording || loading) return;
    setLoading(true);
    try {
      await startRecording();
      setRecording(true);
      setStatus("Recording... Press [s] to stop");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }, [recording, loading]);
  const stopRec = (0, import_react5.useCallback)(async () => {
    if (!recording || loading) return;
    setLoading(true);
    setStatus("Transcribing with Whisper (on-device)...");
    try {
      const result = await stopRecording();
      setRecording(false);
      if (result.text) {
        setTranscripts((prev) => [
          { text: result.text, language: result.language, ts: (/* @__PURE__ */ new Date()).toLocaleTimeString() },
          ...prev.slice(0, 9)
        ]);
        setStatus(`Done  (${result.language || "auto"})`);
      } else {
        setStatus("No speech detected");
      }
    } catch (e) {
      setRecording(false);
      setStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }, [recording, loading]);
  (0, import_ink5.useInput)((input) => {
    if (input === "r") startRec();
    if (input === "s") stopRec();
    if (input === "c") {
      setTranscripts([]);
      setStatus("");
    }
  });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Box, { flexDirection: "column", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Box, { marginBottom: 1, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { bold: true, color: "cyan", children: "Voice ASR" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "gray", dimColor: true, children: "  [r]ecord  [s]top  [c]lear  \u2014 on-device Whisper" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Box, { marginBottom: 1, children: recording ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Box, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "red", bold: true, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink_spinner4.default, { type: "dots" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "red", bold: true, children: "  RECORDING" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "gray", dimColor: true, children: "  press [s] to stop and transcribe" })
    ] }) : loading ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Text, { color: "yellow", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink_spinner4.default, { type: "dots" }),
      " ",
      status
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "gray", children: status || "Press [r] to start recording" }) }),
    transcripts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Box, { flexDirection: "column", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "gray", dimColor: true, children: "Transcripts:" }),
      transcripts.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Box, { flexDirection: "column", marginBottom: 1, paddingLeft: 2, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Text, { color: "gray", dimColor: true, children: [
          t.ts,
          "  [",
          t.language || "auto",
          "]"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { wrap: "wrap", children: t.text })
      ] }, i))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Box, { marginTop: 1, borderStyle: "single", borderColor: "gray", padding: 1, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_ink5.Box, { flexDirection: "column", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "gray", dimColor: true, children: "Whisper runs fully on-device (no API key needed)" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "gray", dimColor: true, children: "Default model: base  \u2022  Change via /asr/model endpoint" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_ink5.Text, { color: "gray", dimColor: true, children: "Supported: wav \xB7 mp3 \xB7 mp4 \xB7 m4a \xB7 webm \xB7 ogg \xB7 flac" })
    ] }) })
  ] });
}

// src/App.js
var import_jsx_runtime6 = require("react/jsx-runtime");
var TABS = [
  { key: "1", label: "Models", component: ModelsTab },
  { key: "2", label: "Chat", component: ChatTab },
  { key: "3", label: "Tools", component: ToolsTab },
  { key: "4", label: "ASR", component: ASRTab }
];
function App() {
  const [activeTab, setActiveTab] = (0, import_react6.useState)(0);
  const { exit } = (0, import_ink6.useApp)();
  (0, import_ink6.useInput)((input, key) => {
    if (input === "q" && key.ctrl) exit();
    const idx = TABS.findIndex((t) => t.key === input);
    if (idx !== -1) setActiveTab(idx);
  });
  const ActiveComponent = TABS[activeTab].component;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_ink6.Box, { flexDirection: "column", padding: 1, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Logo, {}),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_ink6.Box, { marginBottom: 1, children: [
      TABS.map((tab, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_ink6.Box, { marginRight: 2, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        import_ink6.Text,
        {
          bold: i === activeTab,
          color: i === activeTab ? "cyan" : "gray",
          children: [
            "[",
            tab.key,
            "] ",
            tab.label
          ]
        }
      ) }, tab.key)),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_ink6.Box, { marginLeft: 2, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_ink6.Text, { color: "gray", dimColor: true, children: "  ctrl+q to quit" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_ink6.Box, { marginBottom: 1, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_ink6.Text, { color: "gray", children: "\u2500".repeat(60) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ActiveComponent, {})
  ] });
}

// src/index.js
(0, import_ink7.render)(import_react7.default.createElement(App));
