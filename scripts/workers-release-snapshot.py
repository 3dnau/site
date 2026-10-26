"""Validate the exact CI-tested revision; never follow an advanced main silently."""
import json
import os
import subprocess
import tomllib
from pathlib import Path


def validate_snapshot(root, expected, actual, remote):
    if expected != actual or expected != remote:
        raise ValueError('Main advanced or checkout differs: rerun full verification')
    for base in (root, root / 'themes/sansoul'):
        package = json.loads((base / 'package.json').read_text())
        lock = json.loads((base / 'package-lock.json').read_text())
        if not (package['version'] == lock['version'] == lock['packages']['']['version'] == '8.0.0'):
            raise ValueError('Unreviewed package/lock version')
    config = tomllib.loads((root / 'wrangler.workers.toml').read_text())
    if config.get('vars', {}).get('COMMERCE_CHECKOUT_APPROVED') != 'false':
        raise ValueError('Checkout must remain disabled')


if __name__ == '__main__':
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    remote = subprocess.check_output(['gh', 'api', 'repos/3dnau/site/git/ref/heads/main', '--jq', '.object.sha'], text=True).strip()
    validate_snapshot(Path('.'), os.environ['GITHUB_SHA'], actual, remote)
