import type { Mock } from 'node:test';
import { describe, it, beforeEach, mock } from 'node:test';
import path from 'node:path';

import { expect } from 'chai';

import { FileAllureReader } from './FileAllureReader';

describe('FileAllureReader', () => {
  const KNOWN_RESULT_ID = 'f92017ea-2180-52b3-951f-2e1050c9030d';
  const KNOWN_CONTAINER_ID = '1c01faf0-15cb-5439-9cf6-adcd8bc3c089';

  const EXISTING_RESULTS_PATH = path.resolve(__dirname, '__fixtures__', 'allure-results');
  const NON_EXISTING_RESULTS_PATH = path.resolve(__dirname, '__fixtures__', 'non-existing-results'); // directory does not exist or is empty

  let reader: FileAllureReader;
  let emptyReader: FileAllureReader;
  let onError: Mock<(error: Error) => void>;

  beforeEach(() => {
    onError = mock.fn();
    reader = new FileAllureReader({ resultsDirectory: EXISTING_RESULTS_PATH, onError });
    emptyReader = new FileAllureReader({ resultsDirectory: NON_EXISTING_RESULTS_PATH, onError });
  });

  describe('with existing results directory', () => {
    it('should list known container IDs', async () => {
      const containers = await reader.getContainerIds();
      expect(containers).to.contain(KNOWN_CONTAINER_ID);
    });

    it('should list known result IDs', async () => {
      const results = await reader.getResultIds();
      expect(results).to.contain(KNOWN_RESULT_ID);
    });

    it('should read a known result file by ID', async () => {
      const result = await reader.readResult(KNOWN_RESULT_ID);
      expect(result).not.to.eq(null);
      expect(result?.name).to.eq('Product list loads successfully');
    });

    it('should return null for a non-existent result ID and call onError', async () => {
      const result = await reader.readResult('invalid-result-id');
      expect(result).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should read a known container file by ID', async () => {
      const container = await reader.readContainer(KNOWN_CONTAINER_ID);
      expect(container).not.to.eq(null);
      expect(container?.name).to.contain('Product list loads successfully');
    });

    it('should return null for a non-existent container ID and call onError', async () => {
      const container = await reader.readContainer('invalid-container-id');
      expect(container).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should read categories', async () => {
      const categories = await reader.readCategories();
      expect(categories).to.have.length.greaterThan(0);
    });

    it('should read environment info', async () => {
      const environmentInfo = await reader.readEnvironmentInfo();
      expect(environmentInfo).to.have.property('version.node');
    });

    it('should return null for a non-existent executor.json and call onError', async () => {
      const executorInfo = await reader.readExecutorInfo();
      expect(executorInfo).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });
  });

  describe('with a non-existing (or empty) results directory', () => {
    it('should return empty arrays for container IDs', async () => {
      const containers = await emptyReader.getContainerIds();
      expect(containers).to.have.length(0);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should return empty arrays for result IDs', async () => {
      const results = await emptyReader.getResultIds();
      expect(results).to.have.length(0);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should return null for reading any non-existent result', async () => {
      const result = await emptyReader.readResult('any-id');
      expect(result).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should return null for reading any non-existent container', async () => {
      const container = await emptyReader.readContainer('any-id');
      expect(container).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should return null for categories if they do not exist', async () => {
      const categories = await emptyReader.readCategories();
      expect(categories).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should return null for environment info if no file exists', async () => {
      const environmentInfo = await emptyReader.readEnvironmentInfo();
      expect(environmentInfo).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });

    it('should return null for executor info if no file exists', async () => {
      const executorInfo = await emptyReader.readExecutorInfo();
      expect(executorInfo).to.eq(null);
      expect(onError.mock.calls).to.have.length(1);
    });
  });

  describe('with onError = "ignore"', () => {
    it('should ignore errors silently', async () => {
      const silentReader = new FileAllureReader({
        resultsDirectory: NON_EXISTING_RESULTS_PATH,
        onError: 'ignore',
      });

      const containerIds = await silentReader.getContainerIds();
      expect(containerIds).to.have.length(0);

      const result = await silentReader.readResult('non-existent');
      expect(result).to.eq(null);
      // No errors thrown or handled, silently ignored.
    });
  });

  describe('with onError = "throw"', () => {
    it('should throw errors', async () => {
      const throwingReader = new FileAllureReader({
        resultsDirectory: NON_EXISTING_RESULTS_PATH,
        onError: 'throw',
      });

      try {
        await throwingReader.getContainerIds();
        expect.fail('Expected an error to be thrown');
      } catch (error: unknown) {
        expect(error).to.be.instanceOf(Error);
      }

    });
  });

  describe('with no onError provided', () => {
    it('should throw errors by default', async () => {
      const throwingReader = new FileAllureReader({
        resultsDirectory: NON_EXISTING_RESULTS_PATH,
      });

      try {
        await throwingReader.getContainerIds();
        expect.fail('Expected an error to be thrown');
      } catch (error: unknown) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });
});
