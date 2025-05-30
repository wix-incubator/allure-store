import type { Mock} from 'node:test';
import {beforeEach, describe, it, mock} from 'node:test';

import {expect} from 'chai';

import {AllureStore} from './AllureStore';
import type {AllureWriter} from './AllureWriter';
import type {Category, CategoryInput, Container, Result, Step} from './types';
import {TestReader} from './__mocks__/TestReader';

type TestStep = Partial<Step>;
type TestResult = Partial<Result>;
type TestContainer = Partial<Container>;

describe('AllureStore', () => {
  describe('(reading)', () => {
    let reader: TestReader;
    let store: AllureStore;

    // For reading tests, a mock writer is provided but not really used.
    const mockWriter: AllureWriter = {
      writeCategories: mock.fn(),
      writeEnvironmentInfo: mock.fn(),
      writeExecutorInfo: mock.fn(),
      writeContainer: mock.fn(),
      writeResult: mock.fn(),
    };

    beforeEach(() => {
      reader = new TestReader();
      store = new AllureStore({ reader, writer: mockWriter });
    });

    describe('all()', () => {
      it('returns empty array if no results and no containers', async () => {
        const results = await store.getAllResults();
        expect(results).to.deep.equal([]);
      });

      it('returns single result with no ancestors', async () => {
        const fakeResult: TestResult = {
          uuid: 'result-1',
          historyId: 'hist-1',
          steps: [],
          stop: 123,
          name: 'test',
          fullName: 'test',
          start: 0,
          stage: 'finished',
          status: 'passed',
        };
        reader.addResult(fakeResult);

        const results = await store.getAllResults();
        expect(results).to.deep.equal([fakeResult]);
      });

      it('merges ancestor container steps into the result', async () => {
        const topBeforeStep: TestStep = {
          name: 'topBefore',
          start: 1,
          stop: 2,
          stage: 'finished',
          status: 'passed',
        };
        const topAfterStep: TestStep = {
          name: 'topAfter',
          start: 10,
          stop: 11,
          stage: 'finished',
          status: 'passed',
        };
        const midBeforeStep: TestStep = {
          name: 'midBefore',
          start: 3,
          stop: 4,
          stage: 'finished',
          status: 'passed',
        };
        const midAfterStep: TestStep = {
          name: 'midAfter',
          start: 8,
          stop: 9,
          stage: 'finished',
          status: 'passed',
        };
        const resultStep: TestStep = {
          name: 'resultStep',
          start: 5,
          stop: 6,
          stage: 'finished',
          status: 'passed',
        };

        const containerTop: TestContainer = {
          uuid: 'container-top',
          children: ['container-mid'],
          befores: [topBeforeStep as Step],
          afters: [topAfterStep as Step],
        };

        const containerMid: TestContainer = {
          uuid: 'container-mid',
          children: ['result-1'],
          befores: [midBeforeStep as Step],
          afters: [midAfterStep as Step],
        };

        const result1: TestResult = {
          uuid: 'result-1',
          historyId: 'hist-1',
          steps: [resultStep as Step],
          stop: 200,
          name: 'test',
          fullName: 'test',
          start: 0,
          stage: 'finished',
          status: 'passed',
        };

        reader.addContainer(containerTop);
        reader.addContainer(containerMid);
        reader.addResult(result1);

        const results = await store.getAllResults();
        expect(results).to.have.lengthOf(1);
        const merged = results[0];
        expect(merged.steps).to.deep.equal([
          topBeforeStep,
          midBeforeStep,
          resultStep,
          midAfterStep,
          topAfterStep,
        ]);
      });

      it('handles missing containers gracefully (failed reads)', async () => {
        const existingContainer: TestContainer = { uuid: 'container-1', children: [] };
        reader.addContainer(existingContainer);

        const fakeResult: TestResult = {
          uuid: 'result-1',
          historyId: 'hist-1',
          steps: [],
          stop: 100,
          name: 'test',
          fullName: 'test',
          start: 0,
          stage: 'finished',
          status: 'passed',
        };
        reader.addResult(fakeResult);

        // Add a null container to simulate a failed read
        reader.addContainer(null as unknown as Container);

        const results = await store.getAllResults();
        // container fails silently, just no steps merged
        expect(results).to.deep.equal([fakeResult]);
      });

      it('handles missing results gracefully (failed reads)', async () => {
        const fakeResult1: TestResult = {
          uuid: 'result-1',
          historyId: 'h1',
          steps: [],
          stop: 10,
          name: 'test',
          fullName: 'test',
          start: 0,
          stage: 'finished',
          status: 'passed',
        };
        reader.addResult(fakeResult1);

        // Add a null result to simulate a failed read
        reader.addResult(null as unknown as Result);

        const results = await store.getAllResults();
        // missing result is ignored since it can't be read.
        expect(results).to.deep.equal([fakeResult1]);
      });
    });

    describe('latest()', () => {
      it('returns only the most recent results per historyId', async () => {
        reader.addResult({
          uuid: 'res-1',
          historyId: 'hist-1',
          steps: [],
          stop: 100,
          name: 't',
          fullName: 't',
          start: 0,
          stage: 'finished',
          status: 'passed',
        });
        reader.addResult({
          uuid: 'res-2',
          historyId: 'hist-1',
          steps: [],
          stop: 200,
          name: 't',
          fullName: 't',
          start: 0,
          stage: 'finished',
          status: 'passed',
        });
        reader.addResult({
          uuid: 'res-3',
          historyId: 'hist-1',
          steps: [],
          stop: 150,
          name: 't',
          fullName: 't',
          start: 0,
          stage: 'finished',
          status: 'passed',
        });
        reader.addResult({
          uuid: 'res-4',
          historyId: 'hist-2',
          steps: [],
          stop: 50,
          name: 't',
          fullName: 't',
          start: 0,
          stage: 'finished',
          status: 'passed',
        });

        const latest = await store.getLatestResults();

        // Expect 2 results: the latest for hist-1 (res-2 stop=200) and hist-2 (res-4 stop=50)
        expect(latest).to.have.lengthOf(2);

        // Instead of Jest's objectContaining/arrayContaining, we manually verify:
        const hasRes2 = latest.some((r) => r.uuid === 'res-2' && r.historyId === 'hist-1' && r.stop === 200);
        const hasRes4 = latest.some((r) => r.uuid === 'res-4' && r.historyId === 'hist-2' && r.stop === 50);

        expect(hasRes2).to.be.true;
        expect(hasRes4).to.be.true;
      });
    });

    it('returns categories from the reader', async () => {
      const fakeCategories: Category[] = [{ name: 'My Category', matchedStatuses: ['failed'] }];
      reader.setCategories(fakeCategories);

      const categories = await store.getCategories();
      expect(categories).to.deep.equal(fakeCategories);
    });

    it('returns environment info from the reader', async () => {
      const fakeEnv = { NODE_ENV: 'test', APP_URL: 'http://example.com' };
      reader.setEnvironmentInfo(fakeEnv);

      const env = await store.getEnvironment();
      expect(env).to.deep.equal(fakeEnv);
    });

    it('returns executor info from the reader', async () => {
      const fakeExecutor = { name: 'GitHub Actions', type: 'CI' };
      reader.setExecutorInfo(fakeExecutor);

      const executor = await store.getExecutor();
      expect(executor).to.deep.equal(fakeExecutor);
    });

    it('returns a single container by ID from the reader', async () => {
      const fakeContainer = { uuid: 'c-123', children: [] } as Container;
      reader.addContainer(fakeContainer);

      const container = await store.getContainer('c-123');
      expect(container).to.deep.equal(fakeContainer);
    });

    it('returns a single result by ID from the reader', async () => {
      const fakeResult = {
        uuid: 'r-123',
        historyId: 'h-1',
        name: 'Test Result',
        fullName: 'Test Result Full',
        start: 0,
        stop: 10,
        stage: 'finished' as const,
        status: 'passed' as const,
      };
      reader.addResult(fakeResult);

      const result = await store.getResult('r-123');
      expect(result).to.deep.equal(fakeResult);
    });
  });

  describe('(writing)', () => {
    let reader: TestReader;
    let writer: {
      writeCategories: Mock<AllureWriter['writeCategories']>,
      writeEnvironmentInfo: Mock<AllureWriter['writeEnvironmentInfo']>,
      writeExecutorInfo: Mock<AllureWriter['writeExecutorInfo']>,
      writeContainer: Mock<AllureWriter['writeContainer']>,
      writeResult: Mock<AllureWriter['writeResult']>,
    };
    let store: AllureStore;

    beforeEach(() => {
      reader = new TestReader();
      writer = {
        writeCategories: mock.fn(),
        writeEnvironmentInfo: mock.fn(),
        writeExecutorInfo: mock.fn(),
        writeContainer: mock.fn(),
        writeResult: mock.fn(),
      };
      store = new AllureStore({ reader, writer });
    });

    it('calls writer.writeCategories()', async () => {
      const categories = [{ name: 'Product defects', matchedStatuses: ['failed' as const] }];
      await store.writeCategories(categories);
      expect(writer.writeCategories.mock.calls).to.have.lengthOf(1);
      expect(writer.writeCategories.mock.calls[0].arguments[0]).to.deep.equal(categories);
    });

    it('calls writer.writeCategories() with RegExp patterns', async () => {
      const categoriesWithRegexp: CategoryInput[] = [
        {
          name: 'Snapshot mismatches',
          matchedStatuses: ['failed' as const],
          messageRegex: /.*\btoMatch(?:[A-Za-z]+)?Snapshot\b.*/
        },
        {
          name: 'Timeout errors',
          matchedStatuses: ['broken' as const],
          traceRegex: /.*timeout.*/i
        }
      ];

      await store.writeCategories(categoriesWithRegexp);
      expect(writer.writeCategories.mock.calls).to.have.lengthOf(1);
      expect(writer.writeCategories.mock.calls[0].arguments[0]).to.deep.equal(categoriesWithRegexp);
    });

    it('calls writer.writeCategories() with mixed string and RegExp patterns', async () => {
      const mixedCategories: CategoryInput[] = [
        {
          name: 'String pattern',
          matchedStatuses: ['failed' as const],
          messageRegex: '.*string.*'  // string
        },
        {
          name: 'RegExp pattern',
          matchedStatuses: ['broken' as const],
          traceRegex: /.*regexp.*/    // RegExp
        }
      ];

      await store.writeCategories(mixedCategories);
      expect(writer.writeCategories.mock.calls).to.have.lengthOf(1);
      expect(writer.writeCategories.mock.calls[0].arguments[0]).to.deep.equal(mixedCategories);
    });

    it('calls writer.writeEnvironmentInfo()', async () => {
      const environmentInfo = { NODE_ENV: 'test', version: '1.0.0' };
      await store.writeEnvironmentInfo(environmentInfo);
      expect(writer.writeEnvironmentInfo.mock.calls).to.have.lengthOf(1);
      expect(writer.writeEnvironmentInfo.mock.calls[0].arguments[0]).to.deep.equal(environmentInfo);
    });

    it('calls writer.writeExecutorInfo()', async () => {
      const executorInfo = { name: 'GitHub Actions', type: 'CI' };
      await store.writeExecutorInfo(executorInfo);
      expect(writer.writeExecutorInfo.mock.calls).to.have.lengthOf(1);
      expect(writer.writeExecutorInfo.mock.calls[0].arguments[0]).to.deep.equal(executorInfo);
    });

    it('calls writer.writeContainer()', async () => {
      const container = {
        uuid: 'container-uuid',
        children: [],
      } as Container;
      await store.writeContainer(container);
      expect(writer.writeContainer.mock.calls).to.have.lengthOf(1);
      expect(writer.writeContainer.mock.calls[0].arguments[0]).to.deep.equal(container);
    });

    it('calls writer.writeResult()', async () => {
      const result = {
        uuid: 'result-uuid',
        historyId: 'hist-id',
        name: 'Test result',
        fullName: 'Test result full',
        start: 0,
        stop: 10,
        stage: 'finished',
        status: 'passed',
      } as Result;
      await store.writeResult(result);
      expect(writer.writeResult.mock.calls).to.have.lengthOf(1);
      expect(writer.writeResult.mock.calls[0].arguments[0]).to.deep.equal(result);
    });
  });
});

