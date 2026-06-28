const DNS_SERVER = "192.168.10.53";
const GOOD_GATEWAY = "192.168.10.1";
const LAB_ADDRESS = "192.168.10.50/24";

const DNS_RECORDS = {
  "repo.lab.example": "192.168.20.20",
  "mirror.lab.example": "192.168.20.30",
  "intranet.lab.example": "192.168.10.80",
  "www.almalinux.org": "104.21.81.56",
  "dns.lab.example": DNS_SERVER
};

const BASE_HOSTS = {
  "localhost": "127.0.0.1",
  "alma-lab01": "127.0.1.1",
  "intranet.lab.example": "192.168.10.80"
};

const SCENARIOS = [
  {
    id: "basic",
    title: "基本操作",
    level: "導入",
    description: "NetworkManagerの状態、設定ファイル、通信確認の読み方を順番に体験します。",
    start: {
      deviceState: "connected",
      profile: {
        method: "manual",
        address: LAB_ADDRESS,
        gateway: GOOD_GATEWAY,
        dns: DNS_SERVER,
        autoconnect: true
      },
      runtimeMatchesProfile: true
    },
    goals: [
      {
        id: "basic-status",
        text: "nmcli device statusでNICの状態を確認",
        isDone: state => state.commands.some(commandStarts("nmcli device status"))
      },
      {
        id: "basic-files",
        text: "設定ファイルとresolv.confをcatで確認",
        isDone: state =>
          state.commands.some(commandIncludes("/etc/NetworkManager/system-connections/ens160.nmconnection")) &&
          state.commands.some(commandIncludes("/etc/resolv.conf"))
      },
      {
        id: "basic-verify",
        text: "ping、dig、ip routeで通信を確認",
        isDone: state =>
          state.commands.some(commandStarts("ping")) &&
          state.commands.some(commandStarts("dig")) &&
          state.commands.some(commandStarts("ip route"))
      }
    ]
  },
  {
    id: "link-down",
    title: "演習1: connection未起動",
    level: "初級",
    description: "NICは管理対象ですが、connectionが未起動です。状態確認から起動までを行います。",
    start: {
      deviceState: "disconnected",
      profile: {
        method: "manual",
        address: LAB_ADDRESS,
        gateway: GOOD_GATEWAY,
        dns: DNS_SERVER,
        autoconnect: false
      },
      runtimeMatchesProfile: false
    },
    goals: [
      {
        id: "link-see",
        text: "device statusとconnection showで未接続を確認",
        isDone: state =>
          state.commands.some(commandStarts("nmcli device status")) &&
          state.commands.some(commandStarts("nmcli connection show"))
      },
      {
        id: "link-up",
        text: "nmcli connection up ens160で接続を有効化",
        isDone: state => state.runtime.active
      },
      {
        id: "link-ping",
        text: "ping 192.168.10.1でゲートウェイ到達を確認",
        isDone: state => state.successes.has("ping:192.168.10.1")
      }
    ]
  },
  {
    id: "dns-broken",
    title: "演習2: DNS設定不良",
    level: "中級",
    description: "IP通信は可能ですが、DNSサーバーの設定が誤っています。resolv.confとdigで切り分けます。",
    start: {
      deviceState: "connected",
      profile: {
        method: "manual",
        address: LAB_ADDRESS,
        gateway: GOOD_GATEWAY,
        dns: "203.0.113.53",
        autoconnect: true
      },
      runtimeMatchesProfile: true
    },
    goals: [
      {
        id: "dns-cut",
        text: "ping 192.168.10.1成功とdig失敗を比較",
        isDone: state => state.successes.has("ping:192.168.10.1") && state.failures.has("dns")
      },
      {
        id: "dns-fix",
        text: "ipv4.dnsを192.168.10.53へ修正してconnection up",
        isDone: state => state.runtime.dns === DNS_SERVER
      },
      {
        id: "dns-ok",
        text: "digまたはnslookupで名前解決成功を確認",
        isDone: state => state.successes.has("dns:repo.lab.example") || state.successes.has("dns:intranet.lab.example")
      }
    ]
  },
  {
    id: "route-and-name",
    title: "演習3: 経路と名前解決順序",
    level: "上級",
    description: "DNSは正しく見えますが、デフォルトゲートウェイとhosts優先の影響が混ざっています。",
    start: {
      deviceState: "connected",
      profile: {
        method: "manual",
        address: LAB_ADDRESS,
        gateway: "192.168.10.254",
        dns: DNS_SERVER,
        autoconnect: true
      },
      runtimeMatchesProfile: true,
      hosts: {
        "repo.lab.example": "172.16.5.20"
      }
    },
    goals: [
      {
        id: "route-see",
        text: "ip routeまたはnetstat -rnで誤ったdefault gatewayを確認",
        isDone: state => state.commands.some(commandStarts("ip route")) || state.commands.some(commandStarts("netstat -rn"))
      },
      {
        id: "name-order",
        text: "nsswitch.confとhostsを読み、digとpingの名前解決差を確認",
        isDone: state =>
          state.commands.some(commandIncludes("/etc/nsswitch.conf")) &&
          state.commands.some(commandIncludes("/etc/hosts")) &&
          state.commands.some(commandStarts("dig repo.lab.example")) &&
          state.commands.some(commandStarts("ping repo.lab.example"))
      },
      {
        id: "route-fix",
        text: "ipv4.gatewayを192.168.10.1へ修正してconnection up",
        isDone: state => state.runtime.gateway === GOOD_GATEWAY
      }
    ]
  }
];

export function listScenarios() {
  return SCENARIOS.map(({ id, title, level, description }) => ({ id, title, level, description }));
}

export function createInitialState(scenarioId = "basic") {
  const scenario = getScenario(scenarioId);
  const profile = { ...scenario.start.profile };
  const runtime = scenario.start.runtimeMatchesProfile
    ? { ...profile, active: scenario.start.deviceState === "connected" }
    : { method: profile.method, address: "", gateway: "", dns: "", autoconnect: profile.autoconnect, active: false };

  return {
    scenarioId,
    device: {
      name: "ens160",
      type: "ethernet",
      state: scenario.start.deviceState,
      connection: scenario.start.deviceState === "connected" ? "ens160" : "--"
    },
    profile,
    runtime,
    hostname: "alma-lab01",
    nsswitchHosts: ["files", "dns"],
    hosts: { ...BASE_HOSTS, ...(scenario.start.hosts || {}) },
    commands: [],
    successes: new Set(),
    failures: new Set(),
    lastMessage: ""
  };
}

export function getScenarioDetails(stateOrId) {
  const scenarioId = typeof stateOrId === "string" ? stateOrId : stateOrId.scenarioId;
  const scenario = getScenario(scenarioId);
  return {
    id: scenario.id,
    title: scenario.title,
    level: scenario.level,
    description: scenario.description,
    goals: scenario.goals.map(goal => ({
      id: goal.id,
      text: goal.text,
      done: typeof stateOrId === "string" ? false : goal.isDone(stateOrId)
    }))
  };
}

export function getStateSummary(state) {
  return [
    ["Device", `${state.device.name} (${state.device.state})`],
    ["Profile IP", state.profile.address || "未設定"],
    ["Active IP", state.runtime.address || "未反映"],
    ["Gateway", state.runtime.gateway || "未反映"],
    ["DNS", state.runtime.dns || "未反映"],
    ["反映状態", profileMatchesRuntime(state) ? "profile = runtime" : "connection upが必要"]
  ];
}

export function getVirtualFiles(state) {
  return {
    "/etc/NetworkManager/system-connections/ens160.nmconnection": buildNmConnection(state),
    "/etc/resolv.conf": buildResolvConf(state),
    "/etc/nsswitch.conf": buildNsswitch(state),
    "/etc/hostname": `${state.hostname}\n`,
    "/etc/hosts": buildHosts(state)
  };
}

export function getFileNotes() {
  return {
    "/etc/NetworkManager/system-connections/ens160.nmconnection": "NetworkManagerのconnection profileです。nmcli connection modifyでここに相当する設定が変わり、connection upでランタイムに反映されます。",
    "/etc/resolv.conf": "現在の名前解決で参照するDNSサーバーです。このラボではconnection up後のDNS設定を反映します。",
    "/etc/nsswitch.conf": "名前解決の参照順を決めます。hosts: files dns なら /etc/hosts を先に見て、その後DNSを見ます。",
    "/etc/hostname": "このホスト自身の名前です。プロンプトやログ上の識別に使われます。",
    "/etc/hosts": "小規模な固定名前解決です。pingなど通常の名前解決ではnsswitch.confの順序に従って参照されます。"
  };
}

export function runCommand(state, input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  state.commands.push(trimmed);
  const tokens = tokenize(trimmed);
  const command = tokens[0] || "";

  try {
    if (command === "help") return helpText();
    if (command === "clear") return "__CLEAR__";
    if (command === "reset") return "__RESET__";
    if (command === "cat") return catFile(state, tokens.slice(1));
    if (command === "ls") return lsCommand(tokens.slice(1));
    if (command === "hostname") return `${state.hostname}\n`;
    if (command === "nmcli") return nmcliCommand(state, tokens.slice(1));
    if (command === "ip") return ipCommand(state, tokens.slice(1));
    if (command === "ping") return pingCommand(state, tokens.slice(1));
    if (command === "dig") return digCommand(state, tokens.slice(1));
    if (command === "nslookup") return nslookupCommand(state, tokens.slice(1));
    if (command === "netstat") return netstatCommand(state, tokens.slice(1));
    return `${command}: command not found\nhelp で利用できるコマンドを確認できます。\n`;
  } catch (error) {
    return `エラー: ${error.message}\n`;
  }
}

function getScenario(id) {
  const scenario = SCENARIOS.find(item => item.id === id);
  if (!scenario) return SCENARIOS[0];
  return scenario;
}

function commandStarts(prefix) {
  return command => normalizeCommand(command).startsWith(prefix);
}

function commandIncludes(fragment) {
  return command => normalizeCommand(command).includes(fragment);
}

function normalizeCommand(command) {
  return command.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(input) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function helpText() {
  return [
    "利用できる主なコマンド:",
    "  nmcli device status",
    "  nmcli connection show [--active|ens160]",
    "  nmcli connection modify ens160 ipv4.addresses 192.168.10.50/24 ipv4.gateway 192.168.10.1 ipv4.dns 192.168.10.53 ipv4.method manual",
    "  nmcli connection up ens160",
    "  ip addr",
    "  ip route",
    "  cat /etc/NetworkManager/system-connections/ens160.nmconnection",
    "  cat /etc/resolv.conf",
    "  cat /etc/nsswitch.conf",
    "  cat /etc/hostname",
    "  cat /etc/hosts",
    "  ping 192.168.10.1",
    "  dig repo.lab.example",
    "  nslookup repo.lab.example",
    "  netstat -rn",
    "  netstat -tuln",
    "",
    "ヒント: modifyはプロファイル変更、upは反映です。"
  ].join("\n") + "\n";
}

function catFile(state, args) {
  if (args.length === 0) return "cat: missing file operand\n";
  const files = getVirtualFiles(state);
  const path = args[0];
  if (!files[path]) return `cat: ${path}: No such file or directory\n`;
  return files[path];
}

function lsCommand(args) {
  const path = args[0] || ".";
  if (path === "/etc/NetworkManager/system-connections" || path === "/etc/NetworkManager/system-connections/") {
    return "ens160.nmconnection\n";
  }
  if (path === "/etc") {
    return "NetworkManager  hostname  hosts  nsswitch.conf  resolv.conf\n";
  }
  return `ls: cannot access '${path}': No such file or directory\n`;
}

function nmcliCommand(state, args) {
  const [area, action, ...rest] = args;
  if (area === "device" && action === "status") return nmcliDeviceStatus(state);
  if (area === "connection" && action === "show") return nmcliConnectionShow(state, rest);
  if (area === "connection" && (action === "modify" || action === "modift")) {
    const output = nmcliConnectionModify(state, rest);
    if (action === "modift") {
      return "警告: 正しいサブコマンドは modify です。このラボでは学習用に処理しました。\n" + output;
    }
    return output;
  }
  if (area === "connection" && action === "up") return nmcliConnectionUp(state, rest);
  return `Error: unsupported nmcli command: nmcli ${args.join(" ")}\n`;
}

function nmcliDeviceStatus(state) {
  return [
    "DEVICE  TYPE      STATE         CONNECTION",
    `${pad(state.device.name, 7)} ${pad(state.device.type, 9)} ${pad(state.device.state, 13)} ${state.runtime.active ? "ens160" : "--"}`
  ].join("\n") + "\n";
}

function nmcliConnectionShow(state, args) {
  if (args[0] === "--active") {
    if (!state.runtime.active) return "NAME  UUID  TYPE  DEVICE\n";
    return [
      "NAME    UUID                                  TYPE      DEVICE",
      "ens160  9c6b8fd8-8d6d-4d35-a8ab-10a5f7f0e160  ethernet  ens160"
    ].join("\n") + "\n";
  }
  if (args[0] && args[0] !== "ens160") {
    return `Error: unknown connection '${args[0]}'\n`;
  }
  if (args[0] === "ens160") {
    return [
      "connection.id:                          ens160",
      "connection.uuid:                        9c6b8fd8-8d6d-4d35-a8ab-10a5f7f0e160",
      "connection.type:                        802-3-ethernet",
      "connection.interface-name:              ens160",
      `connection.autoconnect:                 ${state.profile.autoconnect ? "yes" : "no"}`,
      `ipv4.method:                            ${state.profile.method}`,
      `ipv4.addresses:                         ${state.profile.address || "--"}`,
      `ipv4.gateway:                           ${state.profile.gateway || "--"}`,
      `ipv4.dns:                               ${state.profile.dns || "--"}`
    ].join("\n") + "\n";
  }
  return [
    "NAME    UUID                                  TYPE      DEVICE",
    `ens160  9c6b8fd8-8d6d-4d35-a8ab-10a5f7f0e160  ethernet  ${state.runtime.active ? "ens160" : "--"}`
  ].join("\n") + "\n";
}

function nmcliConnectionModify(state, args) {
  if (args.length < 3) return "Error: usage: nmcli connection modify ens160 <property> <value> ...\n";
  const connectionId = args[0];
  if (connectionId !== "ens160") return `Error: unknown connection '${connectionId}'\n`;

  const changes = [];
  for (let index = 1; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (value === undefined) return `Error: value missing for '${key}'\n`;

    if (key === "ipv4.addresses" || key === "ipv4.address") {
      state.profile.address = value;
      changes.push(`ipv4.addresses=${value}`);
    } else if (key === "ipv4.gateway") {
      state.profile.gateway = value;
      changes.push(`ipv4.gateway=${value}`);
    } else if (key === "ipv4.dns") {
      state.profile.dns = value;
      changes.push(`ipv4.dns=${value}`);
    } else if (key === "ipv4.method") {
      state.profile.method = value;
      changes.push(`ipv4.method=${value}`);
    } else if (key === "connection.autoconnect") {
      state.profile.autoconnect = ["yes", "true", "1"].includes(value.toLowerCase());
      changes.push(`connection.autoconnect=${state.profile.autoconnect ? "yes" : "no"}`);
    } else {
      return `Error: unsupported property '${key}'\n`;
    }
  }

  return [
    `Connection 'ens160' successfully modified.`,
    `変更: ${changes.join(", ")}`,
    "注意: 現在の通信へ反映するには nmcli connection up ens160 を実行してください。"
  ].join("\n") + "\n";
}

function nmcliConnectionUp(state, args) {
  const connectionId = args[0];
  if (!connectionId) return "Error: usage: nmcli connection up ens160\n";
  if (connectionId !== "ens160") return `Error: unknown connection '${connectionId}'\n`;
  if (state.profile.method !== "manual" && state.profile.method !== "auto") {
    return `Error: unsupported ipv4.method '${state.profile.method}'\n`;
  }

  state.runtime = { ...state.profile, active: true };
  state.device.state = "connected";
  state.device.connection = "ens160";
  return [
    "Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/7)",
    `反映: IP=${state.runtime.address || "DHCP想定"} GW=${state.runtime.gateway || "--"} DNS=${state.runtime.dns || "--"}`
  ].join("\n") + "\n";
}

function ipCommand(state, args) {
  const normalized = args.join(" ");
  if (args[0] === "addr" || args[0] === "a" || normalized === "-4 addr" || normalized.startsWith("-4 addr show")) {
    return ipAddr(state);
  }
  if (args[0] === "route" || normalized === "r") {
    return ipRoute(state);
  }
  if (args[0] === "link") {
    return [
      "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN mode DEFAULT group default qlen 1000",
      `2: ens160: <BROADCAST,MULTICAST,${state.runtime.active ? "UP,LOWER_UP" : "DOWN"}> mtu 1500 state ${state.runtime.active ? "UP" : "DOWN"} mode DEFAULT group default qlen 1000`
    ].join("\n") + "\n";
  }
  return `ip: unsupported arguments '${args.join(" ")}'\n`;
}

function ipAddr(state) {
  const inet = state.runtime.active && state.runtime.address ? `    inet ${state.runtime.address} brd 192.168.10.255 scope global noprefixroute ens160\n` : "";
  return [
    "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000",
    "    inet 127.0.0.1/8 scope host lo",
    `2: ens160: <BROADCAST,MULTICAST,${state.runtime.active ? "UP,LOWER_UP" : "DOWN"}> mtu 1500 qdisc fq_codel state ${state.runtime.active ? "UP" : "DOWN"} group default qlen 1000`,
    inet.trimEnd()
  ].filter(Boolean).join("\n") + "\n";
}

function ipRoute(state) {
  if (!state.runtime.active || !state.runtime.address) return "";
  const lines = [];
  if (state.runtime.gateway) lines.push(`default via ${state.runtime.gateway} dev ens160 proto static metric 100`);
  lines.push("192.168.10.0/24 dev ens160 proto kernel scope link src 192.168.10.50 metric 100");
  return lines.join("\n") + "\n";
}

function pingCommand(state, args) {
  const target = args.find(arg => !arg.startsWith("-"));
  if (!target) return "ping: usage error: Destination address required\n";

  const resolution = resolveForPing(state, target);
  if (!resolution.ok) {
    state.failures.add(resolution.reason === "dns" ? "dns" : "ping");
    return resolution.message;
  }

  const route = routeTo(state, resolution.ip);
  if (!route.ok) {
    state.failures.add("route");
    return `PING ${target} (${resolution.ip}) 56(84) bytes of data.\nFrom 192.168.10.50 icmp_seq=1 Destination Net Unreachable\n\n--- ${target} ping statistics ---\n1 packets transmitted, 0 received, +1 errors, 100% packet loss, time 0ms\n`;
  }

  state.successes.add(`ping:${target}`);
  state.successes.add(`ping:${resolution.ip}`);
  return [
    `PING ${target} (${resolution.ip}) 56(84) bytes of data.`,
    `64 bytes from ${resolution.ip}: icmp_seq=1 ttl=64 time=0.242 ms`,
    `64 bytes from ${resolution.ip}: icmp_seq=2 ttl=64 time=0.251 ms`,
    "",
    `--- ${target} ping statistics ---`,
    "2 packets transmitted, 2 received, 0% packet loss, time 1001ms"
  ].join("\n") + "\n";
}

function digCommand(state, args) {
  const short = args.includes("+short");
  const target = args.find(arg => !arg.startsWith("+") && !arg.startsWith("@"));
  if (!target) return "Usage: dig [@server] name\n";
  const result = resolveDnsOnly(state, target);
  if (!result.ok) {
    state.failures.add("dns");
    return short ? "" : [
      `; <<>> DiG 9.16.23-RH <<>> ${target}`,
      ";; connection timed out; no servers could be reached"
    ].join("\n") + "\n";
  }
  state.successes.add(`dns:${target}`);
  if (short) return `${result.ip}\n`;
  return [
    `; <<>> DiG 9.16.23-RH <<>> ${target}`,
    ";; global options: +cmd",
    ";; Got answer:",
    ";; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48231",
    "",
    ";; ANSWER SECTION:",
    `${target}.        300 IN A ${result.ip}`,
    "",
    `;; SERVER: ${state.runtime.dns}#53(${state.runtime.dns})`,
    ";; Query time: 3 msec"
  ].join("\n") + "\n";
}

function nslookupCommand(state, args) {
  const target = args[0];
  if (!target) return "Usage: nslookup name\n";
  const result = resolveDnsOnly(state, target);
  if (!result.ok) {
    state.failures.add("dns");
    const server = state.runtime.dns || "127.0.0.1";
    return `;; communications error to ${server}#53: timed out\n;; no servers could be reached\n`;
  }
  state.successes.add(`dns:${target}`);
  return [
    `Server:         ${state.runtime.dns}`,
    `Address:        ${state.runtime.dns}#53`,
    "",
    `Name:   ${target}`,
    `Address: ${result.ip}`
  ].join("\n") + "\n";
}

function netstatCommand(state, args) {
  if (args.includes("-rn") || (args.includes("-r") && args.includes("-n"))) {
    const route = ipRoute(state).trim();
    return [
      "Kernel IP routing table",
      "Destination     Gateway         Genmask         Flags   MSS Window  irtt Iface",
      route
        ? route.split("\n").map(line => {
          if (line.startsWith("default")) return `0.0.0.0         ${state.runtime.gateway}    0.0.0.0         UG        0 0          0 ens160`;
          return "192.168.10.0    0.0.0.0         255.255.255.0   U         0 0          0 ens160";
        }).join("\n")
        : ""
    ].filter(Boolean).join("\n") + "\n";
  }
  if (args.includes("-tuln") || args.includes("-lntup")) {
    return [
      "Active Internet connections (only servers)",
      "Proto Recv-Q Send-Q Local Address           Foreign Address         State",
      "tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN",
      "udp        0      0 127.0.0.1:323           0.0.0.0:*"
    ].join("\n") + "\n";
  }
  return "netstat: このラボでは -rn と -tuln を利用できます\n";
}

function resolveForPing(state, target) {
  if (isIPv4(target)) return { ok: true, ip: target, source: "literal" };
  for (const source of state.nsswitchHosts) {
    if (source === "files" && state.hosts[target]) {
      return { ok: true, ip: state.hosts[target], source: "files" };
    }
    if (source === "dns") {
      const dns = resolveDnsOnly(state, target);
      if (dns.ok) return { ok: true, ip: dns.ip, source: "dns" };
      return {
        ok: false,
        reason: "dns",
        message: `ping: ${target}: Name or service not known\n`
      };
    }
  }
  return { ok: false, reason: "name", message: `ping: ${target}: Name or service not known\n` };
}

function resolveDnsOnly(state, target) {
  if (!state.runtime.active || !state.runtime.dns || state.runtime.dns !== DNS_SERVER) {
    return { ok: false };
  }
  const ip = DNS_RECORDS[target];
  return ip ? { ok: true, ip } : { ok: false };
}

function routeTo(state, ip) {
  if (!state.runtime.active || !state.runtime.address) return { ok: false };
  if (ip.startsWith("192.168.10.")) return { ok: true };
  return { ok: state.runtime.gateway === GOOD_GATEWAY };
}

function buildNmConnection(state) {
  return [
    "[connection]",
    "id=ens160",
    "uuid=9c6b8fd8-8d6d-4d35-a8ab-10a5f7f0e160",
    "type=ethernet",
    "interface-name=ens160",
    `autoconnect=${state.profile.autoconnect ? "true" : "false"}`,
    "",
    "[ipv4]",
    `method=${state.profile.method}`,
    state.profile.address ? `address1=${state.profile.address},${state.profile.gateway || ""}` : "address1=",
    state.profile.dns ? `dns=${state.profile.dns};` : "dns=",
    "dns-search=lab.example;",
    "",
    "[ipv6]",
    "method=disabled"
  ].join("\n") + "\n";
}

function buildResolvConf(state) {
  if (!state.runtime.active || !state.runtime.dns) {
    return "# Generated by NetworkManager\n# connection is not active; no DNS server is currently applied\n";
  }
  return [
    "# Generated by NetworkManager",
    "search lab.example",
    `nameserver ${state.runtime.dns}`
  ].join("\n") + "\n";
}

function buildNsswitch(state) {
  return [
    "passwd:     files systemd",
    "shadow:     files",
    "group:      files systemd",
    `hosts:      ${state.nsswitchHosts.join(" ")}`,
    "services:   files sss",
    "netgroup:   sss"
  ].join("\n") + "\n";
}

function buildHosts(state) {
  const lines = Object.entries(state.hosts).map(([host, ip]) => `${pad(ip, 15)} ${host}`);
  return lines.join("\n") + "\n";
}

function profileMatchesRuntime(state) {
  return state.runtime.active &&
    state.profile.address === state.runtime.address &&
    state.profile.gateway === state.runtime.gateway &&
    state.profile.dns === state.runtime.dns &&
    state.profile.method === state.runtime.method;
}

function isIPv4(value) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}
