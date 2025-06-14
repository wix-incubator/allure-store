export interface Container {
  uuid: string;
  name?: string;
  children: string[];
  befores?: Step[];
  afters?: Step[];
}

export interface Result {
  uuid: string;
  historyId: string;
  name: string;
  fullName: string;
  start: number;
  stop: number;
  description?: string;
  descriptionHtml?: string;
  stage: Stage;
  status: Status;
  statusDetails?: StatusDetails;
  steps?: Step[];
  labels?: Label[];
  links?: Link[];
  attachments?: Attachment[];
  parameters?: Parameter[];
}

export interface Step {
  name: string;
  start: number;
  stop: number;
  stage: Stage;
  status: Status;
  statusDetails?: StatusDetails;
  steps?: Step[];
  attachments?: Attachment[];
  parameters?: Parameter[];
}

export interface Parameter {
  name: string;
  value: string;
  excluded?: boolean;
  mode?: 'hidden' | 'masked' | 'default';
}

export interface Attachment {
  name: string;
  type: string;
  source: string;
}

/**
 * Input type for writing categories that allows RegExp objects which will be serialized to strings.
 * Used by {@link AllureWriter.writeCategories}.
 */
export interface CategoryInput {
  name?: string;
  messageRegex?: string | RegExp;
  traceRegex?: string | RegExp;
  matchedStatuses?: Status[];
  flaky?: boolean;
}

/**
 * Category type that ensures regex fields are strings.
 *
 * @inheritDoc
 * @see {@link CategoryInput} for the input type that allows RegExp objects
 */
export interface Category extends CategoryInput {
  messageRegex?: string;
  traceRegex?: string;
}

export interface ExecutorInfo {
  name?: string;
  type?: string;
  url?: string;
  buildOrder?: number;
  buildName?: string;
  buildUrl?: string;
  reportUrl?: string;
  reportName?: string;
}

export interface Label {
  name: string;
  value: string;
}

export interface Link {
  name?: string;
  url: string;
  type?: string;
}

export interface StatusDetails {
  message?: string;
  trace?: string;
}

export type Stage = 'scheduled' | 'running' | 'finished' | 'pending' | 'interrupted';

export type Status = 'failed' | 'broken' | 'passed' | 'skipped' | 'unknown';
