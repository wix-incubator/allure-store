import { afterEach, beforeEach, describe, it } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { expect } from 'chai';

import { FileAllureWriter } from './FileAllureWriter';
import { AllureStoreError } from './errors';
import { type Category, type CategoryInput, type Container, type Result } from './types';

async function fileExists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false);
}

describe('FileAllureWriter (no mocks, using filesystem permissions)', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a fresh temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'allure-writer-test-'));
  });

  afterEach(async () => {
    // Cleanup: force remove the directory regardless of permissions
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('with default behavior (no onError)', () => {
    it('should write a result file successfully', async () => {
      const writer = new FileAllureWriter({ resultsDirectory: tempDir, overwrite: true });
      await writer.init();

      const result = { uuid: '12345', name: 'test-result' } as Result;
      await writer.writeResult(result);

      const filePath = path.join(tempDir, '12345-result.json');
      expect(await fileExists(filePath)).to.be.true;

      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(content).to.deep.equal(result);
    });

    it('should throw if init fails when there is no onError', async () => {
      const writer = new FileAllureWriter({ resultsDirectory: '/bad/dir/', overwrite: true });
      try {
        await writer.init();
        expect.fail('Expected init() to fail due to permission error');
      } catch (error) {
        expect(error).to.be.instanceof(AllureStoreError);
        expect((error as Error).message).to.include('Failed to initialize results directory');
      }
    });
  });

  describe('with onError as a function', () => {
    it('should call onError instead of throwing on init failure', async () => {
      // Create a simple onError spy
      const errors: unknown[] = [];
      const onError = (err: unknown) => errors.push(err);

      const writer = new FileAllureWriter({ resultsDirectory: '/bad/dir/', overwrite: true, onError });
      await writer.init(); // should not throw, but call onError

      expect(errors).to.have.lengthOf(1);
      const err = errors[0];
      expect(err).to.be.instanceof(AllureStoreError);
      expect((err as Error).message).to.include('Failed to initialize results directory');
    });

    it('should write categories without calling onError on success', async () => {
      const errors: unknown[] = [];
      const onError = (err: unknown) => errors.push(err);

      // Normal scenario, no permission changes
      const writer = new FileAllureWriter({ resultsDirectory: tempDir, overwrite: true, onError });
      await writer.init();

      const categories: Category[] = [{ name: 'Category1' }];
      await writer.writeCategories(categories);

      const filePath = path.join(tempDir, 'categories.json');
      expect(await fileExists(filePath)).to.be.true;

      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(content).to.deep.equal(categories);

      expect(errors).to.have.lengthOf(0);
    });

    it('should write categories with RegExp objects and serialize them to strings', async () => {
      const errors: unknown[] = [];
      const onError = (err: unknown) => errors.push(err);

      const writer = new FileAllureWriter({ resultsDirectory: tempDir, overwrite: true, onError });
      await writer.init();

      const categoriesWithRegexp: CategoryInput[] = [
        {
          name: 'Snapshot mismatches',
          matchedStatuses: ['failed'],
          messageRegex: /.*\btoMatch(?:[A-Za-z]+)?Snapshot\b.*/
        },
        {
          name: 'Visual regressions',
          matchedStatuses: ['failed'],
          traceRegex: /.*\bscreenshot.*/
        }
      ];

      await writer.writeCategories(categoriesWithRegexp);

      const filePath = path.join(tempDir, 'categories.json');
      expect(await fileExists(filePath)).to.be.true;

      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

      // RegExp objects should be serialized to their source strings
      expect(content).to.deep.equal([
        {
          name: 'Snapshot mismatches',
          matchedStatuses: ['failed'],
          messageRegex: String.raw`.*\btoMatch(?:[A-Za-z]+)?Snapshot\b.*`
        },
        {
          name: 'Visual regressions',
          matchedStatuses: ['failed'],
          traceRegex: String.raw`.*\bscreenshot.*`
        }
      ]);

      expect(errors).to.have.lengthOf(0);
    });

    it('should handle mixed string and RegExp patterns in categories', async () => {
      const errors: unknown[] = [];
      const onError = (err: unknown) => errors.push(err);

      const writer = new FileAllureWriter({ resultsDirectory: tempDir, overwrite: true, onError });
      await writer.init();

      const mixedCategories: CategoryInput[] = [
        {
          name: 'String pattern',
          matchedStatuses: ['failed'],
          messageRegex: '.*timeout.*'  // string
        },
        {
          name: 'RegExp pattern',
          matchedStatuses: ['broken'],
          traceRegex: /.*\berror\b.*/  // RegExp
        },
        {
          name: 'Both patterns',
          matchedStatuses: ['failed'],
          messageRegex: '.*string.*',  // string
          traceRegex: /.*regexp.*/    // RegExp
        }
      ];

      await writer.writeCategories(mixedCategories);

      const filePath = path.join(tempDir, 'categories.json');
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

      expect(content).to.deep.equal([
        {
          name: 'String pattern',
          matchedStatuses: ['failed'],
          messageRegex: '.*timeout.*'
        },
        {
          name: 'RegExp pattern',
          matchedStatuses: ['broken'],
          traceRegex: String.raw`.*\berror\b.*`  // RegExp source converted to string
        },
        {
          name: 'Both patterns',
          matchedStatuses: ['failed'],
          messageRegex: '.*string.*',
          traceRegex: '.*regexp.*'     // RegExp source converted to string
        }
      ]);

      expect(errors).to.have.lengthOf(0);
    });

    it('should handle complex RegExp patterns with flags and special characters', async () => {
      const errors: unknown[] = [];
      const onError = (err: unknown) => errors.push(err);

      const writer = new FileAllureWriter({ resultsDirectory: tempDir, overwrite: true, onError });
      await writer.init();

      const complexCategories: CategoryInput[] = [
        {
          name: 'Complex pattern',
          matchedStatuses: ['failed'],
          messageRegex: /^error:\s+(.+)\s+at\s+line\s+\d+$/gim  // with flags
        }
      ];

      await writer.writeCategories(complexCategories);

      const filePath = path.join(tempDir, 'categories.json');
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

      // Only the source should be serialized, flags are not preserved
      expect(content).to.deep.equal([
        {
          name: 'Complex pattern',
          matchedStatuses: ['failed'],
          messageRegex: String.raw`^error:\s+(.+)\s+at\s+line\s+\d+$`
        }
      ]);

      expect(errors).to.have.lengthOf(0);
    });

    it('should handle empty categories array with RegExp support', async () => {
      const errors: unknown[] = [];
      const onError = (err: unknown) => errors.push(err);

      const writer = new FileAllureWriter({ resultsDirectory: tempDir, overwrite: true, onError });
      await writer.init();

      await writer.writeCategories([]);

      const filePath = path.join(tempDir, 'categories.json');
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

      expect(content).to.deep.equal([]);
      expect(errors).to.have.lengthOf(0);
    });
  });

  describe('with onError = "ignore"', () => {
    it('should silently ignore errors', async () => {
      // Cause init to fail by removing permissions
      await fs.chmod(tempDir, 0o000);

      const writer = new FileAllureWriter({ resultsDirectory: tempDir, overwrite: true, onError: 'ignore' });
      // This would normally fail, but 'ignore' means no throw
      await writer.init();

      const container = { uuid: 'abcd', name: 'Test Container' } as Container;
      // Also should not throw, even though it can't write
      await writer.writeContainer(container);

      // Just verify no exceptions. No error checks since we're ignoring them.
    });
  });
});
