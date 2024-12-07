import type {AllureStoreConfig, AllureStoreDirectoryConfig} from './AllureStore';
import { AllureStore } from './AllureStore';

/**
 * Create an AllureStore from a configuration object.
 */
export async function fromConfig(options: AllureStoreConfig): Promise<AllureStore> {
  return AllureStore.fromConfig(options);
}

/**
 * Create an AllureStore from a directory configuration.
 */
export async function fromDirectory(resultsDirectory: string, options?: AllureStoreDirectoryConfig): Promise<AllureStore> {
  return AllureStore.fromDirectory(resultsDirectory, options);
}

export { type AllureReader } from './AllureReader';
export { type AllureWriter } from './AllureWriter';
export { AllureStore, type AllureStoreConfig, type AllureStoreDirectoryConfig } from './AllureStore';
export { FileAllureWriter, type FileSystemAllureWriterConfig } from './FileAllureWriter';
export { FileAllureReader, type FileAllureReaderConfig } from './FileAllureReader';
export * from './types';
