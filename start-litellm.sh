#!/usr/bin/env bash
# Start LiteLLM proxy with .env loaded on port 4000.
# Usage: ./start-litellm.sh   (or: bash start-litellm.sh)

cd "$(dirname "$0")"
set -a
[ -f .env ] && . ./.env
set +a
# Force port 4000 (uvorn/LiteLLM may otherwise use PORT from environment)
export PORT=4000
exec env PORT=4000 .venv/bin/litellm --config config.yaml --port 4000
