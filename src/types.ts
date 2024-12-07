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

export interface Category {
  name?: string;
  description?: string;
  descriptionHtml?: string;
  messageRegex?: string;
  traceRegex?: string;
  matchedStatuses?: Status[];
  flaky?: boolean;
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
