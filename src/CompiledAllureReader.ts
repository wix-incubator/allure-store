import type { AllureReader } from './AllureReader';
import type { CompiledReportSource } from './CompiledReportSource';
import type { Attachment, Category, Container, ExecutorInfo, Label, Result, Status, Step } from './types';
import { AllureStoreError, type OnErrorHandler, resolveOnError } from './errors';

export interface CompiledAllureReaderConfig {
  source: CompiledReportSource;
  onError?: OnErrorHandler;
}

export class CompiledAllureReader implements AllureReader {
  readonly #source: CompiledReportSource;
  readonly #onError: (error: Error) => void;

  constructor(config: CompiledAllureReaderConfig) {
    this.#source = config.source;
    this.#onError = resolveOnError(config.onError ?? 'throw');
  }

  async init(): Promise<void> {
    await this.#source.init?.();
  }

  async getContainerIds(): Promise<string[]> {
    return [];
  }

  async getResultIds(): Promise<string[]> {
    const files = await this.#source.listFiles('data/test-cases');
    return files.map((f) => {
      const basename = f.split('/').pop()!;
      return basename.replace(/\.json$/, '');
    });
  }

  async readResult(id: string): Promise<Result | null> {
    const content = await this.#source.readFile(`data/test-cases/${id}.json`);
    if (!content) return null;
    try {
      return mapCompiledTestCase(JSON.parse(content));
    } catch (error: unknown) {
      this.#handleError(`Failed to parse compiled test case: ${id}`, error);
      return null;
    }
  }

  async readContainer(_id: string): Promise<Container | null> {
    return null;
  }

  async readCategories(): Promise<Category[] | null> {
    return null;
  }

  async readEnvironmentInfo(): Promise<Record<string, string> | null> {
    const content = await this.#source.readFile('widgets/environment.json');
    if (!content) return null;
    try {
      const entries: { name: string; values: string[] }[] = JSON.parse(content);
      const result: Record<string, string> = {};
      for (const entry of entries) {
        result[entry.name] = entry.values.join(',');
      }
      return result;
    } catch (error: unknown) {
      this.#handleError('Failed to parse environment info', error);
      return null;
    }
  }

  async readExecutorInfo(): Promise<ExecutorInfo | null> {
    const content = await this.#source.readFile('widgets/executors.json');
    if (!content) return null;
    try {
      const executors: ExecutorInfo[] = JSON.parse(content);
      return executors[0] ?? null;
    } catch (error: unknown) {
      this.#handleError('Failed to parse executor info', error);
      return null;
    }
  }

  #handleError(message: string, cause?: unknown): void {
    this.#onError(new AllureStoreError(message, cause));
  }
}

interface CompiledTime {
  start: number;
  stop: number;
  duration: number;
}

interface CompiledAttachment {
  uid?: string;
  name: string;
  type: string;
  source: string;
  size?: number;
}

interface CompiledStep {
  name: string;
  time?: CompiledTime;
  status: Status;
  statusMessage?: string;
  statusTrace?: string;
  steps?: CompiledStep[];
  attachments?: CompiledAttachment[];
  parameters?: { name: string; value: string }[];
}

interface CompiledTestStage {
  status: Status;
  steps?: CompiledStep[];
  attachments?: CompiledAttachment[];
  parameters?: { name: string; value: string }[];
}

type CompiledBooleanFlag = 'flaky' | 'retry' | 'hidden' | 'retriesStatusChange' | 'newFailed' | 'newBroken' | 'newPassed';

interface CompiledTestCase {
  uid: string;
  historyId: string;
  name: string;
  fullName: string;
  time: CompiledTime;
  descriptionHtml?: string;
  status: Status;
  statusMessage?: string;
  statusTrace?: string;
  flaky?: boolean;
  newFailed?: boolean;
  newBroken?: boolean;
  newPassed?: boolean;
  retry?: boolean;
  hidden?: boolean;
  retriesCount?: number;
  retriesStatusChange?: boolean;
  beforeStages?: CompiledStep[];
  testStage?: CompiledTestStage;
  afterStages?: CompiledStep[];
  labels?: Label[];
  links?: { name?: string; url: string; type?: string }[];
  parameters?: { name: string; value: string }[];
}

export function mapCompiledTestCase(source: CompiledTestCase): Result {
  const labels = [...(source.labels ?? [])];
  addSyntheticLabels(labels, source);

  return {
    uuid: source.uid,
    historyId: source.historyId,
    name: source.name,
    fullName: source.fullName,
    start: source.time.start,
    stop: source.time.stop,
    ...(source.descriptionHtml ? { descriptionHtml: source.descriptionHtml } : {}),
    stage: 'finished',
    status: source.status,
    ...mapStatusDetails(source),
    labels,
    ...(source.links ? { links: source.links } : {}),
    ...(source.parameters ? { parameters: source.parameters } : {}),
    steps: assembleSteps(source),
  };
}

function mapStatusDetails(source: { statusMessage?: string; statusTrace?: string }) {
  if (!source.statusMessage && !source.statusTrace) return {};
  return {
    statusDetails: {
      ...(source.statusMessage ? { message: source.statusMessage } : {}),
      ...(source.statusTrace ? { trace: source.statusTrace } : {}),
    },
  };
}

const SYNTHETIC_BOOLEAN_LABELS: [CompiledBooleanFlag, string][] = [
  ['flaky', 'allure2.flaky'],
  ['retry', 'allure2.retry'],
  ['hidden', 'allure2.hidden'],
  ['retriesStatusChange', 'allure2.retriesStatusChange'],
  ['newFailed', 'allure2.newFailed'],
  ['newBroken', 'allure2.newBroken'],
  ['newPassed', 'allure2.newPassed'],
];

function addSyntheticLabels(labels: Label[], source: CompiledTestCase): void {
  for (const [key, labelName] of SYNTHETIC_BOOLEAN_LABELS) {
    if (source[key]) {
      labels.push({ name: labelName, value: 'true' });
    }
  }
  if (source.retriesCount && source.retriesCount > 0) {
    labels.push({ name: 'allure2.retriesCount', value: String(source.retriesCount) });
  }
}

function assembleSteps(source: CompiledTestCase): Step[] {
  const before = (source.beforeStages ?? []).map(mapStep);
  const test = source.testStage?.steps?.map(mapStep) ?? [];
  const after = (source.afterStages ?? []).map(mapStep);
  return [...before, ...test, ...after];
}

function mapStep(step: CompiledStep): Step {
  return {
    name: step.name,
    start: step.time?.start ?? 0,
    stop: step.time?.stop ?? 0,
    stage: 'finished',
    status: step.status,
    ...mapStatusDetails(step),
    ...(step.steps?.length ? { steps: step.steps.map(mapStep) } : {}),
    ...(step.attachments?.length ? { attachments: step.attachments.map(mapAttachment) } : {}),
    ...(step.parameters?.length ? { parameters: step.parameters } : {}),
  };
}

function mapAttachment(att: CompiledAttachment): Attachment {
  return {
    name: att.name,
    type: att.type,
    source: att.source,
    ...(att.size == null ? {} : { size: att.size }),
  };
}
