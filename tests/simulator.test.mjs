import assert from "node:assert/strict";
import {
  createInitialState,
  getExerciseGuide,
  getScenarioDetails,
  getTopologyDetails,
  getVirtualFiles,
  listScenarios,
  setCablePlugged,
  runCommand
} from "../assets/simulator.js";

function run(state, command) {
  return runCommand(state, command);
}

{
  const state = createInitialState("basic");
  assert.match(run(state, "nmcli device status"), /ens160\s+ethernet\s+connected/);
  assert.match(run(state, "ip route"), /default via 192\.168\.10\.1/);
  assert.match(run(state, "dig repo.lab.example"), /198\.51\.100\.20/);
  assert.match(run(state, "cat /etc/resolv.conf"), /nameserver 192\.168\.10\.53/);
}

{
  const state = createInitialState("ip-config");
  assert.match(run(state, "nmcli device status"), /ens160\s+ethernet\s+disconnected/);
  assert.equal(run(state, "ip route"), "");
  assert.match(run(state, "nmcli connection up ens160"), /ipv4\.addresses is required/);
  assert.match(
    run(state, "nmcli connection modify ens160 ipv4.addresses 192.168.10.50/24 ipv4.gateway 192.168.10.1 ipv4.dns 192.168.10.53 ipv4.method manual"),
    /successfully modified/
  );
  assert.match(getVirtualFiles(state)["/etc/NetworkManager/system-connections/ens160.nmconnection"], /address1=192\.168\.10\.50\/24,192\.168\.10\.1/);
  assert.match(run(state, "nmcli connection up ens160"), /IP=192\.168\.10\.50\/24/);
  assert.match(run(state, "ping 192.168.10.1"), /0% packet loss/);
}

{
  const state = createInitialState("link-down");
  assert.equal(state.device.cablePlugged, false);
  assert.match(run(state, "nmcli device status"), /ens160\s+ethernet\s+unavailable/);
  assert.match(run(state, "ip link"), /NO-CARRIER/);
  assert.equal(run(state, "ip route"), "");
  assert.match(run(state, "ping 192.168.10.1"), /Network is unreachable/);
  assert.match(run(state, "nmcli connection up ens160"), /carrier is off/);
  assert.equal(setCablePlugged(state, true), true);
  assert.equal(state.device.cablePlugged, true);
  assert.match(run(state, "ip link"), /UP,LOWER_UP/);
  assert.match(run(state, "ping 192.168.10.1"), /0% packet loss/);
}

{
  const state = createInitialState("ip-config");
  assert.match(run(state, "nmcli device status"), /disconnected/);
  assert.equal(run(state, "ip route"), "");
  assert.match(run(state, "nmcli connection modify ens160 ipv4.addresses 192.168.10.50/24 ipv4.gateway 192.168.10.1 ipv4.dns 192.168.10.53 ipv4.method manual"), /successfully modified/);
  assert.match(run(state, "nmcli connection up ens160"), /successfully activated/);
  assert.match(run(state, "ping 192.168.10.1"), /0% packet loss/);
}

{
  const state = createInitialState("dns-broken");
  assert.match(run(state, "ping 192.168.10.1"), /0% packet loss/);
  assert.match(run(state, "dig repo.lab.example"), /no servers could be reached/);
  assert.match(run(state, "nmcli connection modify ens160 ipv4.dns 192.168.10.53"), /successfully modified/);
  assert.match(getVirtualFiles(state)["/etc/NetworkManager/system-connections/ens160.nmconnection"], /dns=192\.168\.10\.53;/);
  assert.match(run(state, "cat /etc/resolv.conf"), /nameserver 203\.0\.113\.53/);
  assert.match(run(state, "nmcli connection up ens160"), /DNS=192\.168\.10\.53/);
  assert.match(run(state, "nslookup repo.lab.example"), /Address: 198\.51\.100\.20/);
}

{
  const state = createInitialState("route-and-name");
  assert.doesNotMatch(run(state, "cat /etc/hosts"), /repo\.lab\.example/);
  assert.match(run(state, "ip route"), /default via 192\.168\.10\.254/);
  assert.match(run(state, "ping 192.168.10.1"), /0% packet loss/);
  assert.match(run(state, "dig repo.lab.example"), /198\.51\.100\.20/);
  assert.match(run(state, "ping repo.lab.example"), /PING repo\.lab\.example \(198\.51\.100\.20\)/);
  assert.match(run(state, "ping repo.lab.example"), /Destination Net Unreachable/);
  assert.match(run(state, "nmcli connection modify ens160 ipv4.gateway 192.168.10.1"), /successfully modified/);
  assert.match(run(state, "nmcli connection up ens160"), /GW=192\.168\.10\.1/);
  assert.match(run(state, "ping repo.lab.example"), /0% packet loss/);
}

{
  const guide = getExerciseGuide("dns-broken");
  const commands = guide.steps.flatMap(step => step.commands);
  assert.ok(commands.includes("nmcli connection modify ens160 ipv4.dns 192.168.10.53"));
  assert.ok(commands.includes("nslookup repo.lab.example"));
}

{
  const state = createInitialState("dns-broken");
  let guide = getExerciseGuide(state);
  assert.equal(guide.steps.find(step => step.id === "dns-isolate").done, false);
  run(state, "ping 192.168.10.1");
  run(state, "dig repo.lab.example");
  guide = getExerciseGuide(state);
  assert.equal(guide.steps.find(step => step.id === "dns-isolate").done, true);
}

{
  const state = createInitialState("link-down");
  const topology = getTopologyDetails(state);
  assert.equal(topology.overallStatus, "attention");
  assert.equal(topology.nodes.find(node => node.id === "linux").cable.plugged, false);
  assert.equal(topology.links.find(link => link.id === "linux-switch").status, "error");
  assert.equal(topology.links.find(link => link.id === "linux-switch").toggle.enabled, true);
}

{
  const state = createInitialState("dns-broken");
  const topology = getTopologyDetails(state);
  assert.equal(topology.overallStatus, "attention");
  assert.equal(topology.nodes.find(node => node.id === "localDns").status, "error");
  assert.equal(topology.nodes.find(node => node.id === "publicDns").metric, "8.8.8.8");
}

{
  const state = createInitialState("route-and-name");
  const topology = getTopologyDetails(state);
  assert.equal(topology.links.find(link => link.id === "gateway-internet").status, "error");
  assert.match(topology.summary, /default gateway/);
}

{
  const state = createInitialState("basic");
  run(state, "cat /etc/NetworkManager/system-connections/ens160.nmconnection");
  let details = getScenarioDetails(state);
  let guide = getExerciseGuide(state);
  assert.equal(details.goals.find(goal => goal.id === "basic-files").done, false);
  assert.equal(guide.steps.find(step => step.id === "basic-check-files").done, false);

  run(state, "cat /etc/resolv.conf");
  details = getScenarioDetails(state);
  guide = getExerciseGuide(state);
  assert.equal(details.goals.find(goal => goal.id === "basic-files").done, true);
  assert.equal(guide.steps.find(step => step.id === "basic-check-files").done, true);
}

{
  const state = createInitialState("basic");
  run(state, "cat /etc/NetworkManager/system-connections/ens160.nmconnection");
  run(state, "cat /etc/resolv.conf.bak");
  const details = getScenarioDetails(state);
  assert.equal(details.goals.find(goal => goal.id === "basic-files").done, false);
}

{
  const state = createInitialState("basic");
  run(state, "pingbad");
  run(state, "digbad");
  run(state, "ip routebad");
  const details = getScenarioDetails(state);
  assert.equal(details.goals.find(goal => goal.id === "basic-verify").done, false);
}

{
  const state = createInitialState("link-down");
  run(state, "nmcli device status");
  run(state, "nmcli connection showfoo");
  const details = getScenarioDetails(state);
  assert.equal(details.goals.find(goal => goal.id === "link-see").done, false);
}

{
  const state = createInitialState("route-and-name");
  run(state, "ping 192.168.10.1");
  run(state, "dig repo.lab.example");
  const details = getScenarioDetails(state);
  const guide = getExerciseGuide(state);
  assert.equal(details.goals.find(goal => goal.id === "route-cut").done, false);
  assert.equal(guide.steps.find(step => step.id === "external-route-fail").done, false);
}

{
  assert.deepEqual(
    listScenarios().map(scenario => [scenario.id, scenario.level]),
    [
      ["basic", "導入"],
      ["ip-config", "基礎"],
      ["link-down", "初級"],
      ["dns-broken", "中級"],
      ["route-and-name", "上級"]
    ]
  );
}

for (const scenarioId of ["basic", "ip-config", "link-down", "dns-broken", "route-and-name"]) {
  const state = createInitialState(scenarioId);
  let guide = getExerciseGuide(state);
  for (const step of guide.steps) {
    if (scenarioId === "link-down" && step.id === "link-plug-cable") {
      setCablePlugged(state, true);
    }
    for (const command of step.commands) run(state, command);
  }

  guide = getExerciseGuide(state);
  assert.deepEqual(
    guide.steps.map(step => [step.id, step.done]),
    guide.steps.map(step => [step.id, true]),
    `${scenarioId} guide commands should complete every guide step`
  );
}

console.log("simulator tests passed");
