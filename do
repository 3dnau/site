#!/bin/sh
set -eu

# Resolve the consumer root before selecting the current or legacy engine.
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$PROJECT_DIR"
if [ -f ./core/do ]; then
  exec sh ./core/do "$@"
elif [ -f ./themes/sansoul/do ]; then
  exec sh ./themes/sansoul/do "$@"
fi
printf '%s\n' 'SanSoul is not initialized. Run git submodule update --init --recursive.' >&2
exit 2
