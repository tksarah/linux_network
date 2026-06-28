# Linux CLI Lab Simulator Patterns

## Use Cases

Use this reference to build classroom simulators for Linux CLI practice: service checks, filesystem permissions, package management, systemd, log investigation, networking, or similar shell-based workflows. Treat the NetworkManager material below as a reusable example pattern, not as the only supported lab type.

## Static App Pattern

- Use GitHub Pages-compatible static files only.
- Keep domain logic in a testable JavaScript module that does not touch the DOM.
- Keep UI wiring in a separate module.
- Store all virtual lab state in plain objects so reset, scenario switching, and tests are simple.
- Do not execute real `nmcli`, `ip`, `ping`, DNS, or route commands from the browser.
- Prefer one command-engine module plus a separate DOM module. Tests should import the command engine directly.
- Make the first screen the actual simulator, not a marketing or explanation page.

## State Model Pattern

Recommended fields for NetworkManager-style labs:

- `device`: name, type, state, active connection.
- `profile`: NetworkManager profile values such as method, address, gateway, DNS, autoconnect.
- `runtime`: currently applied values used by `ip route`, `/etc/resolv.conf`, `ping`, `dig`, and `nslookup`.
- `hosts`: host-to-address map for `/etc/hosts`.
- `nsswitchHosts`: usually `["files", "dns"]`.
- `dnsRecords`: lab DNS answers.
- `commands`, `successes`, `failures`: exercise progress.

The key teaching rule: `nmcli connection modify` changes `profile`; `nmcli connection up` copies `profile` into `runtime`.

For non-network labs, keep the same split: persistent config versus active behavior. Examples: a systemd unit file versus active service state, package repository config versus installed package state, or file mode bits versus command authorization results.

## Network Command Behavior Example

- `nmcli device status`: show `DEVICE TYPE STATE CONNECTION`.
- `nmcli connection show`: show name, UUID, type, and active device.
- `nmcli connection show ens160`: show detailed profile values.
- `nmcli connection modify`: update profile only and tell learners to run `nmcli connection up`.
- `nmcli connection up`: apply profile to runtime state and update generated files.
- `ip addr`: show loopback and `ens160`; omit `inet` for `ens160` when the connection is inactive.
- `ip route`: show no route when inactive; otherwise show connected route and default gateway if configured.
- `dig` and `nslookup`: use DNS only and ignore `/etc/hosts`.
- `ping`: resolve names using `nsswitch.conf` order, so `files dns` makes `/etc/hosts` override DNS.
- `netstat -rn`: mirror the active route table in legacy format.
- Unknown commands should return a realistic shell-style error plus a hint to use `help`.

## Network Virtual Files Example

`*.nmconnection` should reflect profile state. `/etc/resolv.conf` should reflect runtime DNS after activation. `/etc/nsswitch.conf` and `/etc/hosts` should support a lesson where `dig` and `ping` disagree because they use different resolution paths.

Show file meaning in the UI, but do not require learners to edit these files unless the user explicitly asks for file-editing practice. For this lab family, editing is taught through command-driven state changes.

## Troubleshooting Scenario Pattern

- Start with one broken condition and one obvious confirmation path.
- Add a second scenario where low-level connectivity succeeds but a higher-level function fails.
- End with a mixed scenario where two tools appear to disagree, forcing learners to inspect configuration and command semantics.
- Mark completion from actual virtual state and command history, not free-text answers.

## Deployment Checks

- Add `.nojekyll` for predictable GitHub Pages static serving.
- Use `main` branch and `/` root publishing source unless the user requests another source.
- Include a no-install test path such as `npm.cmd test` or `node tests/...`.
- If local Python is unavailable on Windows, provide a small Node static server instead of relying on `python -m http.server`.
- On Windows, use `npm.cmd` instead of `npm` when PowerShell execution policy blocks `npm.ps1`.
- If WSL is unavailable from Codex, use Windows `git` and `gh`. Verify `git status --short --branch`, commit intentionally, push `main`, then enable Pages with `gh api` if authenticated.
- If `gh auth status` fails, tell the user clearly that Pages activation needs re-authentication before the API call can work.

## Acceptance Checks

- Command-engine tests cover at least the happy path plus each troubleshooting scenario.
- Browser verification covers desktop and mobile widths and confirms the terminal input is usable.
- The app can be served as static files from the repository root.
- Skill copies installed under `%USERPROFILE%\.codex\skills` must include `SKILL.md`, `agents/openai.yaml`, and referenced files.
