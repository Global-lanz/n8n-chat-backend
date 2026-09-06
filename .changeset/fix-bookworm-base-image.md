---
"chat-n8n-backend": patch
---

Troca a imagem base do Dockerfile de `node:20-bullseye-slim` para `node:20-bookworm-slim` (build e produção) — o build estava falhando no `apt-get install` por pacotes do `bullseye-security` (Debian 11) que já saíram do pool do mirror (404 em `libperl5.32`, `xz-utils`, `linux-libc-dev`).
