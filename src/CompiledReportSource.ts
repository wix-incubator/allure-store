import fs from 'node:fs/promises';
import path from 'node:path';

export interface CompiledReportSource {
  init?(): Promise<void>;
  readFile(relativePath: string): Promise<string | null>;
  listFiles(prefix: string): Promise<string[]>;
}

export function stripFileProtocol(input: string): string {
  return input.startsWith('file://') ? input.slice(7) : input;
}

export class FileReportSource implements CompiledReportSource {
  readonly #dir: string;

  constructor(dir: string) {
    this.#dir = dir;
  }

  async readFile(relativePath: string): Promise<string | null> {
    const resolved = path.resolve(this.#dir, relativePath);
    if (!resolved.startsWith(path.resolve(this.#dir) + path.sep)) return null;
    try {
      return await fs.readFile(resolved, 'utf8');
    } catch {
      return null;
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const dir = path.resolve(this.#dir, prefix);
    if (!dir.startsWith(path.resolve(this.#dir) + path.sep)) return [];
    try {
      const entries = await fs.readdir(dir);
      return entries.map((e) => `${prefix}/${e}`);
    } catch {
      return [];
    }
  }
}

export class UrlReportSource implements CompiledReportSource {
  readonly #baseUrl: string;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async readFile(relativePath: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.#baseUrl}/${relativePath}`);
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  }

  // Only 'data/test-cases' is supported — URL-based reports have no directory listing,
  // so test case UIDs are discovered via 'widgets/status-chart.json' instead.
  async listFiles(prefix: string): Promise<string[]> {
    if (prefix === 'data/test-cases') {
      return this.#listTestCaseFiles();
    }
    return [];
  }

  async #listTestCaseFiles(): Promise<string[]> {
    const content = await this.readFile('widgets/status-chart.json');
    if (!content) return [];
    try {
      const entries: { uid: string }[] = JSON.parse(content);
      return entries.map((e) => `data/test-cases/${e.uid}.json`);
    } catch {
      return [];
    }
  }
}

const HTML_DATA_PATTERN = /\bd\(["']([^"']+)["'],\s*["']([^"']+)["']\)/;
const HTML_DATA_PATTERN_GLOBAL = new RegExp(HTML_DATA_PATTERN, 'g');

export class HtmlReportSource implements CompiledReportSource {
  readonly #input: string;
  readonly #prefetched: string | undefined;
  readonly #files = new Map<string, string>();

  constructor(fileOrUrl: string, prefetchedHtml?: string) {
    this.#input = fileOrUrl;
    this.#prefetched = prefetchedHtml;
  }

  async init(): Promise<void> {
    const html = this.#prefetched ?? await this.#fetchHtml();
    if (!html) return;

    for (const match of html.matchAll(HTML_DATA_PATTERN_GLOBAL)) {
      this.#files.set(match[1], Buffer.from(match[2], 'base64').toString('utf8'));
    }
  }

  async readFile(relativePath: string): Promise<string | null> {
    return this.#files.get(relativePath) ?? null;
  }

  async listFiles(prefix: string): Promise<string[]> {
    return [...this.#files.keys()].filter((k) => k.startsWith(prefix));
  }

  async #fetchHtml(): Promise<string | null> {
    const input = this.#input;

    if (input.startsWith('http://') || input.startsWith('https://')) {
      try {
        const response = await fetch(input);
        if (!response.ok) return null;
        return await response.text();
      } catch {
        return null;
      }
    }

    try {
      return await fs.readFile(stripFileProtocol(input), 'utf8');
    } catch {
      return null;
    }
  }
}

export function containsHtmlDataCalls(content: string): boolean {
  return HTML_DATA_PATTERN.test(content);
}
