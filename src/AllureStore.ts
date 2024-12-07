import type { AllureReader } from './AllureReader';
import type { AllureWriter } from './AllureWriter';
import { FileAllureReader } from './FileAllureReader';
import { FileAllureWriter } from './FileAllureWriter';
import type { Category, Container, ExecutorInfo, Result } from './types';

export interface AllureStoreConfig {
  reader: AllureReader;
  writer: AllureWriter;
}

export interface AllureStoreDirectoryConfig {
  overwrite?: boolean;
  onError?: ((error: Error) => void) | 'throw' | 'ignore';
}

export class AllureStore {
  readonly #reader: AllureReader;
  readonly #writer: AllureWriter;

  constructor(config: AllureStoreConfig) {
    this.#reader = config.reader;
    this.#writer = config.writer;
  }

  static async fromConfig(config: AllureStoreConfig): Promise<AllureStore> {
    await Promise.all([config.reader.init?.(), config.writer.init?.()]);
    return new AllureStore(config);
  }

  static async fromDirectory(resultsDirectory: string, config: AllureStoreDirectoryConfig = {}): Promise<AllureStore> {
    const reader: AllureReader = new FileAllureReader({ resultsDirectory, onError: config.onError });
    const writer: AllureWriter = new FileAllureWriter({ resultsDirectory, onError: config.onError, overwrite: config.overwrite });
    return AllureStore.fromConfig({ reader, writer });
  }

  //#region Reading methods
  async getAllResults(): Promise<Result[]> {
    const [containerIds, resultIds] = await Promise.all([
      this.#reader.getContainerIds(),
      this.#reader.getResultIds(),
    ]);
    const containerMap = await this.#buildContainerMap(containerIds);

    const rawResults = await Promise.all(resultIds.map((id) => this.#reader.readResult(id)));
    const validResults = rawResults.filter((r): r is Result => r != null);

    return validResults.map((result) => this.#mergeContainers(result, containerMap));
  }

  async getLatestResults(): Promise<Result[]> {
    const all = await this.getAllResults();
    const map = new Map<string, Result>();
    for (const result of all) {
      const existing = map.get(result.historyId);
      if (!existing || result.stop > existing.stop) {
        map.set(result.historyId, result);
      }
    }
    return [...map.values()];
  }

  async getCategories(): Promise<Category[] | null> {
    return this.#reader.readCategories();
  }

  async getEnvironment(): Promise<Record<string, string> | null> {
    return this.#reader.readEnvironmentInfo();
  }

  async getExecutor(): Promise<ExecutorInfo | null> {
    return this.#reader.readExecutorInfo();
  }

  async getContainer(id: string): Promise<Container | null> {
    return this.#reader.readContainer(id);
  }

  async getResult(id: string): Promise<Result | null> {
    return this.#reader.readResult(id);
  }
  //#endregion

  //#region Writing methods
  async writeCategories(categories: Category[]): Promise<void> {
    return this.#writer.writeCategories(categories);
  }

  async writeEnvironmentInfo(info: Record<string, string>): Promise<void> {
    return this.#writer.writeEnvironmentInfo(info);
  }

  async writeExecutorInfo(info: ExecutorInfo): Promise<void> {
    return this.#writer.writeExecutorInfo(info);
  }

  async writeResult(result: Result): Promise<void> {
    return this.#writer.writeResult(result);
  }

  async writeContainer(container: Container): Promise<void> {
    return this.#writer.writeContainer(container);
  }
  //#endregion

  //#region Private helper methods
  async #buildContainerMap(containerIds: string[]): Promise<Map<string, Container>> {
    const containerMap = new Map<string, Container>();
    // Read and store all containers
    await Promise.all(
      containerIds.map(async (cid) => {
        const container = await this.#reader.readContainer(cid);
        if (container) {
          containerMap.set(container.uuid, container);
        }
      }),
    );
    return containerMap;
  }

  #mergeContainers(result: Result, containerMap: Map<string, Container>): Result {
    // The aggregation logic similar to what we had before
    const ancestors = this.#findAncestorContainers(result.uuid, containerMap);
    const merged = { ...result, steps: this.#mergeSteps(result, ancestors) };
    return merged;
  }

  #findAncestorContainers(
    startId: string,
    containerMap: Map<string, Container>,
  ): Container[] {
    // logic similar to previously done in aggregator class
    const parentFor = new Map<string, string>();
    for (const container of containerMap.values()) {
      for (const child of container.children) {
        parentFor.set(child, container.uuid);
      }
    }

    const ancestors: Container[] = [];
    let currentId: string | undefined = startId;
    while (currentId) {
      const parentId = parentFor.get(currentId);
      if (!parentId) break;
      const parentContainer = containerMap.get(parentId);
      if (!parentContainer) break;
      ancestors.push(parentContainer);
      currentId = parentId;
    }
    return ancestors.reverse();
  }

  #mergeSteps(result: Result, ancestors: Container[]) {
    const beforeSteps = ancestors.flatMap((a) => a.befores ?? []);
    const afterSteps = [...ancestors].reverse().flatMap((a) => a.afters ?? []);
    return [...beforeSteps, ...(result.steps ?? []), ...afterSteps];
  }
  //#endregion
}
