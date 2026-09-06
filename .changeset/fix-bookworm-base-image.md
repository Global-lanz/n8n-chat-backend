---
"chat-n8n-backend": patch
---

Troca a imagem base do Dockerfile de `node:20-bullseye-slim` para `node:20-bookworm-slim` (build e produção) — o build estava falhando no `apt-get install` por pacotes do `bullseye-security` (Debian 11) que já saíram do pool do mirror (404 em `libperl5.32`, `xz-utils`, `linux-libc-dev`).

A imagem `-slim` não vem com `openssl` instalado, e o engine do Prisma precisa da lib em tempo de execução — sem ela o container caía com "Prisma failed to detect the libssl/openssl version" seguido de `Schema engine error` no `prisma db push` do boot. Instala `openssl` explicitamente nas duas etapas do Dockerfile.
