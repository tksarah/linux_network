import {
  createInitialState,
  getExerciseGuide,
  getFileNotes,
  getScenarioDetails,
  getStateSummary,
  getTopologyDetails,
  getVirtualFiles,
  listScenarios,
  runCommand
} from "./simulator.js";

const SCENARIO_KEY = "linux-network-lab-scenario";
const TERMINAL_MODE_KEY = "linux-network-lab-terminal-mode";
const TERMINAL_GEOMETRY_KEY = "linux-network-lab-terminal-geometry";
const terminalModes = new Set(["floating", "expanded", "minimized"]);
const TERMINAL_MARGIN_DESKTOP = 18;
const TERMINAL_MARGIN_MOBILE = 10;
const TERMINAL_DEFAULT_WIDTH = 620;
const TERMINAL_DEFAULT_HEIGHT = 380;
const TERMINAL_MIN_WIDTH = 360;
const TERMINAL_MIN_HEIGHT = 260;

const terminalPanel = document.querySelector("#terminal-panel");
const terminalToolbar = terminalPanel.querySelector(".terminal-toolbar");
const terminalOutput = document.querySelector("#terminal-output");
const terminalForm = document.querySelector("#terminal-form");
const terminalInput = document.querySelector("#terminal-input");
const terminalDockButton = document.querySelector("#terminal-dock");
const terminalExpandButton = document.querySelector("#terminal-expand");
const terminalMinimizeButton = document.querySelector("#terminal-minimize");
const terminalResizeHandle = document.querySelector("#terminal-resize-handle");
const resetButton = document.querySelector("#reset-state");
const helpButton = document.querySelector("#show-help");
const scenarioList = document.querySelector("#scenario-list");
const exerciseGuide = document.querySelector("#exercise-guide");
const commandChips = document.querySelector("#command-chips");
const stateSummary = document.querySelector("#state-summary");
const topologyMap = document.querySelector("#topology-map");
const fileList = document.querySelector("#file-list");
const fileExplainer = document.querySelector("#file-explainer");
const goalList = document.querySelector("#goal-list");
const scenarioLabel = document.querySelector("#active-scenario-label");
const welcomeText = document.querySelector("#welcome-template").content.textContent.trim();

const chips = [
  "nmcli device status",
  "nmcli connection show",
  "nmcli connection show --active",
  "nmcli connection show ens160",
  "cat /etc/NetworkManager/system-connections/ens160.nmconnection",
  "cat /etc/resolv.conf",
  "cat /etc/nsswitch.conf",
  "ip addr",
  "ip route",
  "ping 192.168.10.1",
  "dig repo.lab.example",
  "nslookup repo.lab.example",
  "netstat -rn"
];

const baseCompletionCandidates = [
  ...chips,
  "help",
  "clear",
  "reset",
  "hostname",
  "ls /etc",
  "ls /etc/NetworkManager/system-connections",
  "ip link",
  "netstat -tuln",
  "ping repo.lab.example",
  "ping intranet.lab.example",
  "dig +short repo.lab.example",
  "dig dns.lab.example",
  "nslookup intranet.lab.example",
  "repo.lab.example",
  "intranet.lab.example",
  "dns.lab.example",
  "192.168.10.1",
  "192.168.10.50",
  "192.168.10.53",
  "8.8.8.8"
];

let state = createInitialState(loadScenarioId());
let selectedFile = "/etc/NetworkManager/system-connections/ens160.nmconnection";
let terminalMode = loadTerminalMode();
let terminalGeometry = loadTerminalGeometry() || getDefaultTerminalGeometry();
let terminalInteraction = null;
let commandHistory = [];
let historyIndex = 0;
let historyDraft = "";

initialize();

function initialize() {
  applyTerminalMode(terminalMode, { focus: false });
  renderScenarios();
  renderChips();
  appendOutput(welcomeText);
  renderAll();

  terminalForm.addEventListener("submit", event => {
    event.preventDefault();
    const command = terminalInput.value;
    rememberCommand(command);
    terminalInput.value = "";
    execute(command);
  });

  terminalInput.addEventListener("keydown", event => {
    if (event.isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();
      terminalForm.requestSubmit();
    } else if (event.key === "Tab") {
      event.preventDefault();
      completeTerminalInput();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHistory(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHistory(1);
    }
  });

  terminalToolbar.addEventListener("pointerdown", startTerminalDrag);
  terminalResizeHandle.addEventListener("pointerdown", startTerminalResize);
  window.addEventListener("pointermove", moveTerminalPointer);
  window.addEventListener("pointerup", endTerminalPointer);
  window.addEventListener("pointercancel", endTerminalPointer);
  window.addEventListener("resize", keepTerminalInViewport);

  terminalDockButton.addEventListener("click", () => {
    resetTerminalGeometry();
    setTerminalMode("floating");
  });

  terminalExpandButton.addEventListener("click", () => {
    setTerminalMode(terminalMode === "expanded" ? "floating" : "expanded");
  });

  terminalMinimizeButton.addEventListener("click", () => {
    setTerminalMode(terminalMode === "minimized" ? "floating" : "minimized");
  });

  terminalPanel.addEventListener("click", event => {
    if (terminalMode === "minimized" && !event.target.closest("button")) {
      setTerminalMode("floating");
    }
  });

  resetButton.addEventListener("click", () => {
    state = createInitialState(state.scenarioId);
    clearTerminal();
    appendOutput(welcomeText);
    renderAll();
    focusTerminalInput();
  });

  helpButton.addEventListener("click", () => {
    openTerminal();
    execute("help");
    focusTerminalInput();
  });
}

function execute(command) {
  if (!command.trim()) return;
  appendPrompt(command);
  const result = runCommand(state, command);

  if (result === "__CLEAR__") {
    clearTerminal();
  } else if (result === "__RESET__") {
    state = createInitialState(state.scenarioId);
    appendOutput("この演習の状態を初期化しました。\n");
  } else {
    appendOutput(result);
  }

  renderAll();
}

function renderAll() {
  const scenario = getScenarioDetails(state);
  scenarioLabel.textContent = scenario.title;
  localStorage.setItem(SCENARIO_KEY, state.scenarioId);
  renderExerciseGuide();
  renderTopology();
  renderStateSummary();
  renderFiles();
  renderGoals();
  renderScenarios();
}

function renderScenarios() {
  scenarioList.innerHTML = "";
  for (const scenario of listScenarios()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = scenario.id === state.scenarioId ? "scenario-card active" : "scenario-card";
    button.innerHTML = `
      <span class="scenario-level">${scenario.level}</span>
      <strong>${scenario.title}</strong>
      <span>${scenario.description}</span>
    `;
    button.addEventListener("click", () => {
      state = createInitialState(scenario.id);
      clearTerminal();
      appendOutput(`${scenario.title}を開始しました。\n${scenario.description}\n`);
      renderAll();
      focusTerminalInput();
    });
    scenarioList.appendChild(button);
  }
}

function renderChips() {
  commandChips.innerHTML = "";
  for (const command of chips) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = command;
    button.addEventListener("click", () => {
      terminalInput.value = command;
      focusTerminalInput();
    });
    commandChips.appendChild(button);
  }
}

function renderExerciseGuide() {
  const guide = getExerciseGuide(state);
  exerciseGuide.innerHTML = "";

  const summary = document.createElement("p");
  summary.className = "guide-summary";
  summary.textContent = guide.summary;
  exerciseGuide.appendChild(summary);

  const steps = document.createElement("div");
  steps.className = "guide-steps";

  for (const [index, step] of guide.steps.entries()) {
    const item = document.createElement("article");
    item.className = step.done ? "guide-step done" : "guide-step";

    const header = document.createElement("div");
    header.className = "guide-step-header";

    const count = document.createElement("span");
    count.className = "guide-step-count";
    count.textContent = String(index + 1);

    const title = document.createElement("div");
    title.className = "guide-step-title";

    const phase = document.createElement("span");
    phase.className = "guide-phase";
    phase.textContent = step.phase;

    const purpose = document.createElement("strong");
    purpose.textContent = step.purpose;

    title.append(phase, purpose);

    const stateLabel = document.createElement("span");
    stateLabel.className = "guide-state";
    stateLabel.textContent = step.done ? "完了" : "未完了";

    header.append(count, title, stateLabel);

    const commands = document.createElement("div");
    commands.className = "guide-commands";
    for (const command of step.commands) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = command;
      button.addEventListener("click", () => {
        terminalInput.value = command;
        focusTerminalInput();
      });
      commands.appendChild(button);
    }

    const expected = document.createElement("p");
    expected.className = "guide-expected";
    expected.textContent = `見るポイント: ${step.expected}`;

    item.append(header, commands, expected);
    steps.appendChild(item);
  }

  exerciseGuide.appendChild(steps);
}

function renderTopology() {
  const topology = getTopologyDetails(state);
  const nodes = new Map(topology.nodes.map(node => [node.id, node]));
  const links = new Map(topology.links.map(link => [link.id, link]));

  topologyMap.innerHTML = "";

  const summary = document.createElement("p");
  summary.className = `topology-summary status-${topology.overallStatus}`;
  summary.textContent = topology.summary;

  const grid = document.createElement("div");
  grid.className = `topology-grid topology-status-${topology.overallStatus}`;

  grid.append(
    createTopologyNode(nodes.get("linux")),
    createTopologyLink(links.get("linux-switch"), "link-linux-switch"),
    createTopologyNode(nodes.get("switch")),
    createTopologyLink(links.get("switch-gateway"), "link-switch-gateway"),
    createTopologyNode(nodes.get("gateway")),
    createTopologyLink(links.get("gateway-internet"), "link-gateway-internet"),
    createTopologyNode(nodes.get("internet")),
    createTopologyLink(links.get("switch-local-dns"), "link-switch-local-dns"),
    createTopologyNode(nodes.get("localDns")),
    createTopologyLink(links.get("internet-public-dns"), "link-internet-public-dns"),
    createTopologyNode(nodes.get("publicDns"))
  );

  const notes = document.createElement("ul");
  notes.className = "topology-notes";
  for (const note of topology.notes) {
    const item = document.createElement("li");
    item.textContent = note;
    notes.appendChild(item);
  }

  topologyMap.append(summary, grid, notes);
}

function createTopologyNode(node) {
  const item = document.createElement("article");
  item.className = `topology-node topology-node-${toKebabCase(node.id)} status-${node.status}`;

  const image = document.createElement("img");
  image.src = node.icon;
  image.alt = "";
  image.loading = "lazy";

  const body = document.createElement("div");
  body.className = "topology-node-body";

  const label = document.createElement("div");
  label.className = "topology-node-label";

  const title = document.createElement("strong");
  title.textContent = node.title;

  const status = document.createElement("span");
  status.className = "topology-node-status";
  status.textContent = node.statusLabel;

  label.append(title, status);

  const detail = document.createElement("span");
  detail.className = "topology-node-detail";
  detail.textContent = node.detail;

  const metric = document.createElement("code");
  metric.textContent = node.metric;

  const note = document.createElement("p");
  note.textContent = node.note;

  body.append(label, detail, metric, note);
  item.append(image, body);
  return item;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function createTopologyLink(link, className) {
  const item = document.createElement("div");
  item.className = `topology-link ${className} status-${link.status}`;

  const line = document.createElement("span");
  line.className = "topology-line";
  line.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "topology-link-label";
  label.textContent = link.label;

  item.append(line, label);
  return item;
}

function renderStateSummary() {
  stateSummary.innerHTML = "";
  for (const [label, value] of getStateSummary(state)) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    stateSummary.append(dt, dd);
  }
}

function renderFiles() {
  const files = getVirtualFiles(state);
  const notes = getFileNotes();
  fileList.innerHTML = "";

  for (const path of Object.keys(files)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = path === selectedFile ? "file-button active" : "file-button";
    button.textContent = path;
    button.addEventListener("click", () => {
      selectedFile = path;
      renderFiles();
    });
    fileList.appendChild(button);
  }

  fileExplainer.innerHTML = `
    <p>${notes[selectedFile]}</p>
    <button class="inline-command" type="button">cat ${selectedFile}</button>
  `;
  fileExplainer.querySelector("button").addEventListener("click", () => {
    terminalInput.value = `cat ${selectedFile}`;
    focusTerminalInput();
  });
}

function renderGoals() {
  goalList.innerHTML = "";
  const scenario = getScenarioDetails(state);
  for (const goal of scenario.goals) {
    const item = document.createElement("div");
    item.className = goal.done ? "goal done" : "goal";
    item.innerHTML = `<span>${goal.done ? "完了" : "未完了"}</span><p>${goal.text}</p>`;
    goalList.appendChild(item);
  }
}

function appendPrompt(command) {
  const line = document.createElement("pre");
  line.className = "terminal-line prompt-line";
  line.textContent = `[student@alma-lab ~]$ ${command}`;
  terminalOutput.appendChild(line);
  scrollTerminal();
}

function appendOutput(text) {
  if (!text) return;
  const line = document.createElement("pre");
  line.className = "terminal-line";
  line.textContent = text;
  terminalOutput.appendChild(line);
  scrollTerminal();
}

function rememberCommand(command) {
  const trimmed = command.trim();
  if (!trimmed) return;
  if (commandHistory.at(-1) !== trimmed) {
    commandHistory.push(trimmed);
  }
  historyIndex = commandHistory.length;
  historyDraft = "";
}

function moveHistory(direction) {
  if (commandHistory.length === 0) return;

  if (historyIndex === commandHistory.length) {
    historyDraft = terminalInput.value;
  }

  historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex + direction));
  terminalInput.value = historyIndex === commandHistory.length ? historyDraft : commandHistory[historyIndex];
  moveCaretToEnd();
}

function completeTerminalInput() {
  const input = terminalInput.value;
  const candidates = getCompletionCandidates();
  const matches = candidates.filter(candidate => candidate.startsWith(input));

  if (matches.length === 0) {
    appendOutput("補完候補はありません。\n");
    return;
  }

  const common = longestCommonPrefix(matches);
  if (common.length > input.length) {
    terminalInput.value = common;
    moveCaretToEnd();
  }

  if (matches.length > 1) {
    appendOutput(`補完候補:\n${matches.map(candidate => `  ${candidate}`).join("\n")}\n`);
  }
}

function getCompletionCandidates() {
  const files = Object.keys(getVirtualFiles(state));
  const guideCommands = getExerciseGuide(state).steps.flatMap(step => step.commands);
  const fileCommands = files.map(path => `cat ${path}`);
  return [...new Set([...baseCompletionCandidates, ...guideCommands, ...files, ...fileCommands])].sort();
}

function longestCommonPrefix(values) {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix) && prefix) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

function moveCaretToEnd() {
  const end = terminalInput.value.length;
  terminalInput.setSelectionRange(end, end);
}

function startTerminalDrag(event) {
  if (terminalMode !== "floating" || isNonPrimaryPointer(event)) return;
  if (event.target.closest("button, input, .terminal-resize-handle")) return;

  const rect = terminalPanel.getBoundingClientRect();
  startTerminalInteraction(event, "move", rect);
}

function startTerminalResize(event) {
  if (terminalMode !== "floating" || isNonPrimaryPointer(event)) return;

  const rect = terminalPanel.getBoundingClientRect();
  startTerminalInteraction(event, "resize", rect);
}

function startTerminalInteraction(event, type, rect) {
  event.preventDefault();
  event.stopPropagation();

  terminalInteraction = {
    type,
    pointerId: event.pointerId,
    captureTarget: event.currentTarget,
    startX: event.clientX,
    startY: event.clientY,
    startGeometry: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    }
  };

  event.currentTarget.setPointerCapture?.(event.pointerId);
  document.body.classList.add(type === "move" ? "is-moving-terminal" : "is-resizing-terminal");
}

function moveTerminalPointer(event) {
  if (!terminalInteraction || event.pointerId !== terminalInteraction.pointerId) return;

  event.preventDefault();
  const deltaX = event.clientX - terminalInteraction.startX;
  const deltaY = event.clientY - terminalInteraction.startY;
  const start = terminalInteraction.startGeometry;

  const nextGeometry = terminalInteraction.type === "move"
    ? {
        ...start,
        left: start.left + deltaX,
        top: start.top + deltaY
      }
    : {
        ...start,
        width: start.width + deltaX,
        height: start.height + deltaY
      };

  terminalGeometry = clampTerminalGeometry(nextGeometry);
  applyTerminalGeometry();
}

function endTerminalPointer(event) {
  if (!terminalInteraction || event.pointerId !== terminalInteraction.pointerId) return;

  terminalInteraction.captureTarget?.releasePointerCapture?.(event.pointerId);
  terminalInteraction = null;
  document.body.classList.remove("is-moving-terminal", "is-resizing-terminal");
  saveTerminalGeometry();
}

function isNonPrimaryPointer(event) {
  return event.button !== undefined && event.button !== 0;
}

function keepTerminalInViewport() {
  terminalGeometry = clampTerminalGeometry(terminalGeometry);
  if (terminalMode === "floating") {
    applyTerminalGeometry();
  }
  saveTerminalGeometry();
}

function resetTerminalGeometry() {
  terminalGeometry = getDefaultTerminalGeometry();
  applyTerminalGeometry();
  saveTerminalGeometry();
}

function getDefaultTerminalGeometry() {
  const bounds = getTerminalGeometryBounds();
  const width = Math.min(TERMINAL_DEFAULT_WIDTH, bounds.maxWidth);
  const height = Math.min(TERMINAL_DEFAULT_HEIGHT, Math.max(bounds.minHeight, Math.round(window.innerHeight * 0.46)), bounds.maxHeight);

  return clampTerminalGeometry({
    width,
    height,
    left: window.innerWidth - bounds.margin - width,
    top: window.innerHeight - bounds.margin - height
  });
}

function getTerminalGeometryBounds() {
  const margin = window.innerWidth <= 800 ? TERMINAL_MARGIN_MOBILE : TERMINAL_MARGIN_DESKTOP;
  const maxWidth = Math.max(1, window.innerWidth - margin * 2);
  const maxHeight = Math.max(1, window.innerHeight - margin * 2);

  return {
    margin,
    maxWidth,
    maxHeight,
    minWidth: Math.min(TERMINAL_MIN_WIDTH, maxWidth),
    minHeight: Math.min(TERMINAL_MIN_HEIGHT, maxHeight)
  };
}

function clampTerminalGeometry(geometry) {
  const bounds = getTerminalGeometryBounds();
  const width = clamp(toFiniteNumber(geometry.width, TERMINAL_DEFAULT_WIDTH), bounds.minWidth, bounds.maxWidth);
  const height = clamp(toFiniteNumber(geometry.height, TERMINAL_DEFAULT_HEIGHT), bounds.minHeight, bounds.maxHeight);
  const maxLeft = Math.max(bounds.margin, window.innerWidth - bounds.margin - width);
  const maxTop = Math.max(bounds.margin, window.innerHeight - bounds.margin - height);
  const left = clamp(toFiniteNumber(geometry.left, maxLeft), bounds.margin, maxLeft);
  const top = clamp(toFiniteNumber(geometry.top, maxTop), bounds.margin, maxTop);

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height)
  };
}

function applyTerminalGeometry() {
  terminalGeometry = clampTerminalGeometry(terminalGeometry);
  terminalPanel.style.left = `${terminalGeometry.left}px`;
  terminalPanel.style.top = `${terminalGeometry.top}px`;
  terminalPanel.style.right = "auto";
  terminalPanel.style.bottom = "auto";
  terminalPanel.style.width = `${terminalGeometry.width}px`;
  terminalPanel.style.height = `${terminalGeometry.height}px`;
}

function clearTerminalGeometryStyles() {
  terminalPanel.style.left = "";
  terminalPanel.style.top = "";
  terminalPanel.style.right = "";
  terminalPanel.style.bottom = "";
  terminalPanel.style.width = "";
  terminalPanel.style.height = "";
}

function saveTerminalGeometry() {
  localStorage.setItem(TERMINAL_GEOMETRY_KEY, JSON.stringify(terminalGeometry));
}

function loadTerminalGeometry() {
  try {
    const saved = JSON.parse(localStorage.getItem(TERMINAL_GEOMETRY_KEY));
    if (!saved || typeof saved !== "object") return null;
    return clampTerminalGeometry(saved);
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clearTerminal() {
  terminalOutput.innerHTML = "";
}

function scrollTerminal() {
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function focusTerminalInput() {
  openTerminal();
  terminalInput.focus();
}

function openTerminal() {
  if (terminalMode === "minimized") {
    setTerminalMode("floating", { focus: false });
  }
}

function setTerminalMode(mode, options = {}) {
  terminalMode = normalizeTerminalMode(mode);
  applyTerminalMode(terminalMode, options);
  localStorage.setItem(TERMINAL_MODE_KEY, terminalMode);
}

function applyTerminalMode(mode, options = {}) {
  document.body.dataset.terminalMode = mode;
  terminalPanel.dataset.mode = mode;
  if (mode === "floating") {
    applyTerminalGeometry();
  } else {
    clearTerminalGeometryStyles();
  }
  updateTerminalControls(mode);
  scrollTerminal();

  if (options.focus !== false && mode !== "minimized") {
    terminalInput.focus();
  }
}

function updateTerminalControls(mode) {
  terminalDockButton.disabled = false;

  const expandLabel = mode === "expanded" ? "小窓に戻す" : "広げて表示";
  terminalExpandButton.title = expandLabel;
  terminalExpandButton.setAttribute("aria-label", expandLabel);
  terminalExpandButton.querySelector("span").textContent = mode === "expanded" ? "▣" : "□";

  const minimizeLabel = mode === "minimized" ? "ターミナルを開く" : "最小化";
  terminalMinimizeButton.title = minimizeLabel;
  terminalMinimizeButton.setAttribute("aria-label", minimizeLabel);
  terminalMinimizeButton.querySelector("span").textContent = mode === "minimized" ? "+" : "-";
}

function loadScenarioId() {
  return localStorage.getItem(SCENARIO_KEY) || "basic";
}

function loadTerminalMode() {
  const saved = localStorage.getItem(TERMINAL_MODE_KEY);
  return normalizeTerminalMode(saved);
}

function normalizeTerminalMode(mode) {
  if (mode === "dock") return "floating";
  return terminalModes.has(mode) ? mode : "floating";
}
