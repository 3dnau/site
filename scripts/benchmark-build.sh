#!/bin/sh
set -eu
# Isolated benchmark; use the same pinned source and build command on both hosts.
export HUGO_CACHEDIR="$PWD/.cache"
test "$(node --version)" = v22.22.0
hugo version | grep 'v0.164.0-.*+extended'
grep '^checkout_approved: false$' data/commerce.yml
npm ci --no-audit --no-fund
sh do hugo
node --input-type=module -e '
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const sha = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const marker = { commit: sha, sample: fs.readFileSync("benchmark-sample.txt", "utf8").trim(), baseline: "7f958c3f4697c2ee025e8a4a434313cefc357229", theme: "2d67580022f858de76d56065d5ca64db5fcd1aa4", node: process.version, hugo: "0.164.0", checkout_approved: false };
fs.writeFileSync("public/benchmark-marker.json", JSON.stringify(marker) + "\n");
'
