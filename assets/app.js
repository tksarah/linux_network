import {
  createInitialState,
  getFileNotes,
  getScenarioDetails,
  getStateSummary,
  getVirtualFiles,
  listScenarios,
  runCommand
} from "./simulator.js";

const terminalOutput = document.querySelector("#terminal-output");
const terminalForm = document.querySelector("#terminal-form");
const terminalInput = document.querySelector("#terminal-input");
const resetButton = document.querySelector("#reset-state");
const helpButton = document.querySelector("#show-help");
const scenarioList = document.querySelector("#scenario-list");
const commandChips = document.querySelector("#command-chips");
const stateSummary = document.querySelector("#state-summary");
const fileList = document.querySelector("#file-list");
const fileExplainer = document.querySelector("#file-explainer");
const goalList = document.querySelector("#goal-list");
const scenarioLabel = document.querySelector("#active-scenario-label");
const topologyAddress = document.querySelector("#topology-address");
const welcomeText = document.querySelector("#welcome-template").innerHTML.trim();

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

initialize();

function initialize() {
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

  resetButton.addEventListener("click", () => {
    state = createInitialState(state.scenarioId);
    clearTerminal();
    appendOutput(welcomeText);
    renderAll();
    terminalInput.focus();
  });

  helpButton.addEventListener("click", () => {
    execute("help");
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
  topologyAddress.textContent = state.runtime.address || "未反映";
  localStorage.setItem("linux-network-lab-scenario", state.scenarioId);
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
      terminalInput.focus();
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
      terminalInput.focus();
    });
    commandChips.appendChild(button);
  }
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
    terminalInput.focus();
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

function loadScenarioId() {
  return localStorage.getItem("linux-network-lab-scenario") || "basic";
}
