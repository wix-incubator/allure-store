/// <reference path="external.d.ts" />

import fs from 'node:fs/promises';
import path from 'node:path';

import * as properties from 'properties';

import type {AllureWriter} from './AllureWriter';
import type {Category, Container, ExecutorInfo, Result} from './types';
import type { OnErrorHandler} from './errors';
import {AllureStoreError, resolveOnError} from './errors';

export interface FileSystemAllureWriterConfig {
  overwrite?: boolean;
  resultsDirectory: string;
  onError?: OnErrorHandler;
}

export class FileAllureWriter implements AllureWriter {
  readonly #config: FileSystemAllureWriterConfig;
  readonly #onError: ((error: Error) => void);

  constructor(config: FileSystemAllureWriterConfig) {
    this.#config = config;
    this.#onError = resolveOnError(config.onError || 'throw');
  }

  async init(): Promise<void> {
    const { resultsDirectory, overwrite } = this.#config;
    try {
      const directoryExists = await fs.access(resultsDirectory).then(
        () => true,
        // throw if not ENOENT
        (error) => {
          if (error?.code !== 'ENOENT') throw error;
          return false;
        },
      );
      if (overwrite && directoryExists) {
        await fs.rm(resultsDirectory, { recursive: true });
      }
      await fs.mkdir(resultsDirectory, { recursive: true });
    } catch (error: unknown) {
      this.#handleError(`Failed to initialize results directory: ${resultsDirectory}`, error);
    }
  }

  async writeCategories(categories: Category[]): Promise<void> {
    const filePath = this.#buildPath('categories.json');
    try {
      await writeJson(filePath, categories, regexpAwareStringifier);
    } catch (error: unknown) {
      this.#handleError(`Failed to write categories: ${filePath}`, error);
    }
  }

  async writeContainer(container: Container): Promise<void> {
    const filePath = this.#buildPath(`${container.uuid}-container.json`);
    try {
      await writeJson(filePath, container);
    } catch (error: unknown) {
      this.#handleError(`Failed to write container: ${filePath}`, error);
    }
  }

  async writeEnvironmentInfo(info: Record<string, unknown>): Promise<void> {
    const filePath = this.#buildPath('environment.properties');
    try {
      const text = properties.stringify(info, { unicode: true });
      await fs.writeFile(filePath, text + '\n');
    } catch (error: unknown) {
      this.#handleError(`Failed to write environment info: ${filePath}`, error);
    }
  }

  async writeExecutorInfo(info: ExecutorInfo): Promise<void> {
    const filePath = this.#buildPath('executor.json');
    try {
      await writeJson(filePath, info);
    } catch (error: unknown) {
      this.#handleError(`Failed to write executor info: ${filePath}`, error);
    }
  }

  async writeResult(result: Result): Promise<void> {
    const filePath = this.#buildPath(`${result.uuid}-result.json`);
    try {
      await writeJson(filePath, result);
    } catch (error: unknown) {
      this.#handleError(`Failed to write result: ${filePath}`, error);
    }
  }

  #buildPath(name: string): string {
    return path.join(this.#config.resultsDirectory, name);
  }

  #handleError(message: string, cause?: unknown): void {
    this.#onError(new AllureStoreError(message, cause));
  }
}

async function writeJson(
  filePath: string,
  data: unknown,
  stringifier?: (key: string, value: unknown) => unknown,
) {
  const json = JSON.stringify(data, stringifier);
  await fs.writeFile(filePath, json + '\n');
}

function regexpAwareStringifier(_key: string, value: unknown) {
  return value instanceof RegExp ? value.source : value;
}

