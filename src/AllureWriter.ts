import type { Category, Container, ExecutorInfo, Result } from './types';

export interface AllureWriter {
  /**
   * (Optional) Initializes the writer.
   * Can be used to set up necessary resources or configurations for writing data.
   */
  init?(): Promise<void>;

  /**
   * (Optional) Cleans up any resources used by the writer.
   * Should be called when writing operations are complete to release resources.
   */
  cleanup?(): Promise<void>;

  /**
   * Writes the categories to a categories.json file or similar storage.
   * @param categories - An array of categories to be written.
   */
  writeCategories(categories: Category[]): Promise<void>;

  /**
   * Writes environment information to an environment.properties file or similar storage.
   * @param info - A record containing key-value pairs of environment properties.
   */
  writeEnvironmentInfo(info: Record<string, string>): Promise<void>;

  /**
   * Writes executor information to an executor.json file or similar storage.
   * @param info - Information about the executor of the tests.
   */
  writeExecutorInfo(info: ExecutorInfo): Promise<void>;

  /**
   * Writes a container to the storage by its identifier.
   * @param result - The container object to be written.
   */
  writeContainer(result: Container): Promise<void>;

  /**
   * Writes a test result to the storage by its identifier.
   * @param result - The result object to be written.
   */
  writeResult(result: Result): Promise<void>;
}
