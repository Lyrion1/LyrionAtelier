// The scheduled and deploy workflows skip cleanly when a secret is missing.
//   node --test tests/ci-scripts.test.mjs
// Each script runs exactly as the workflow runs it, with stand-in `curl` and
// `supabase` commands first on PATH that record how they were called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function stubs({ curlStatus = '200', secrets = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ci-stubs-'));
  const log = path.join(dir, 'calls.log');
  writeFileSync(path.join(dir, 'curl'), `#!/usr/bin/env bash
echo "curl $*" >> "${log}"
out=""; while [ $# -gt 0 ]; do [ "$1" = "-o" ] && out="$2"; shift; done
[ -n "$out" ] && echo '{"heartbeat":true}' > "$out"
printf '%s' "${curlStatus}"
`);
  writeFileSync(path.join(dir, 'supabase'), `#!/usr/bin/env bash
echo "supabase $*" >> "${log}"
if [ "$1 $2" = "secrets list" ]; then
  echo "  NAME | DIGEST"
  echo "  -----|-------"
  for n in ${secrets.join(' ')}; do echo "  $n | 0123abcd"; done
fi
`);
  chmodSync(path.join(dir, 'curl'), 0o755);
  chmodSync(path.join(dir, 'supabase'), 0o755);
  return { dir, calls: () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : []) };
}

function run(script, env, stub) {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(HOUSE_|SUPABASE_|PRINTFUL_)/.test(k)));
  const r = spawnSync(script, [], {
    cwd: ROOT,
    env: { ...clean, ...env, PATH: `${stub.dir}:${process.env.PATH}` },
    encoding: 'utf8',
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const ALL_FUNCTION_SECRETS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PRINTFUL_API_KEY', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'MAIL_FROM', 'APPROVAL_SECRET', 'HOUSE_CRON_KEY'];

test('keep-alive and sweep: no HOUSE_CRON_KEY skips cleanly without calling Supabase', () => {
  const s = stubs();
  const r = run('scripts/ci/house-sweep.sh', {}, s);
  assert.equal(r.code, 0);
  assert.match(r.out, /::notice::Skipped: HOUSE_CRON_KEY is not set/);
  assert.deepEqual(s.calls(), []);
});

test('keep-alive and sweep: function not deployed yet skips cleanly', () => {
  const s = stubs({ curlStatus: '404' });
  const r = run('scripts/ci/house-sweep.sh', { HOUSE_CRON_KEY: 'k' }, s);
  assert.equal(r.code, 0);
  assert.match(r.out, /not deployed yet/);
});

test('keep-alive and sweep: runs when set up, and a wrong key is reported as an error', () => {
  const ok = stubs({ curlStatus: '200' });
  assert.equal(run('scripts/ci/house-sweep.sh', { HOUSE_CRON_KEY: 'k' }, ok).code, 0);
  assert.equal(ok.calls().length, 1);
  const wrong = stubs({ curlStatus: '403' });
  const r = run('scripts/ci/house-sweep.sh', { HOUSE_CRON_KEY: 'k' }, wrong);
  assert.equal(r.code, 1);
  assert.match(r.out, /must match/);
});

test('deploy: no GitHub secrets skips cleanly and touches nothing', () => {
  const s = stubs();
  const r = run('scripts/ci/deploy-supabase.sh', {}, s);
  assert.equal(r.code, 0);
  assert.match(r.out, /::notice::Skipped: GitHub secret\(s\) not set: SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD/);
  assert.match(r.out, /checkout already live keeps running unchanged/);
  assert.deepEqual(s.calls(), []);
});

test('deploy: a missing function secret skips cleanly, naming it, and deploys nothing', () => {
  const s = stubs({ secrets: ALL_FUNCTION_SECRETS.filter((n) => n !== 'RESEND_API_KEY' && n !== 'APPROVAL_SECRET') });
  const r = run('scripts/ci/deploy-supabase.sh', { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_DB_PASSWORD: 'p' }, s);
  assert.equal(r.code, 0);
  assert.match(r.out, /Supabase function secret\(s\) not set: RESEND_API_KEY APPROVAL_SECRET/);
  assert.deepEqual(s.calls(), ['supabase secrets list --project-ref zqomzteaeiqtnipkgyuo']);
  assert.doesNotMatch(r.out, /p\b.*password/i);
});

test('deploy: with everything set, migrations go first, then all six functions', () => {
  const s = stubs({ secrets: ALL_FUNCTION_SECRETS });
  const r = run('scripts/ci/deploy-supabase.sh', { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_DB_PASSWORD: 'p' }, s);
  assert.equal(r.code, 0, r.out);
  const calls = s.calls().map((c) => c.split(' ').slice(0, 3).join(' '));
  assert.deepEqual(calls, [
    'supabase secrets list',
    'supabase link --project-ref',
    'supabase db push',
    'supabase functions deploy',
    'supabase functions deploy',
    'supabase functions deploy',
    'supabase functions deploy',
    'supabase functions deploy',
    'supabase functions deploy',
  ]);
});

test('Printful snapshot and design intake: no PRINTFUL_API_KEY skips cleanly and writes nothing', () => {
  const s = stubs();
  const sync = run('scripts/sync-printful.js', {}, s);
  assert.equal(sync.code, 0);
  assert.match(sync.out, /Skipped: PRINTFUL_API_KEY is not set/);
  assert.equal(existsSync(path.join(ROOT, 'data', 'printful-sync.json')), false);
  const before = readFileSync(path.join(ROOT, 'data', 'catalogue.json'), 'utf8');
  const intake = spawnSync('node', ['scripts/design-intake.mjs'], { cwd: ROOT, env: { ...process.env, PRINTFUL_API_KEY: '' }, encoding: 'utf8' });
  assert.equal(intake.status, 0, intake.stderr);
  assert.equal(readFileSync(path.join(ROOT, 'data', 'catalogue.json'), 'utf8'), before);
  assert.equal(existsSync(path.join(ROOT, 'data', 'designs-built.json')), false);
});
