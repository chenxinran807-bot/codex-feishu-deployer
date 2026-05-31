import test from 'node:test';
import assert from 'node:assert/strict';
import { expandHome, parseCommandExistsStatus } from '../src/system.js';

test('expandHome expands a leading tilde', () => {
  assert.equal(expandHome('~/project', '/Users/alice'), '/Users/alice/project');
});

test('expandHome leaves non-home paths unchanged', () => {
  assert.equal(expandHome('/tmp/project', '/Users/alice'), '/tmp/project');
});

test('parseCommandExistsStatus maps zero exit code to true', () => {
  assert.equal(parseCommandExistsStatus(0), true);
  assert.equal(parseCommandExistsStatus(1), false);
});
