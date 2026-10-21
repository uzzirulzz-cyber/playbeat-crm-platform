#!/usr/bin/env bash
set -euo pipefail

# Review-branch build entrypoint. Never changes the database schema.
# Requires project dependencies and environment configuration in isolated CI.
./node_modules/.bin/prisma generate
./node_modules/.bin/next build
