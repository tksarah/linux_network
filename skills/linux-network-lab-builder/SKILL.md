---
name: linux-network-lab-builder
description: Build or extend static browser-based Linux networking learning simulators for GitHub Pages, especially AlmaLinux/RHEL-style NetworkManager labs with nmcli, ip, ping, dig, nslookup, netstat, configuration-file inspection, progressive troubleshooting exercises, and reusable classroom-oriented Japanese UI.
---

# Linux Network Lab Builder

## Workflow

Use this skill when asked to create a Linux networking practice app, CLI simulator, GitHub Pages lab, or classroom exercise for AlmaLinux/RHEL network configuration.

1. Build a static app first: HTML, CSS, and browser JavaScript with no server dependency and no real host network mutation.
2. Model virtual machine state explicitly: NetworkManager profile settings, active runtime settings, device status, route table, resolver state, hosts file, DNS records, command history, and exercise goals.
3. Make `nmcli connection modify` update the profile and make `nmcli connection up` apply that profile to runtime state. This distinction is essential for teaching config files versus active communication.
4. Provide a terminal-like UI plus visible state panels, file explainers, and scenario goals. Avoid landing pages; make the simulator usable on first load.
5. Verify with command-engine tests and browser checks at desktop and mobile widths.

## Simulator Requirements

Implement these commands at minimum:

- `nmcli device status`
- `nmcli connection show`, `nmcli connection show --active`, `nmcli connection show <id>`
- `nmcli connection modify <id> ipv4.addresses ... ipv4.gateway ... ipv4.dns ... ipv4.method ... connection.autoconnect ...`
- `nmcli connection up <id>`
- `cat`, limited to the educational files
- `ip addr`, `ip route`, `ip link`
- `ping`, `dig`, `nslookup`
- `netstat -rn`, `netstat -tuln`

Expose these virtual files through `cat` and UI explanation:

- `/etc/NetworkManager/system-connections/*.nmconnection`
- `/etc/resolv.conf`
- `/etc/nsswitch.conf`
- `/etc/hostname`
- `/etc/hosts`

Use AlmaLinux/RHEL-like wording and command output, but keep outputs concise enough for students to scan.

## Exercise Design

Create three progressive troubleshooting scenarios unless the user asks otherwise:

- Level 1: connection or device is down. Learners identify it with `nmcli` and restore it with `nmcli connection up`.
- Level 2: IP connectivity works but DNS is wrong. Learners compare `ping <gateway>` with `dig`/`nslookup`, fix `ipv4.dns`, then reapply.
- Level 3: route and name-resolution order interact. Learners inspect `ip route` or `netstat -rn`, compare `dig` with `ping`, and read `nsswitch.conf` plus `hosts`.

Track success with observable state and command history, not hidden free-text answers.

## References

Read `references/almalinux-network-lab.md` when designing command outputs, virtual files, exercise scenarios, and GitHub Pages deployment details.
