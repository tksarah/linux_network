---
name: linux-cli-lab-builder
description: Build or extend static browser-based Linux CLI learning simulators for GitHub Pages, including AlmaLinux/RHEL-style networking labs, service checks, filesystem permissions, package management, systemd, log investigation, progressive troubleshooting exercises, and classroom-oriented Japanese UI.
---

# Linux CLI Lab Builder

## Workflow

Use this skill when asked to create a Linux practice app, CLI simulator, GitHub Pages lab, or classroom exercise. Prefer it for networking labs, and adapt the same pattern for future Linux-related command simulators.

1. Confirm the target learners, distribution, commands, files, and troubleshooting scenarios.
2. Build a static app first: HTML, CSS, and browser JavaScript with no server dependency and no real host mutation.
3. Model virtual machine state explicitly: persistent configuration, active runtime state, command history, check results, and exercise goals.
4. Provide a terminal-like UI plus visible state panels, file explainers, and scenario goals. Avoid landing pages; make the simulator usable on first load.
5. Verify with command-engine tests and browser checks at desktop and mobile widths.

## Simulator Requirements

For an AlmaLinux/RHEL NetworkManager lab, implement these commands at minimum:

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

For other Linux lab topics, keep the same architecture: fake the command surface faithfully, keep state transitions explicit, and show the files or service state that explain the behavior.

## Exercise Design

Create three progressive troubleshooting scenarios unless the user asks otherwise:

- Level 1: connection or device is down. Learners identify it with `nmcli` and restore it with `nmcli connection up`.
- Level 2: IP connectivity works but DNS is wrong. Learners compare `ping <gateway>` with `dig`/`nslookup`, fix `ipv4.dns`, then reapply.
- Level 3: route and name-resolution order interact. Learners inspect `ip route` or `netstat -rn`, compare `dig` with `ping`, and read `nsswitch.conf` plus `hosts`.

Track success with observable state and command history, not hidden free-text answers.

## Delivery

Keep the repository copy as the source of truth. When the user wants local reuse, install the same skill folder under the active Codex skills directory, normally `%USERPROFILE%\.codex\skills\linux-cli-lab-builder` on Windows.

## References

Read `references/linux-cli-lab-patterns.md` when designing command outputs, virtual files, exercise scenarios, validation, and GitHub Pages deployment details.
