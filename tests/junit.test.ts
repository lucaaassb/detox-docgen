import { describe, it, expect } from 'vitest';
import { parseJunitFile } from '../src/execution/parseJunit';
import os from 'os';
import path from 'path';
import fs from 'fs';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="jest" tests="2" failures="1" time="1.0">
  <testsuite name="e2e" tests="2" failures="1" time="1.0">
    <testcase name="a" classname="j" time="0.1"></testcase>
    <testcase name="b" classname="j" time="0.2">
      <failure message="oops">Error</failure>
    </testcase>
  </testsuite>
</testsuites>`;

describe('parseJunitFile', () => {
  it('flattens testcase rows', () => {
    const tmp = path.join(os.tmpdir(), `docgen-junit-${Date.now()}.xml`);
    fs.writeFileSync(tmp, SAMPLE, 'utf8');
    try {
      const rows = parseJunitFile(tmp);
      expect(rows.length).toBe(2);
      const failed = rows.find((r) => r.name === 'b');
      expect(failed?.state).toBe('failed');
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });
});
