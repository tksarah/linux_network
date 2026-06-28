# Linux Network Lab

AlmaLinux/RHEL系のネットワーク設定をGitHub Pages上で体験するためのブラウザ内CLIシミュレーターです。

## 学べること

- `nmcli device status` と `nmcli connection show` による状態確認
- `nmcli connection modify` と `nmcli connection up` によるIP設定変更とリンクアップ
- `/etc/NetworkManager/system-connections/*.nmconnection`、`/etc/resolv.conf`、`/etc/nsswitch.conf`、`/etc/hostname`、`/etc/hosts` の意味
- `ip`、`nslookup`、`dig`、`ping`、`netstat` による通信確認
- IP未設定、RJ-45ケーブル未挿入、DNS設定不良、DNS正常時の経路不良の切り分け

## ローカル確認

```powershell
npm.cmd test
npm.cmd run serve
```

その後、`http://127.0.0.1:8000/` を開きます。

## GitHub Pages

静的ファイルだけで動くため、GitHub Pagesの公開元は `main` ブランチの `/` を指定します。
