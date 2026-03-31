import { describe, it, beforeEach } from 'node:test';

import { expect } from 'chai';

import { mapCompiledTestCase, CompiledAllureReader } from './CompiledAllureReader';
import type { CompiledReportSource } from './CompiledReportSource';
import type { Status } from './types';

interface StubStep {
  name: string;
  time: { start: number; stop: number; duration: number };
  status: Status;
  steps: StubStep[];
  attachments: { uid?: string; name: string; type: string; source: string; size?: number }[];
  parameters: { name: string; value: string }[];
}

function step(name: string, overrides: Partial<StubStep> = {}): StubStep {
  return {
    name,
    time: { start: 1, stop: 2, duration: 1 },
    status: 'passed',
    steps: [],
    attachments: [],
    parameters: [],
    ...overrides,
  };
}

function baseCompiledTestCase() {
  return {
    uid: 'abc123',
    historyId: 'hist456',
    name: 'Test Name',
    fullName: '[android] Suite - Test Name',
    time: { start: 1000, stop: 2000, duration: 1000 },
    status: 'passed' as Status,
    flaky: false,
    newFailed: false,
    newBroken: false,
    newPassed: false,
    retry: false,
    hidden: false,
    retriesCount: 0,
    retriesStatusChange: false,
    beforeStages: [] as StubStep[],
    afterStages: [] as StubStep[],
    labels: [{ name: 'suite', value: 'MySuite' }],
    links: [{ name: 'GitHub', url: 'https://github.com', type: 'custom' }],
    parameters: [{ name: 'device', value: 'Pixel' }],
  };
}

describe('mapCompiledTestCase', () => {
  let source: ReturnType<typeof baseCompiledTestCase>;
  beforeEach(() => { source = baseCompiledTestCase(); });
  const result = () => mapCompiledTestCase(source);

  describe('.uuid', () => {
    it('should map from uid', () => {
      source.uid = 'xyz';
      expect(result().uuid).to.equal('xyz');
    });
  });

  describe('.historyId', () => {
    it('should pass through', () => {
      source.historyId = 'h1';
      expect(result().historyId).to.equal('h1');
    });
  });

  describe('.name', () => {
    it('should pass through', () => {
      source.name = 'My Test';
      expect(result().name).to.equal('My Test');
    });
  });

  describe('.fullName', () => {
    it('should pass through', () => {
      source.fullName = '[ios] Suite - My Test';
      expect(result().fullName).to.equal('[ios] Suite - My Test');
    });
  });

  describe('.start / .stop', () => {
    it('should flatten from time.start', () => {
      source.time = { start: 100, stop: 200, duration: 100 };
      expect(result().start).to.equal(100);
    });

    it('should flatten from time.stop', () => {
      source.time = { start: 100, stop: 200, duration: 100 };
      expect(result().stop).to.equal(200);
    });
  });

  describe('.stage', () => {
    it('should always be "finished"', () => {
      expect(result().stage).to.equal('finished');
    });
  });

  describe('.status', () => {
    for (const s of ['passed', 'failed', 'broken', 'skipped'] as const) {
      it(`should pass through "${s}"`, () => {
        source.status = s;
        expect(result().status).to.equal(s);
      });
    }
  });

  describe('.descriptionHtml', () => {
    it('should pass through when present', () => {
      (source as any).descriptionHtml = '<p>Hello</p>';
      expect(result().descriptionHtml).to.equal('<p>Hello</p>');
    });

    it('should be omitted when absent', () => {
      expect(result()).to.not.have.property('descriptionHtml');
    });
  });

  describe('.statusDetails', () => {
    it('should map from statusMessage and statusTrace', () => {
      (source as any).statusMessage = 'Assertion failed';
      (source as any).statusTrace = 'at line 42';
      expect(result().statusDetails).to.deep.equal({ message: 'Assertion failed', trace: 'at line 42' });
    });

    it('should map message only when no trace', () => {
      (source as any).statusMessage = 'Timeout';
      expect(result().statusDetails).to.deep.equal({ message: 'Timeout' });
    });

    it('should map trace only when no message', () => {
      (source as any).statusTrace = 'stack trace';
      expect(result().statusDetails).to.deep.equal({ trace: 'stack trace' });
    });

    it('should be omitted when both are absent', () => {
      expect(result()).to.not.have.property('statusDetails');
    });
  });

  describe('.labels (passthrough)', () => {
    it('should pass through original labels', () => {
      source.labels = [{ name: 'owner', value: 'team-a' }];
      expect(result().labels).to.deep.include({ name: 'owner', value: 'team-a' });
    });

    it('should default to empty when absent', () => {
      (source as any).labels = undefined;
      expect(result().labels).to.deep.equal([]);
    });
  });

  describe('.labels (synthetic)', () => {
    it('should add allure2.flaky when true', () => {
      source.flaky = true;
      expect(result().labels).to.deep.include({ name: 'allure2.flaky', value: 'true' });
    });

    it('should add allure2.retry when true', () => {
      source.retry = true;
      expect(result().labels).to.deep.include({ name: 'allure2.retry', value: 'true' });
    });

    it('should add allure2.hidden when true', () => {
      source.hidden = true;
      expect(result().labels).to.deep.include({ name: 'allure2.hidden', value: 'true' });
    });

    it('should add allure2.retriesStatusChange when true', () => {
      source.retriesStatusChange = true;
      expect(result().labels).to.deep.include({ name: 'allure2.retriesStatusChange', value: 'true' });
    });

    it('should add allure2.newFailed when true', () => {
      source.newFailed = true;
      expect(result().labels).to.deep.include({ name: 'allure2.newFailed', value: 'true' });
    });

    it('should add allure2.newBroken when true', () => {
      source.newBroken = true;
      expect(result().labels).to.deep.include({ name: 'allure2.newBroken', value: 'true' });
    });

    it('should add allure2.newPassed when true', () => {
      source.newPassed = true;
      expect(result().labels).to.deep.include({ name: 'allure2.newPassed', value: 'true' });
    });

    it('should add allure2.retriesCount when > 0', () => {
      source.retriesCount = 3;
      expect(result().labels).to.deep.include({ name: 'allure2.retriesCount', value: '3' });
    });

    it('should not add any synthetic labels when all falsy/zero', () => {
      const syntheticNames = result().labels!.filter((l) => l.name.startsWith('allure2.'));
      expect(syntheticNames).to.have.length(0);
    });
  });

  describe('.links', () => {
    it('should pass through unchanged', () => {
      source.links = [{ name: 'JIRA', url: 'https://jira.example.com/123', type: 'issue' }];
      expect(result().links).to.deep.equal([{ name: 'JIRA', url: 'https://jira.example.com/123', type: 'issue' }]);
    });
  });

  describe('.parameters', () => {
    it('should pass through {name, value}', () => {
      source.parameters = [{ name: 'browser', value: 'chrome' }];
      expect(result().parameters).to.deep.equal([{ name: 'browser', value: 'chrome' }]);
    });
  });

  describe('.steps', () => {
    it('should concatenate beforeStages + testStage.steps + afterStages', () => {
      source.beforeStages = [step('setup')];
      (source as any).testStage = { status: 'passed', steps: [step('test-step', { time: { start: 3, stop: 4, duration: 1 } })] };
      source.afterStages = [step('teardown', { time: { start: 5, stop: 6, duration: 1 } })];
      const names = result().steps!.map((s) => s.name);
      expect(names).to.deep.equal(['setup', 'test-step', 'teardown']);
    });

    it('should return [] when no testStage (skipped)', () => {
      source.status = 'skipped';
      expect(result().steps).to.deep.equal([]);
    });

    it('should return [] when no testStage (retried broken)', () => {
      source.status = 'broken';
      source.retry = true;
      source.hidden = true;
      expect(result().steps).to.deep.equal([]);
    });

    it('should return [] when no testStage ((test execution) meta-entry)', () => {
      source.name = '(test execution)';
      expect(result().steps).to.deep.equal([]);
    });

    it('should include only before/after stages when testStage has empty steps', () => {
      source.beforeStages = [step('before')];
      (source as any).testStage = { status: 'passed', steps: [] };
      source.afterStages = [step('after', { time: { start: 3, stop: 4, duration: 1 } })];
      const names = result().steps!.map((s) => s.name);
      expect(names).to.deep.equal(['before', 'after']);
    });

    it('should preserve nested steps recursively', () => {
      (source as any).testStage = {
        status: 'passed',
        steps: [step('outer', {
          time: { start: 1, stop: 10, duration: 9 },
          steps: [step('inner', { time: { start: 2, stop: 5, duration: 3 } })],
        })],
      };
      expect(result().steps![0].steps![0].name).to.equal('inner');
    });

    it('should flatten step time.start / time.stop', () => {
      (source as any).testStage = {
        status: 'passed',
        steps: [step('s', { time: { start: 10, stop: 20, duration: 10 } })],
      };
      expect(result().steps![0].start).to.equal(10);
      expect(result().steps![0].stop).to.equal(20);
    });

    it('should set step stage to "finished"', () => {
      (source as any).testStage = {
        status: 'passed',
        steps: [step('s')],
      };
      expect(result().steps![0].stage).to.equal('finished');
    });
  });

  describe('.steps[].attachments', () => {
    it('should map name/type/source/size and drop uid', () => {
      (source as any).testStage = {
        status: 'passed',
        steps: [step('s', {
          attachments: [{ uid: 'drop-me', name: 'screenshot.png', type: 'image/png', source: '/path/to/file.png', size: 1024 }],
        })],
      };
      const att = result().steps![0].attachments![0];
      expect(att).to.deep.equal({ name: 'screenshot.png', type: 'image/png', source: '/path/to/file.png', size: 1024 });
      expect(att).to.not.have.property('uid');
    });

    it('should omit size when absent', () => {
      (source as any).testStage = {
        status: 'passed',
        steps: [step('s', {
          attachments: [{ uid: 'x', name: 'log.txt', type: 'text/plain', source: '/path/log.txt' }],
        })],
      };
      expect(result().steps![0].attachments![0]).to.not.have.property('size');
    });
  });

  describe('.steps[].parameters', () => {
    it('should pass through step parameters', () => {
      (source as any).testStage = {
        status: 'passed',
        steps: [step('s', { parameters: [{ name: 'id', value: 'my-button' }] })],
      };
      expect(result().steps![0].parameters).to.deep.equal([{ name: 'id', value: 'my-button' }]);
    });
  });
});

describe('CompiledAllureReader', () => {
  function mockSource(files: Record<string, string>): CompiledReportSource {
    return {
      readFile: async (p: string) => files[p] ?? null,
      listFiles: async (prefix: string) => Object.keys(files).filter((k) => k.startsWith(prefix)),
    };
  }

  function readerFor(files: Record<string, string>): CompiledAllureReader {
    return new CompiledAllureReader({ source: mockSource(files), onError: 'ignore' });
  }

  describe('getResultIds', () => {
    it('should list all test case UIDs', async () => {
      const reader = readerFor({
        'data/test-cases/aaa.json': '{}',
        'data/test-cases/bbb.json': '{}',
      });
      const ids = await reader.getResultIds();
      expect(ids).to.have.members(['aaa', 'bbb']);
    });
  });

  describe('getContainerIds', () => {
    it('should always return empty', async () => {
      expect(await readerFor({}).getContainerIds()).to.deep.equal([]);
    });
  });

  describe('readContainer', () => {
    it('should always return null', async () => {
      expect(await readerFor({}).readContainer('any')).to.equal(null);
    });
  });

  describe('readCategories', () => {
    it('should always return null', async () => {
      expect(await readerFor({}).readCategories()).to.equal(null);
    });
  });

  describe('readResult', () => {
    it('should return null for missing file', async () => {
      expect(await readerFor({}).readResult('missing')).to.equal(null);
    });

    it('should return null for invalid JSON', async () => {
      const reader = readerFor({ 'data/test-cases/bad.json': 'not json' });
      expect(await reader.readResult('bad')).to.equal(null);
    });

    it('should map a valid test case', async () => {
      const tc = JSON.stringify(baseCompiledTestCase());
      const reader = readerFor({ 'data/test-cases/abc123.json': tc });
      const r = await reader.readResult('abc123');
      expect(r).to.not.equal(null);
      expect(r!.uuid).to.equal('abc123');
      expect(r!.stage).to.equal('finished');
    });
  });

  describe('readEnvironmentInfo', () => {
    it('should convert [{name, values}] to Record<string, string>', async () => {
      const env = JSON.stringify([
        { name: 'version.node', values: ['v20.20.1'] },
        { name: 'multi', values: ['a', 'b'] },
      ]);
      const reader = readerFor({ 'widgets/environment.json': env });
      const info = await reader.readEnvironmentInfo();
      expect(info).to.deep.equal({ 'version.node': 'v20.20.1', 'multi': 'a,b' });
    });

    it('should return null when file is missing', async () => {
      expect(await readerFor({}).readEnvironmentInfo()).to.equal(null);
    });
  });

  describe('readExecutorInfo', () => {
    it('should return first executor from array', async () => {
      const executors = JSON.stringify([{ name: 'machine-1', type: 'buildkite', buildOrder: 100 }]);
      const reader = readerFor({ 'widgets/executors.json': executors });
      const info = await reader.readExecutorInfo();
      expect(info).to.deep.equal({ name: 'machine-1', type: 'buildkite', buildOrder: 100 });
    });

    it('should return null for empty array', async () => {
      expect(await readerFor({ 'widgets/executors.json': '[]' }).readExecutorInfo()).to.equal(null);
    });

    it('should return null when file is missing', async () => {
      expect(await readerFor({}).readExecutorInfo()).to.equal(null);
    });
  });
});
