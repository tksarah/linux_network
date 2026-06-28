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
const terminalModes = new Set(["dock", "expanded", "minimized"]);

const terminalPanel = document.querySelector("#terminal-panel");
const terminalOutput = document.querySelector("#terminal-output");
const terminalForm = document.querySelector("#terminal-form");
const terminalInput = document.querySelector("#terminal-input");
const terminalDockButton = document.querySelector("#terminal-dock");
const terminalExpandButton = document.querySelector("#terminal-expand");
const terminalMinimizeButton = document.querySelector("#terminal-minimize");
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

let state = createInitialState(loadScenarioId());
let selectedFile = "/etc/NetworkManager/system-connections/ens160.nmconnection";
let terminalMode = loadTerminalMode();

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
    terminalInput.value = "";
    execute(command);
  });

  terminalInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      terminalForm.requestSubmit();
    }
  });

  terminalDockButton.addEventListener("click", () => {
    setTerminalMode("dock");
  });

  terminalExpandButton.addEventListener("click", () => {
    setTerminalMode("expanded");
  });

  terminalMinimizeButton.addEventListener("click", () => {
    setTerminalMode(terminalMode === "minimized" ? "dock" : "minimized");
  });

  terminalPanel.addEventListener("click", event => {
    if (terminalMode === "minimized" && !event.target.closest("button")) {
      setTerminalMode("dock");
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
    createTopologyLink(links.get("switch-dns"), "link-switch-dns"),
    createTopologyNode(nodes.get("dns"))
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
  item.className = `topology-node topology-node-${node.id} status-${node.status}`;

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
    setTerminalMode("dock", { focus: false });
  }
}

function setTerminalMode(mode, options = {}) {
  terminalMode = terminalModes.has(mode) ? mode : "dock";
  applyTerminalMode(terminalMode, options);
  localStorage.setItem(TERMINAL_MODE_KEY, terminalMode);
}

function applyTerminalMode(mode, options = {}) {
  document.body.dataset.terminalMode = mode;
  terminalPanel.dataset.mode = mode;
  updateTerminalControls(mode);
  scrollTerminal();

  if (options.focus !== false && mode !== "minimized") {
    terminalInput.focus();
  }
}

function updateTerminalControls(mode) {
  terminalDockButton.disabled = mode === "dock";
  terminalExpandButton.disabled = mode === "expanded";

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
  return terminalModes.has(saved) ? saved : "dock";
}
