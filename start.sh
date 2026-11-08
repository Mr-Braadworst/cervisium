#!/usr/bin/env sh
# ==============================================================================
# Cervisium / BierLog — 1-Commando All-in-One Docker Container Setup
# Alles (bouwen, sleutels genereren, PostgreSQL database én website) gebeurt
# 100% BINNENIN die ene Docker-container!
# ==============================================================================

set -e

if [ -d ".git" ] && git remote get-url origin >/dev/null 2>&1; then
  git pull --ff-only 2>/dev/null || true
fi

if docker compose version >/dev/null 2>&1; then
  docker rm -f cervisium bierlog 2>/dev/null || true
  docker compose up -d --build
else
  docker build -t cervisium .
  docker rm -f cervisium bierlog 2>/dev/null || true
  docker run -d --name cervisium --restart unless-stopped -p 3000:3000 -v bierlog_data:/data cervisium
fi

echo "✅ Cervisium draait nu (inclusief eigen database & auto-update) in 1 Docker-container op http://localhost:3000"
