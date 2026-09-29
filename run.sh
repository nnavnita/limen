#!/usr/bin/env bash
# Start the office. No dependencies beyond python3.
cd "$(dirname "$0")" && exec python3 -m limen.server "$@"
