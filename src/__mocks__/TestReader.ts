import type {AllureReader} from '../AllureReader';
import type {Category, Container, ExecutorInfo, Result} from '../types';

export class TestReader implements AllureReader {
  readonly #containerIds: string[] = [];
  readonly #containerMap = new Map<string, Partial<Container>>();
  readonly #resultIds: string[] = [];
  readonly #resultMap = new Map<string, Partial<Result>>();
  #categories: Category[] | null = null;
  #environmentInfo: Record<string, string> | null = null;
  #executorInfo: ExecutorInfo | null = null;

  async getContainerIds() {
    return this.#containerIds;
  }

  async getResultIds() {
    return this.#resultIds;
  }

  async readContainer(uuid: string): Promise<Container> {
    return this.#containerMap.get(uuid)! as Container;
  }

  async readResult(uuid: string): Promise<Result> {
    return this.#resultMap.get(uuid)! as Result;
  }

  async readCategories() {
    return this.#categories;
  }

  async readEnvironmentInfo() {
    return this.#environmentInfo;
  }

  async readExecutorInfo() {
    return this.#executorInfo;
  }

  // Existing helpers
  addResult(result?: Partial<Result> | null) {
    const uuid = result?.uuid || '00000000-0000-0000-0000-000000000000';
    this.#resultIds.push(uuid);
    if (result) this.#resultMap.set(uuid, result);
  }

  addContainer(container?: Partial<Container> | null) {
    const uuid = container?.uuid || '00000000-0000-0000-0000-000000000000';
    this.#containerIds.push(uuid);
    if (container) this.#containerMap.set(uuid, container);
  }

  setCategories(categories: Category[] | null) {
    this.#categories = categories;
  }

  setEnvironmentInfo(env: Record<string, string> | null) {
    this.#environmentInfo = env;
  }

  setExecutorInfo(info: ExecutorInfo | null) {
    this.#executorInfo = info;
  }
}
