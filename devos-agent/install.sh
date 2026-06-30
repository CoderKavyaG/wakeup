#!/bin/bash
# DevOS Local Agent Installation Script (macOS/Linux)
set -e

AGENT_DIR="$HOME/.devos-agent"
mkdir -p "$AGENT_DIR/certs"

echo -e "\033[0;36m📥 Downloading DevOS Agent components...\033[0m"

BASE_URL="https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent"

curl -fsSL "$BASE_URL/index.js" -o "$AGENT_DIR/index.js"
curl -fsSL "$BASE_URL/picker.ps1" -o "$AGENT_DIR/picker.ps1"
curl -fsSL "$BASE_URL/certs/local.key" -o "$AGENT_DIR/certs/local.key"
curl -fsSL "$BASE_URL/certs/local.crt" -o "$AGENT_DIR/certs/local.crt"

# Create package.json
cat <<EOF > "$AGENT_DIR/package.json"
{
  "name": "devos-agent",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "ws": "^8.17.0"
  }
}
EOF

echo -e "\033[0;36m📦 Installing dependencies (express, cors, ws)...\033[0m"
cd "$AGENT_DIR"
npm install --no-audit --no-fund

echo -e "\033[0;32m⚡ Starting DevOS secure loopback agent...\033[0m"
node "$AGENT_DIR/index.js"
