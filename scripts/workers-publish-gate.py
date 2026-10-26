"""Fail-closed Actions event gate; payload never selects code, commands or refs."""
import json
import os
import re
from pathlib import Path


def deployment_allowed(event, env):
    if env.get('GITHUB_REPOSITORY') != '3dnau/site':
        raise ValueError('Unexpected repository')
    repo = event.get('repository', {})
    if repo.get('full_name') != '3dnau/site' or repo.get('default_branch') != 'main':
        raise ValueError('Unexpected event repository/default branch')
    if not re.fullmatch(r'[0-9a-f]{40}', env.get('GITHUB_SHA', '')):
        raise ValueError('Invalid event SHA')
    name = env.get('GITHUB_EVENT_NAME')
    ref = env.get('GITHUB_REF')
    if name == 'push':
        if ref not in ('refs/heads/main', 'refs/heads/feat/workers-free-local'):
            raise ValueError('Unexpected push branch')
        return False
    if name == 'workflow_dispatch':
        value = event.get('inputs', {}).get('deploy', 'false')
        if value not in ('true', 'false', True, False):
            raise ValueError('Invalid deploy input')
        requested = value in ('true', True)
        if requested and ref != 'refs/heads/main':
            raise ValueError('Deploy requires main')
        return requested
    if name != 'repository_dispatch' or event.get('action') != 'sveltia-cms-publish':
        raise ValueError('Unexpected event/action')
    if ref != 'refs/heads/main' or event.get('client_payload', {}) != {}:
        raise ValueError('Publish requires main and empty upstream payload')
    sender = event.get('sender', {})
    ids = env.get('WORKERS_PUBLISH_ACTOR_IDS', '').split(',')
    if not ids or any(not re.fullmatch(r'[1-9][0-9]*', value) for value in ids):
        raise ValueError('Missing/invalid reviewed publisher ID allowlist')
    if (sender.get('type') != 'User' or type(sender.get('id')) is not int
            or str(sender['id']) not in ids
            or str(sender['id']) != env.get('GITHUB_ACTOR_ID')):
        raise ValueError('Unapproved authenticated sender')
    return True


if __name__ == '__main__':
    allowed = deployment_allowed(json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text()), os.environ)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'deploy_allowed={str(allowed).lower()}\n')
