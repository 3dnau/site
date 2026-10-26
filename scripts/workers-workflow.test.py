import json
import os
import tempfile
import importlib.util
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import unittest


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


gate = load('workers-publish-gate').deployment_allowed
snapshot = load('workers-release-snapshot').validate_snapshot


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.env = dict(GITHUB_REPOSITORY='3dnau/site', GITHUB_SHA='a' * 40,
                        GITHUB_REF='refs/heads/main', GITHUB_EVENT_NAME='repository_dispatch',
                        GITHUB_ACTOR_ID='123', WORKERS_PUBLISH_ACTOR_IDS='123,456')
        self.event = dict(repository=dict(full_name='3dnau/site', default_branch='main'),
                          action='sveltia-cms-publish', sender=dict(type='User', id=123))

    def test_publish_empty_payload(self):
        self.assertTrue(gate(self.event, self.env))
        self.event['client_payload'] = {}
        self.assertTrue(gate(self.event, self.env))

    def test_push_never_deploys(self):
        self.env['GITHUB_EVENT_NAME'] = 'push'
        for ref in ('main', 'feat/workers-free-local'):
            self.env['GITHUB_REF'] = 'refs/heads/' + ref
            self.assertFalse(gate(self.event, self.env))

    def test_manual_default_false_explicit_main_true(self):
        self.env['GITHUB_EVENT_NAME'] = 'workflow_dispatch'
        self.assertFalse(gate(self.event, self.env))
        self.event['inputs'] = {'deploy': 'true'}
        self.assertTrue(gate(self.event, self.env))
        self.env['GITHUB_REF'] = 'refs/heads/feature'
        with self.assertRaises(ValueError):
            gate(self.event, self.env)

    def test_fail_closed_event_base_identity(self):
        mutations = [('GITHUB_REPOSITORY', 'other/site'), ('GITHUB_SHA', 'main'),
                     ('GITHUB_REF', 'refs/heads/feature'), ('GITHUB_EVENT_NAME', 'pull_request_target'),
                     ('GITHUB_ACTOR_ID', '456'), ('WORKERS_PUBLISH_ACTOR_IDS', ''),
                     ('WORKERS_PUBLISH_ACTOR_IDS', '123,')]
        for key, value in mutations:
            with self.subTest(key=key), self.assertRaises(ValueError):
                gate(self.event, dict(self.env, **{key: value}))
        for key, value in [('action', 'publish'), ('repository', {'full_name': '3dnau/site', 'default_branch': 'other'}),
                           ('sender', {'type': 'Bot', 'id': 123}), ('sender', {'type': 'User', 'id': 999})]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                gate(dict(self.event, **{key: value}), self.env)

    def test_payload_injection_rejected(self):
        for payload in ({'ref': 'main'}, {'sha': 'a' * 40}, {'command': '$(touch /bad)'}, None, [], 'main'):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                gate(dict(self.event, client_payload=payload), self.env)

    def test_unreviewed_versions_and_checkout_rejected(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR', os.environ.get('RUNNER_TEMP'))) as directory:
            root = Path(directory)
            for base in (root, root / 'themes/sansoul'):
                base.mkdir(parents=True, exist_ok=True)
                (base / 'package.json').write_text(json.dumps({'version': '8.0.0'}))
                (base / 'package-lock.json').write_text(json.dumps({'version': '8.0.0', 'packages': {'': {'version': '8.0.0'}}}))
            config = root / 'wrangler.workers.toml'
            config.write_text('[vars]\nCOMMERCE_CHECKOUT_APPROVED = "false"\n')
            snapshot(root, 'a', 'a', 'a')
            config.write_text('[vars]\nCOMMERCE_CHECKOUT_APPROVED = "true"\n')
            with self.assertRaises(ValueError):
                snapshot(root, 'a', 'a', 'a')
            config.write_text('[vars]\nCOMMERCE_CHECKOUT_APPROVED = "false"\n')
            (root / 'themes/sansoul/package.json').write_text('{"version":"7.3.1"}')
            with self.assertRaises(ValueError):
                snapshot(root, 'a', 'a', 'a')

    def test_snapshot_versions_checkout_and_races(self):
        root = Path('.')
        snapshot(root, 'a' * 40, 'a' * 40, 'a' * 40)
        for actual, remote in [('b' * 40, 'a' * 40), ('a' * 40, 'b' * 40)]:
            with self.assertRaises(ValueError):
                snapshot(root, 'a' * 40, actual, remote)


if __name__ == '__main__':
    unittest.main(verbosity=2)
