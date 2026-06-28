import assert from "node:assert/strict";
import {
  createInitialState,
  getVirtualFiles,
  runCommand
} from "../assets/simulator.js";

function run(state, command) {
  return runCommand(state, command);
}

{
  const state = createInitialState("basic");
  assert.match(run(state, "nmcli device status"), /ens160\s+ethernet\s+connected/);
  assert.match(run(state, "ip route"), /default via 192\.168\.10\.1/);
  assert.match(run(state, "dig repo.lab.example"), /192\.168\.20\.20/);
  assert.match(run(state, "cat /etc/resolv.conf"), /nameserver 192\.168\.10\.53/);
}

{
  const state = createInitialState("link-down");
  assert.match(run(state, "nmcli device status"), /disconnected/);
  assert.equal(run(state, "ip route"), "");
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
  assert.match(run(state, "nslookup repo.lab.example"), /Address: 192\.168\.20\.20/);
}

{
  const state = createInitialState("route-and-name");
  assert.match(run(state, "ip route"), /default via 192\.168\.10\.254/);
  assert.match(run(state, "dig repo.lab.example"), /192\.168\.20\.20/);
  assert.match(run(state, "ping repo.lab.example"), /172\.16\.5\.20/);
  assert.match(run(state, "nmcli connection modify ens160 ipv4.gateway 192.168.10.1"), /successfully modified/);
  assert.match(run(state, "nmcli connection up ens160"), /GW=192\.168\.10\.1/);
}

console.log("simulator tests passed");
