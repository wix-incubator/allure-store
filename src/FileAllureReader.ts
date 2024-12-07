/// <reference path="external.d.ts" />

import fs from 'node:fs/promises';
import path from 'node:path';

import * as properties from 'properties';

import type {AllureReader} from './AllureReader';
import type {Category, Container, ExecutorInfo, Result} from './types';
import {AllureStoreError, type OnErrorHandler, resolveOnError} from './errors';

export interface FileAllureReaderConfig {
  resultsDirectory: string;
  onError?: OnErrorHandler;
}

export class FileAllureReader implements AllureReader {
  readonly #resultsDirectory: string;
  readonly #onError: ((error: Error) => void);
  #scanIdsPromise?: Promise<void>;
  #containerIds?: string[];
  #resultIds?: string[];

  constructor(config: FileAllureReaderConfig) {
    this.#resultsDirectory = config.resultsDirectory;
    this.#onError = resolveOnError(config.onError || 'throw');
  }

  async getContainerIds(): Promise<string[]> {
    if (!this.#scanIdsPromise) {
      this.#scanIdsPromise = this.#scanIds();
    }
    await this.#scanIdsPromise;
    return this.#containerIds || [];
  }

  async getResultIds(): Promise<string[]> {
    if (!this.#scanIdsPromise) {
      this.#scanIdsPromise = this.#scanIds();
    }
    await this.#scanIdsPromise;
    return this.#resultIds || [];
  }

  async readResult(id: string): Promise<Result | null> {
    const filePath = path.join(this.#resultsDirectory, `${id}-result.json`);
    return this.#parseJSON<Result>(filePath);
  }

  async readContainer(id: string): Promise<Container | null> {
    const filePath = path.join(this.#resultsDirectory, `${id}-container.json`);
    return this.#parseJSON<Container>(filePath);
  }

  async readCategories(): Promise<Category[] | null> {
    const filePath = path.join(this.#resultsDirectory, 'categories.json');
    return this.#parseJSON<Category[]>(filePath);
  }

  async readEnvironmentInfo(): Promise<Record<string, string> | null> {
    const filePath = path.join(this.#resultsDirectory, 'environment.properties');
    const content = await this.#readFileIfExists(filePath);
    if (!content) return null;
    return properties.parse(content, { sections: false, comments: '#', separators: '=', unicode: true });
  }

  async readExecutorInfo(): Promise<ExecutorInfo | null> {
    const filePath = path.join(this.#resultsDirectory, 'executor.json');
    return this.#parseJSON<ExecutorInfo>(filePath);
  }

  /**
   * Helper method to read and parse JSON files.
   */
  async #parseJSON<T>(filePath: string): Promise<T | null> {
    try {
      const content = await this.#readFileIfExists(filePath);
      return content ? (JSON.parse(content) as T) : null;
    } catch (error: unknown) {
      this.#handleError(`Failed to parse JSON file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Helper method to safely read a file, returning `null` if it doesn't exist.
   */
  async #readFileIfExists(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error: unknown) {
      this.#handleError(`Failed to read file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Helper method to list the contents of the results directory and cache the IDs.
   */
  async #scanIds(): Promise<void> {
    let files: string[] = [];
    try {
      files = await fs.readdir(this.#resultsDirectory);
    } catch (error: unknown) {
      this.#handleError(`Failed to list directory: ${this.#resultsDirectory}`, error);
      files = [];
    }

    this.#containerIds = files
      .filter((f) => f.endsWith('-container.json'))
      .map((f) => path.basename(f, '-container.json'));

    this.#resultIds = files
      .filter((f) => f.endsWith('-result.json'))
      .map((f) => path.basename(f, '-result.json'));
  }

  #handleError(message: string, cause?: unknown): void {
    this.#onError(new AllureStoreError(message, cause));
  }
}
