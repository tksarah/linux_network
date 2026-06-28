# AlmaLinux Network Lab Reference

## Static App Pattern

- Use GitHub Pages-compatible static files only.
- Keep domain logic in a testable JavaScript module that does not touch the DOM.
- Keep UI wiring in a separate module.
- Store all virtual lab state in plain objects so reset, scenario switching, and tests are simple.
- Do not execute real `nmcli`, `ip`, `ping`, DNS, or route commands from the browser.

## State Model

Recommended state fields:

- `device`: name, type, state, active connection.
- `profile`: NetworkManager profile values such as method, address, gateway, DNS, autoconnect.
- `runtime`: currently applied values used by `ip route`, `/etc/resolv.conf`, `ping`, `dig`, and `nslookup`.
- `hosts`: host-to-address map for `/etc/hosts`.
- `nsswitchHosts`: usually `["files", "dns"]`.
- `dnsRecords`: lab DNS answers.
- `commands`, `successes`, `failures`: exercise progress.

The key teaching rule: `nmcli connection modify` changes `profile`; `nmcli connection up` copies `profile` into `runtime`.

## Command Behavior

- `nmcli device status`: show `DEVICE TYPE STATE CONNECTION`.
- `nmcli connection show`: show name, UUID, type, and active device.
- `nmcli connection show ens160`: show detailed profile values.
- `ip addr`: show loopback and `ens160`; omit `inet` for `ens160` when the connection is inactive.
- `ip route`: show no route when inactive; otherwise show connected route and default gateway if configured.
- `dig` and `nslookup`: use DNS only and ignore `/etc/hosts`.
- `ping`: resolve names using `nsswitch.conf` order, so `files dns` makes `/etc/hosts` override DNS.
- `netstat -rn`: mirror the active route table in legacy format.

## Virtual Files

`*.nmconnection` should reflect profile state. `/etc/resolv.conf` should reflect runtime DNS after activation. `/etc/nsswitch.conf` and `/etc/hosts` should support a lesson where `dig` and `ping` disagree because they use different resolution paths.

## Deployment Checks

- Add `.nojekyll` for predictable GitHub Pages static serving.
- Use `main` branch and `/` root publishing source unless the user requests another source.
- Include a no-install test path such as `npm.cmd test` or `node tests/...`.
- If local Python is unavailable on Windows, provide a small Node static server instead of relying on `python -m http.server`.
