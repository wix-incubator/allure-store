import type { AllureStoreConfig, AllureStoreDirectoryConfig, AllureStoreReportConfig } from './AllureStore';
import { AllureStore } from './AllureStore';

/**
 * Create an AllureStore from a configuration object.
 */
export async function fromConfig(options: AllureStoreConfig): Promise<AllureStore> {
  return AllureStore.fromConfig(options);
}

/**
 * Create an AllureStore from a directory of raw allure-results.
 */
export async function fromDirectory(resultsDirectory: string, options?: AllureStoreDirectoryConfig): Promise<AllureStore> {
  return AllureStore.fromDirectory(resultsDirectory, options);
}

/**
 * Create an AllureStore from a compiled Allure2 report with auto-detection.
 *
 * Accepts a local directory, a local HTML file, or an HTTP(S) URL.
 * Detects the input type heuristically:
 * - `file://` URLs are resolved to local paths
 * - Local directories use {@link FileReportSource}
 * - Local files are treated as single-file HTML reports via {@link HtmlReportSource}
 * - HTTP(S) URLs returning HTML with embedded data use {@link HtmlReportSource}
 * - HTTP(S) URLs returning the Allure UI shell use {@link UrlReportSource}
 */
export async function fromReport(input: string, options?: AllureStoreReportConfig): Promise<AllureStore> {
  return AllureStore.fromReport(input, options);
}

export { type AllureReader } from './AllureReader';
export { type AllureWriter } from './AllureWriter';
export { AllureStore, type AllureStoreConfig, type AllureStoreDirectoryConfig, type AllureStoreReportConfig } from './AllureStore';
export { FileAllureWriter, type FileSystemAllureWriterConfig } from './FileAllureWriter';
export { FileAllureReader, type FileAllureReaderConfig } from './FileAllureReader';
export { CompiledAllureReader, type CompiledAllureReaderConfig } from './CompiledAllureReader';
export {
  type CompiledReportSource,
  FileReportSource,
  UrlReportSource,
  HtmlReportSource,
} from './CompiledReportSource';
export * from './types';
