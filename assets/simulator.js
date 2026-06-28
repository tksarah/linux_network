const DNS_SERVER = "192.168.10.53";
const PUBLIC_DNS_SERVER = "8.8.8.8";
const GOOD_GATEWAY = "192.168.10.1";
const LAB_ADDRESS = "192.168.10.50/24";

const DNS_RECORDS = {
  "repo.lab.example": "198.51.100.20",
  "mirror.lab.example": "192.168.20.30",
  "intranet.lab.example": "192.168.10.80",
  "www.almalinux.org": "104.21.81.56",
  "dns.lab.example": DNS_SERVER,
  "public-dns.lab.example": PUBLIC_DNS_SERVER
};

const BASE_HOSTS = {
  "localhost": "127.0.0.1",
  "alma-lab01": "127.0.1.1",
  "intranet.lab.example": "192.168.10.80"
};

const TOPOLOGY_ICONS = {
  linux: "assets/images/icon-linux-terminal.png",
  switch: "assets/images/icon-network-switch.png",
  gateway: "assets/images/icon-router-gateway.png",
  dns: "assets/images/icon-dns-server.png",
  internet: "assets/images/icon-internet-server.png"
};

const SCENARIOS = [
  {
    id: "basic",
    title: "基本操作",
    level: "導入",
    description: "NetworkManagerの状態、設定ファイル、通信確認の読み方を順番に体験します。",
    guide: {
      summary: "正常な構成を見ながら、NetworkManagerのプロファイル、実際に反映された状態、通信確認の対応をつかみます。",
      steps: [
        {
          id: "basic-check-profile",
          phase: "確認",
          purpose: "NICとconnection profileが有効かを確認する",
          commands: ["nmcli device status", "nmcli connection show ens160"],
          expected: "ens160 が connected で、IP、GW、DNS がプロファイルに設定されていることを見る",
          isDone: state =>
            hasObservation(state, "nmcli:device-status") &&
            hasObservation(state, "nmcli:connection-show:ens160")
        },
        {
          id: "basic-check-files",
          phase: "設定確認",
          purpose: "2つの設定ファイルをcatで確認する",
          commands: [
            "cat /etc/NetworkManager/system-connections/ens160.nmconnection",
            "cat /etc/resolv.conf"
          ],
          expected: "ens160.nmconnectionのaddress1/dnsと、resolv.confのnameserverを両方確認する",
          isDone: state =>
            hasObservation(state, "cat:/etc/NetworkManager/system-connections/ens160.nmconnection") &&
            hasObservation(state, "cat:/etc/resolv.conf")
        },
        {
          id: "basic-verify-network",
          phase: "検証",
          purpose: "IPアドレス、経路、疎通、名前解決を順番に確認する",
          commands: ["ip addr", "ip route", "ping 192.168.10.1", "dig repo.lab.example"],
          expected: "Active IP、default route、ゲートウェイへのping成功、ローカルDNSからの応答を確認する",
          isDone: state =>
            hasObservation(state, "ip:addr") &&
            hasObservation(state, "ip:route") &&
            state.successes.has("ping:192.168.10.1") &&
            state.successes.has("dns:repo.lab.example")
        }
      ]
    },
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
        isDone: state => hasObservation(state, "nmcli:device-status")
      },
      {
        id: "basic-files",
        text: "2つのファイルをcatで確認: ens160.nmconnection と /etc/resolv.conf",
        isDone: state =>
          hasObservation(state, "cat:/etc/NetworkManager/system-connections/ens160.nmconnection") &&
          hasObservation(state, "cat:/etc/resolv.conf")
      },
      {
        id: "basic-verify",
        text: "ip route、ping 192.168.10.1、dig repo.lab.exampleで通信を確認",
        isDone: state =>
          hasObservation(state, "ip:route") &&
          state.successes.has("ping:192.168.10.1") &&
          state.successes.has("dns:repo.lab.example")
      }
    ]
  },
  {
    id: "ip-config",
    title: "演習1: IP設定とリンクアップ",
    level: "基礎",
    description: "nmcliでLinux端末にIPアドレス、ゲートウェイ、DNSを設定し、connection upで通信できる状態にします。",
    guide: {
      summary: "ケーブルは接続済みですが、IP設定がまだ入っていません。プロファイルにIPv4設定を保存し、ランタイムへ反映して疎通確認します。",
      steps: [
        {
          id: "ip-config-confirm-empty",
          phase: "確認",
          purpose: "NICは見えているがIP設定とactive connectionがないことを確認する",
          commands: ["nmcli device status", "nmcli connection show ens160", "ip addr"],
          expected: "ens160 は disconnected、profileのIPv4項目は未設定で、ip addrにもIPv4アドレスが出ない",
          isDone: state =>
            hasObservation(state, "nmcli:device-status") &&
            hasObservation(state, "nmcli:connection-show:ens160") &&
            hasObservation(state, "ip:addr")
        },
        {
          id: "ip-config-modify-profile",
          phase: "設定",
          purpose: "connection profileにIPアドレス、GW、DNS、manual方式を設定する",
          commands: [
            "nmcli connection modify ens160 ipv4.addresses 192.168.10.50/24 ipv4.gateway 192.168.10.1 ipv4.dns 192.168.10.53 ipv4.method manual"
          ],
          expected: "プロファイルに address / gateway / dns / method が保存されるが、まだ通信には未反映",
          isDone: state =>
            state.profile.address === LAB_ADDRESS &&
            state.profile.gateway === GOOD_GATEWAY &&
            state.profile.dns === DNS_SERVER &&
            state.profile.method === "manual"
        },
        {
          id: "ip-config-up-verify",
          phase: "リンクアップ",
          purpose: "保存したプロファイルを反映し、ゲートウェイまでの疎通を確認する",
          commands: ["nmcli connection up ens160", "ip route", "ping 192.168.10.1"],
          expected: "Connection successfully activated の後、default routeが出てpingが0% packet lossになる",
          isDone: state =>
            state.runtime.active &&
            state.runtime.address === LAB_ADDRESS &&
            hasObservation(state, "ip:route") &&
            state.successes.has("ping:192.168.10.1")
        }
      ]
    },
    start: {
      deviceState: "disconnected",
      cablePlugged: true,
      cableToggleable: false,
      profile: {
        method: "manual",
        address: "",
        gateway: "",
        dns: "",
        autoconnect: false
      },
      runtimeMatchesProfile: false
    },
    goals: [
      {
        id: "ip-config-empty",
        text: "nmcliとip addrでIP未設定、connection未起動を確認",
        isDone: state =>
          hasObservation(state, "nmcli:device-status") &&
          hasObservation(state, "nmcli:connection-show:ens160") &&
          hasObservation(state, "ip:addr")
      },
      {
        id: "ip-config-profile",
        text: "nmcli connection modifyでIP/GW/DNS/methodを設定",
        isDone: state =>
          state.profile.address === LAB_ADDRESS &&
          state.profile.gateway === GOOD_GATEWAY &&
          state.profile.dns === DNS_SERVER &&
          state.profile.method === "manual"
      },
      {
        id: "ip-config-online",
        text: "nmcli connection up後、ping 192.168.10.1で疎通確認",
        isDone: state => state.runtime.active && state.successes.has("ping:192.168.10.1")
      }
    ]
  },
  {
    id: "link-down",
    title: "初級: ケーブル未挿入",
    level: "初級",
    description: "Linux端末のRJ-45にネットワークケーブルが刺さっていません。物理リンク断を確認し、図上でケーブルを差し込んで復旧します。",
    guide: {
      summary: "プロファイル設定は正しいのに通信できません。nmcliとip linkでcarrierがないことを確認し、仮想ネットワーク図のトグルでケーブルを接続します。",
      steps: [
        {
          id: "link-confirm-carrier",
          phase: "確認",
          purpose: "NICが物理リンクを検出できていないことを確認する",
          commands: ["nmcli device status", "ip link", "nmcli connection show --active"],
          expected: "ens160 が unavailable で、ip linkにはNO-CARRIERが表示され、active connection一覧に出ない",
          isDone: state =>
            hasObservation(state, "nmcli:device-status") &&
            hasObservation(state, "ip:link") &&
            hasObservation(state, "nmcli:connection-show:active")
        },
        {
          id: "link-up-fails",
          phase: "切り分け",
          purpose: "設定反映だけでは物理リンク断を直せないことを確認する",
          commands: ["nmcli connection up ens160"],
          expected: "carrier off相当のエラーになり、プロファイル設定ではなくケーブル側の問題だと判断する",
          isDone: state => state.failures.has("carrier")
        },
        {
          id: "link-plug-cable",
          phase: "復旧",
          purpose: "右側の仮想ネットワーク図でRJ-45ケーブルを接続済みにして通信を確認する",
          commands: ["ip link", "ip addr", "ip route", "ping 192.168.10.1"],
          expected: "トグルを接続済みにするとens160がUP/LOWER_UPになり、default routeとping成功を確認できる",
          isDone: state =>
            state.device.cablePlugged &&
            state.runtime.active &&
            hasObservation(state, "ip:addr") &&
            hasObservation(state, "ip:route") &&
            state.successes.has("ping:192.168.10.1")
        }
      ]
    },
    start: {
      deviceState: "unavailable",
      cablePlugged: false,
      cableToggleable: true,
      profile: {
        method: "manual",
        address: LAB_ADDRESS,
        gateway: GOOD_GATEWAY,
        dns: DNS_SERVER,
        autoconnect: true
      },
      runtimeMatchesProfile: false
    },
    goals: [
      {
        id: "link-see",
        text: "device statusとip linkでRJ-45未挿入、NO-CARRIERを確認",
        isDone: state =>
          hasObservation(state, "nmcli:device-status") &&
          hasObservation(state, "ip:link")
      },
      {
        id: "link-carrier",
        text: "nmcli connection up ens160ではcarrier offで復旧しないことを確認",
        isDone: state => state.failures.has("carrier")
      },
      {
        id: "link-ping",
        text: "図上のトグルでケーブル接続後、ping 192.168.10.1でゲートウェイ到達を確認",
        isDone: state => state.device.cablePlugged && state.runtime.active && state.successes.has("ping:192.168.10.1")
      }
    ]
  },
  {
    id: "dns-broken",
    title: "中級: DNS設定不良",
    level: "中級",
    description: "IP通信は可能ですが、DNSサーバーの設定が誤っています。resolv.confとdigで切り分けます。",
    guide: {
      summary: "IP通信は成功するのに名前解決だけ失敗する状況を作り、DNS設定を直してから再反映します。",
      steps: [
        {
          id: "dns-isolate",
          phase: "切り分け",
          purpose: "IP疎通とDNS問い合わせの結果を比較する",
          commands: ["ping 192.168.10.1", "dig repo.lab.example"],
          expected: "ゲートウェイへのpingは成功し、digはDNSサーバーへ到達できず失敗する",
          isDone: state => state.successes.has("ping:192.168.10.1") && state.failures.has("dns")
        },
        {
          id: "dns-check-file",
          phase: "設定確認",
          purpose: "現在反映されているDNSサーバーをresolv.confで確認する",
          commands: ["cat /etc/resolv.conf"],
          expected: "nameserver がローカルDNS 192.168.10.53 ではなく、誤った 203.0.113.53 になっていることを見る",
          isDone: state => hasObservation(state, "cat:/etc/resolv.conf")
        },
        {
          id: "dns-fix-profile",
          phase: "変更",
          purpose: "NetworkManagerのプロファイル上のDNSサーバーをローカルDNSへ変更する",
          commands: ["nmcli connection modify ens160 ipv4.dns 192.168.10.53"],
          expected: "successfully modified と表示されるが、この時点ではまだランタイム未反映",
          isDone: state => state.profile.dns === DNS_SERVER
        },
        {
          id: "dns-apply-verify",
          phase: "反映と検証",
          purpose: "connection upで変更を反映し、名前解決が直ったことを確認する",
          commands: ["nmcli connection up ens160", "nslookup repo.lab.example"],
          expected: "反映後のDNSがローカルDNS 192.168.10.53になり、repo.lab.exampleのAddressが返る",
          isDone: state =>
            state.runtime.dns === DNS_SERVER &&
            state.successes.has("dns:repo.lab.example")
        }
      ]
    },
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
    title: "上級: DNS正常時の経路切り分け",
    level: "上級",
    description: "DNSは正常ですが、デフォルトゲートウェイが誤っているため外部サーバーに到達できません。",
    guide: {
      summary: "LAN内疎通、DNS応答、外部宛先への到達、経路表を順に確認し、原因がDNSではなくdefault gatewayであることを特定して修正します。",
      steps: [
        {
          id: "local-and-dns-check",
          phase: "切り分け",
          purpose: "LAN内疎通とDNS応答が正常か確認する",
          commands: ["ping 192.168.10.1", "dig repo.lab.example"],
          expected: "LAN内のpingは成功し、digはrepo.lab.exampleを198.51.100.20へ解決できる",
          isDone: state =>
            state.successes.has("ping:192.168.10.1") &&
            state.successes.has("dns:repo.lab.example")
        },
        {
          id: "external-route-fail",
          phase: "外部疎通確認",
          purpose: "名前解決後の外部宛先だけ失敗することを確認する",
          commands: ["ping repo.lab.example", "ping 198.51.100.20"],
          expected: "どちらも198.51.100.20宛てになり、Destination Net Unreachableで失敗する",
          isDone: state =>
            hasObservation(state, "ping:repo.lab.example") &&
            hasObservation(state, "ping:198.51.100.20") &&
            state.failures.has("route")
        },
        {
          id: "route-check",
          phase: "経路確認",
          purpose: "default gatewayの値を経路表で確認する",
          commands: ["ip route", "netstat -rn"],
          expected: "default gateway が誤った 192.168.10.254 になっていることを見る",
          isDone: state => hasAnyObservation(state, ["ip:route", "netstat:rn"])
        },
        {
          id: "route-fix-apply",
          phase: "変更と反映",
          purpose: "default gatewayを正しい値に変更し、ランタイムへ反映する",
          commands: [
            "nmcli connection modify ens160 ipv4.gateway 192.168.10.1",
            "nmcli connection up ens160",
            "ping repo.lab.example"
          ],
          expected: "反映後のGWが192.168.10.1になり、repo.lab.exampleへのpingが成功する",
          isDone: state =>
            state.runtime.gateway === GOOD_GATEWAY &&
            state.successes.has("ping:repo.lab.example")
        }
      ]
    },
    start: {
      deviceState: "connected",
      profile: {
        method: "manual",
        address: LAB_ADDRESS,
        gateway: "192.168.10.254",
        dns: DNS_SERVER,
        autoconnect: true
      },
      runtimeMatchesProfile: true
    },
    goals: [
      {
        id: "route-cut",
        text: "LAN内疎通とDNS成功、外部宛先失敗を比較",
        isDone: state =>
          state.successes.has("ping:192.168.10.1") &&
          state.successes.has("dns:repo.lab.example") &&
          state.failures.has("route")
      },
      {
        id: "route-see",
        text: "ip routeまたはnetstat -rnで誤ったdefault gatewayを確認",
        isDone: state => hasAnyObservation(state, ["ip:route", "netstat:rn"])
      },
      {
        id: "route-fix",
        text: "ipv4.gatewayを192.168.10.1へ修正してconnection up後、repo.lab.exampleへping成功",
        isDone: state =>
          state.runtime.gateway === GOOD_GATEWAY &&
          state.successes.has("ping:repo.lab.example")
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
  const cablePlugged = scenario.start.cablePlugged ?? true;
  const runtime = scenario.start.runtimeMatchesProfile && cablePlugged
    ? { ...profile, active: scenario.start.deviceState === "connected" }
    : { method: profile.method, address: "", gateway: "", dns: "", autoconnect: profile.autoconnect, active: false };

  return {
    scenarioId,
    device: {
      name: "ens160",
      type: "ethernet",
      state: scenario.start.deviceState,
      connection: runtime.active ? "ens160" : "--",
      cablePlugged,
      cableToggleable: scenario.start.cableToggleable ?? false
    },
    profile,
    runtime,
    hostname: "alma-lab01",
    nsswitchHosts: ["files", "dns"],
    hosts: { ...BASE_HOSTS, ...(scenario.start.hosts || {}) },
    commands: [],
    observations: new Set(),
    successes: new Set(),
    failures: new Set(),
    lastMessage: ""
  };
}

export function setCablePlugged(state, plugged) {
  if (!state.device.cableToggleable) return false;

  state.device.cablePlugged = Boolean(plugged);
  if (!state.device.cablePlugged) {
    deactivateConnection(state, "unavailable");
    markObservation(state, "cable:unplugged");
    return true;
  }

  markObservation(state, "cable:plugged");
  if (profileCanActivate(state)) {
    activateConnection(state);
  } else {
    deactivateConnection(state, "disconnected");
  }
  return true;
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

export function getExerciseGuide(stateOrId) {
  const scenarioId = typeof stateOrId === "string" ? stateOrId : stateOrId.scenarioId;
  const scenario = getScenario(scenarioId);
  return {
    scenarioId: scenario.id,
    title: scenario.title,
    summary: scenario.guide.summary,
    steps: scenario.guide.steps.map(step => ({
      id: step.id,
      phase: step.phase,
      purpose: step.purpose,
      commands: [...step.commands],
      expected: step.expected,
      done: typeof stateOrId === "string" ? false : step.isDone(stateOrId)
    }))
  };
}

export function getTopologyDetails(state) {
  const cablePlugged = state.device.cablePlugged;
  const active = networkReady(state);
  const dirty = !profileMatchesRuntime(state);
  const gatewayOk = active && state.runtime.gateway === GOOD_GATEWAY;
  const dnsOk = active && state.runtime.dns === DNS_SERVER;
  const linkDownStatus = cablePlugged ? "down" : "error";
  const gatewayStatus = !active ? linkDownStatus : gatewayOk ? "ok" : "error";
  const dnsStatus = !active ? linkDownStatus : dnsOk ? "ok" : "error";
  const endpointStatus = !active ? linkDownStatus : gatewayOk ? "ok" : "error";
  const publicDnsStatus = !active ? linkDownStatus : gatewayOk ? "ok" : "down";
  const linuxStatus = !cablePlugged ? "error" : !active ? "down" : dirty ? "pending" : "ok";

  return {
    overallStatus: !cablePlugged ? "attention" : !active ? "down" : !gatewayOk || !dnsOk ? "attention" : dirty ? "pending" : "ok",
    summary: topologySummary({ active, dirty, gatewayOk, dnsOk, cablePlugged }),
    nodes: [
      {
        id: "linux",
        title: "Linux端末",
        detail: `${state.hostname} / ${state.device.name}`,
        metric: active ? state.runtime.address : state.profile.address || "IP未設定",
        note: !cablePlugged ? "RJ-45にケーブルが刺さっていません" : active ? "現在の通信に使う端末" : "connection upで通信を開始",
        icon: TOPOLOGY_ICONS.linux,
        status: linuxStatus,
        statusLabel: statusLabel(linuxStatus),
        cable: {
          plugged: cablePlugged,
          toggleable: state.device.cableToggleable,
          label: `RJ-45: ${cablePlugged ? "接続済み" : "未挿入"}`
        }
      },
      {
        id: "switch",
        title: "スイッチ",
        detail: "同一LAN",
        metric: "192.168.10.0/24",
        note: active ? "LAN内の中継点" : cablePlugged ? "端末側のconnection起動待ち" : "端末側のケーブル接続待ち",
        icon: TOPOLOGY_ICONS.switch,
        status: active ? "ok" : linkDownStatus,
        statusLabel: statusLabel(active ? "ok" : linkDownStatus)
      },
      {
        id: "gateway",
        title: "ルーター / GW",
        detail: "default gateway",
        metric: state.runtime.gateway || state.profile.gateway || "未反映",
        note: gatewayOk ? "外部宛先への出口" : "正しいGWは192.168.10.1",
        icon: TOPOLOGY_ICONS.gateway,
        status: gatewayStatus,
        statusLabel: statusLabel(gatewayStatus)
      },
      {
        id: "localDns",
        title: "ローカルDNSサーバー",
        detail: "演習で指定するDNS",
        metric: state.runtime.dns || state.profile.dns || "未反映",
        note: dnsOk ? "現在のDNS問い合わせ先" : "正しい指定先は192.168.10.53",
        icon: TOPOLOGY_ICONS.dns,
        status: dnsStatus,
        statusLabel: statusLabel(dnsStatus)
      },
      {
        id: "internet",
        title: "インターネット",
        detail: "repo.lab.example",
        metric: DNS_RECORDS["repo.lab.example"],
        note: gatewayOk ? "GW経由で到達" : "GW修正後に到達可能",
        icon: TOPOLOGY_ICONS.internet,
        status: endpointStatus,
        statusLabel: statusLabel(endpointStatus)
      },
      {
        id: "publicDns",
        title: "パブリックDNSサーバー",
        detail: "インターネット側のDNS例",
        metric: PUBLIC_DNS_SERVER,
        note: "この演習では通常指定しない参照用DNS",
        icon: TOPOLOGY_ICONS.dns,
        status: publicDnsStatus,
        statusLabel: statusLabel(publicDnsStatus)
      }
    ],
    links: [
      {
        id: "linux-switch",
        from: "linux",
        to: "switch",
        label: !cablePlugged ? "RJ-45未挿入" : active ? "ens160 active" : "connection未起動",
        status: !cablePlugged ? "error" : active ? "ok" : "down",
        toggle: state.device.cableToggleable ? {
          enabled: state.device.cableToggleable,
          plugged: cablePlugged,
          onLabel: "ケーブル接続済み",
          offLabel: "ケーブル未挿入"
        } : null
      },
      {
        id: "switch-gateway",
        from: "switch",
        to: "gateway",
        label: gatewayOk ? "default route OK" : active ? "GW設定を確認" : "未接続",
        status: gatewayStatus
      },
      {
        id: "switch-local-dns",
        from: "switch",
        to: "localDns",
        label: dnsOk ? "local DNS OK" : active ? "ローカルDNSを指定" : "未接続",
        status: dnsStatus
      },
      {
        id: "gateway-internet",
        from: "gateway",
        to: "internet",
        label: gatewayOk ? "外部宛先へ到達" : active ? "外部宛先に届かない" : "未接続",
        status: endpointStatus
      },
      {
        id: "internet-public-dns",
        from: "internet",
        to: "publicDns",
        label: "public DNS",
        status: publicDnsStatus
      }
    ],
    notes: topologyNotes({ active, dirty, gatewayOk, dnsOk, cablePlugged })
  };
}

export function getStateSummary(state) {
  return [
    ["Device", `${state.device.name} (${state.device.state})`],
    ["RJ-45", state.device.cablePlugged ? "接続済み" : "未挿入"],
    ["Profile IP", state.profile.address || "未設定"],
    ["Active IP", state.runtime.address || "未反映"],
    ["Gateway", state.runtime.gateway || "未反映"],
    ["Local DNS", state.runtime.dns || "未反映"],
    ["反映状態", state.device.cablePlugged ? profileMatchesRuntime(state) ? "profile = runtime" : "connection upが必要" : "ケーブル接続が必要"]
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
    "/etc/resolv.conf": "現在の名前解決で参照するDNSサーバーです。このラボではローカルDNSサーバー 192.168.10.53 を基本の指定先にします。",
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

function topologySummary({ active, dirty, gatewayOk, dnsOk, cablePlugged }) {
  if (!cablePlugged) return "Linux端末のRJ-45にケーブルが刺さっていません。仮想ネットワーク図のトグルでケーブルを接続します。";
  if (!active) return "端末のconnectionが未起動です。nmcli connection up ens160で通信状態へ反映します。";
  if (!dnsOk) return "IP通信はできますが、ローカルDNSサーバーの参照先が誤っています。ipv4.dnsを確認します。";
  if (!gatewayOk) return "LAN内は見えますが、default gatewayが誤っているため外部宛先へ出られません。";
  if (dirty) return "プロファイル変更は保存済みですが、現在の通信にはまだ反映されていません。";
  return "端末、LAN、GW、ローカルDNS、外部宛先までの基本経路が成立しています。";
}

function topologyNotes({ active, dirty, gatewayOk, dnsOk, cablePlugged }) {
  const notes = [];
  if (!cablePlugged) {
    notes.push("nmcli device status と ip link で unavailable / NO-CARRIER を確認し、ケーブル未挿入を切り分けます。");
  }
  if (cablePlugged && !active) {
    notes.push("nmcli device status と nmcli connection show --active で未起動を確認します。");
  }
  if (active && !dnsOk) {
    notes.push("ping 192.168.10.1 が成功して dig が失敗する場合は、IP経路ではなくローカルDNS設定を疑います。");
  }
  if (active && !gatewayOk) {
    notes.push("ip route または netstat -rn で default gateway の値を確認します。");
  }
  if (cablePlugged && dirty) {
    notes.push("nmcli connection modify はプロファイル変更です。通信へ反映するには connection up が必要です。");
  }
  if (notes.length === 0) {
    notes.push("演習ではローカルDNS 192.168.10.53 を指定します。パブリックDNSはインターネット側の参照例です。");
  }
  return notes;
}

function statusLabel(status) {
  if (status === "ok") return "正常";
  if (status === "pending") return "未反映";
  if (status === "down") return "停止";
  if (status === "error") return "要確認";
  return "確認";
}

function getScenario(id) {
  const scenario = SCENARIOS.find(item => item.id === id);
  if (!scenario) return SCENARIOS[0];
  return scenario;
}

function markObservation(state, key) {
  state.observations.add(key);
}

function hasObservation(state, key) {
  return state.observations.has(key);
}

function hasAnyObservation(state, keys) {
  return keys.some(key => hasObservation(state, key));
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
    "ヒント: modifyはプロファイル変更、upは反映です。DNS指定は基本的にローカルDNS 192.168.10.53 を使います。"
  ].join("\n") + "\n";
}

function catFile(state, args) {
  if (args.length === 0) return "cat: missing file operand\n";
  const files = getVirtualFiles(state);
  const path = args[0];
  if (!files[path]) return `cat: ${path}: No such file or directory\n`;
  markObservation(state, `cat:${path}`);
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
  markObservation(state, "nmcli:device-status");
  return [
    "DEVICE  TYPE      STATE         CONNECTION",
    `${pad(state.device.name, 7)} ${pad(state.device.type, 9)} ${pad(state.device.state, 13)} ${networkReady(state) ? "ens160" : "--"}`
  ].join("\n") + "\n";
}

function nmcliConnectionShow(state, args) {
  if (args[0] === "--active") {
    markObservation(state, "nmcli:connection-show");
    markObservation(state, "nmcli:connection-show:active");
    if (!networkReady(state)) return "NAME  UUID  TYPE  DEVICE\n";
    return [
      "NAME    UUID                                  TYPE      DEVICE",
      "ens160  9c6b8fd8-8d6d-4d35-a8ab-10a5f7f0e160  ethernet  ens160"
    ].join("\n") + "\n";
  }
  if (args[0] && args[0] !== "ens160") {
    return `Error: unknown connection '${args[0]}'\n`;
  }
  if (args[0] === "ens160") {
    markObservation(state, "nmcli:connection-show");
    markObservation(state, "nmcli:connection-show:ens160");
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
  markObservation(state, "nmcli:connection-show");
  return [
    "NAME    UUID                                  TYPE      DEVICE",
    `ens160  9c6b8fd8-8d6d-4d35-a8ab-10a5f7f0e160  ethernet  ${networkReady(state) ? "ens160" : "--"}`
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

  markObservation(state, "nmcli:connection-modify");
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
  markObservation(state, "nmcli:connection-up:ens160");
  if (state.profile.method !== "manual" && state.profile.method !== "auto") {
    return `Error: unsupported ipv4.method '${state.profile.method}'\n`;
  }
  if (!state.device.cablePlugged) {
    state.failures.add("carrier");
    return "Error: Connection activation failed: No suitable device found for this connection (device ens160 not available because carrier is off)\n";
  }
  if (!profileCanActivate(state)) {
    state.failures.add("profile");
    return "Error: Connection activation failed: ipv4.addresses is required when ipv4.method is manual\n";
  }

  activateConnection(state);
  return [
    "Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/7)",
    `反映: IP=${state.runtime.address || "DHCP想定"} GW=${state.runtime.gateway || "--"} DNS=${state.runtime.dns || "--"}`
  ].join("\n") + "\n";
}

function ipCommand(state, args) {
  const normalized = args.join(" ");
  if (args[0] === "addr" || args[0] === "a" || normalized === "-4 addr" || normalized.startsWith("-4 addr show")) {
    markObservation(state, "ip:addr");
    return ipAddr(state);
  }
  if (args[0] === "route" || normalized === "r") {
    markObservation(state, "ip:route");
    return ipRoute(state);
  }
  if (args[0] === "link") {
    markObservation(state, "ip:link");
    const flags = interfaceFlags(state);
    const linkState = interfaceState(state);
    return [
      "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN mode DEFAULT group default qlen 1000",
      `2: ens160: <${flags}> mtu 1500 state ${linkState} mode DEFAULT group default qlen 1000`
    ].join("\n") + "\n";
  }
  return `ip: unsupported arguments '${args.join(" ")}'\n`;
}

function ipAddr(state) {
  const active = networkReady(state);
  const inet = active && state.runtime.address ? `    inet ${state.runtime.address} brd 192.168.10.255 scope global noprefixroute ens160\n` : "";
  const flags = interfaceFlags(state);
  const linkState = interfaceState(state);
  return [
    "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000",
    "    inet 127.0.0.1/8 scope host lo",
    `2: ens160: <${flags}> mtu 1500 qdisc fq_codel state ${linkState} group default qlen 1000`,
    inet.trimEnd()
  ].filter(Boolean).join("\n") + "\n";
}

function ipRoute(state) {
  if (!networkReady(state) || !state.runtime.address) return "";
  const lines = [];
  if (state.runtime.gateway) lines.push(`default via ${state.runtime.gateway} dev ens160 proto static metric 100`);
  lines.push("192.168.10.0/24 dev ens160 proto kernel scope link src 192.168.10.50 metric 100");
  return lines.join("\n") + "\n";
}

function pingCommand(state, args) {
  const target = args.find(arg => !arg.startsWith("-"));
  if (!target) return "ping: usage error: Destination address required\n";
  markObservation(state, `ping:${target}`);
  if (!networkReady(state)) {
    state.failures.add(state.device.cablePlugged ? "ping" : "carrier");
    return "ping: connect: Network is unreachable\n";
  }

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
  markObservation(state, `dig:${target}`);
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
  markObservation(state, `nslookup:${target}`);
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
    markObservation(state, "netstat:rn");
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
    markObservation(state, "netstat:tuln");
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
  if (!networkReady(state) || !state.runtime.dns || state.runtime.dns !== DNS_SERVER) {
    return { ok: false };
  }
  const ip = DNS_RECORDS[target];
  return ip ? { ok: true, ip } : { ok: false };
}

function routeTo(state, ip) {
  if (!networkReady(state) || !state.runtime.address) return { ok: false };
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
  if (!networkReady(state) || !state.runtime.dns) {
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
  return networkReady(state) &&
    state.profile.address === state.runtime.address &&
    state.profile.gateway === state.runtime.gateway &&
    state.profile.dns === state.runtime.dns &&
    state.profile.method === state.runtime.method;
}

function networkReady(state) {
  return state.device.cablePlugged && state.runtime.active;
}

function profileCanActivate(state) {
  return state.profile.method !== "manual" || Boolean(state.profile.address);
}

function activateConnection(state) {
  state.runtime = { ...state.profile, active: true };
  state.device.state = "connected";
  state.device.connection = "ens160";
}

function deactivateConnection(state, deviceState = "disconnected") {
  state.runtime = {
    method: state.profile.method,
    address: "",
    gateway: "",
    dns: "",
    autoconnect: state.profile.autoconnect,
    active: false
  };
  state.device.state = deviceState;
  state.device.connection = "--";
}

function interfaceFlags(state) {
  if (!state.device.cablePlugged) return "NO-CARRIER,BROADCAST,MULTICAST,DOWN";
  if (networkReady(state)) return "BROADCAST,MULTICAST,UP,LOWER_UP";
  return "BROADCAST,MULTICAST,DOWN";
}

function interfaceState(state) {
  if (!state.device.cablePlugged) return "DOWN";
  return networkReady(state) ? "UP" : "DOWN";
}

function isIPv4(value) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}
