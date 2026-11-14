import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function createHarness(dev) {
  const timers = [];
  const cleared = [];
  const context = vm.createContext({
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout(id) { cleared.push(id); },
  });
  const module = new vm.SourceTextModule(await readFile(new URL('./planningLoading.js', import.meta.url), 'utf8'), {
    context,
    initializeImportMeta(meta) { meta.env = { DEV: dev }; },
  });
  await module.link(() => { throw new Error('Unexpected import'); });
  await module.evaluate();
  return { api: module.namespace, timers, cleared };
}

test('development delay holds successful results for exactly 2000 ms', async () => {
  const harness = await createHarness(true);
  let published = false;
  const pending = harness.api.withPlanningLoadingDelay(Promise.resolve('rows'));
  pending.then(() => { published = true; });
  await Promise.resolve();
  assert.equal(published, false);
  assert.equal(harness.timers.length, 1);
  assert.equal(harness.timers[0].delay, 2000);
  harness.timers[0].callback();
  assert.equal(await pending, 'rows');
  assert.deepEqual(harness.cleared, [1]);
});

test('slow requests must finish even after the test delay expires', async () => {
  const harness = await createHarness(true);
  let resolve;
  let published = false;
  const pending = harness.api.withPlanningLoadingDelay(new Promise(done => { resolve = done; }));
  pending.then(() => { published = true; });
  harness.timers[0].callback();
  await Promise.resolve();
  assert.equal(published, false);
  resolve('rows');
  assert.equal(await pending, 'rows');
});

test('production has no artificial delay and still propagates errors', async () => {
  const harness = await createHarness(false);
  assert.equal(await harness.api.withPlanningLoadingDelay(Promise.resolve('rows')), 'rows');
  await assert.rejects(harness.api.withPlanningLoadingDelay(Promise.reject(new Error('offline'))), /offline/);
  assert.equal(harness.timers.length, 0);
});

test('development errors are surfaced immediately and their timer is cleared', async () => {
  const harness = await createHarness(true);
  await assert.rejects(harness.api.withPlanningLoadingDelay(Promise.reject(new Error('offline'))), /offline/);
  assert.deepEqual(harness.cleared, [1]);
});
