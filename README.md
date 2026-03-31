<div align="center">
  <img src=".idea/icon.svg" width="64" height="64" alt="Allure Store logo" />

  # allure-store

  A flexible and extensible store for reading, writing, and transforming [Allure](https://docs.qameta.io/allure/) test results [^1].

  [![npm version](https://img.shields.io/npm/v/allure-store.svg)](https://www.npmjs.com/package/allure-store)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![CI Status](https://github.com/wix-incubator/allure-store/actions/workflows/ci.yml/badge.svg)](https://github.com/wix-incubator/allure-store/actions)
</div>

## Introduction

`allure-store` provides a standardized interface (the **AllureStore**) to:

- Read existing Allure test results from a variety of sources (e.g., local filesystem, remote storage).
- Write new Allure data (results, categories, environment info, etc.) for downstream consumers or tools.
- Transform, aggregate, or customize Allure test data before generating a final Allure report.

By abstracting the data access behind `AllureReader` and `AllureWriter` interfaces, `allure-store` makes it simple to plug in custom storage backends, apply custom transformations, or integrate seamlessly into your CI/CD pipeline.

## 🌟 Key Features

- **Unified API**: Interact with Allure test results, containers, categories, environment, and executor info using a single, simple API (`AllureStore`).
- **Filesystem Integration**: Use built-in utilities to read from/write to a traditional `allure-results` directory.
- **Compiled Report Support**: Read compiled Allure2 reports — local directories, HTTP URLs, and single-file HTML reports — via `fromReport`.
- **Custom Integration Points**: Implement `AllureReader` and `AllureWriter` interfaces to read from or write to any storage backend—databases, cloud storage, etc.
- **Result Aggregation**: Merge parent test containers and child results to produce enriched test data for Allure-compatible tools.
- **Flexible Composition**: Combine multiple data sources or transform results before finalizing your Allure report.

## 🚀 Installation

Install with your preferred package manager:

```bash
npm install allure-store
# or
yarn add allure-store
```

## 📖 Quick Start

### Reading Results from a Directory

If you have an existing `allure-results` directory (produced by Allure or a tool that supports it):

```typescript
import { fromDirectory } from 'allure-store';

(async () => {
  const store = await fromDirectory('allure-results');

  const allResults = await store.getAllResults();
  console.log('All test results:', allResults);

  const latestResults = await store.getLatestResults();
  console.log('Latest results per historyId:', latestResults);

  const categories = await store.getCategories();
  console.log('Categories:', categories);
})();
```

### Writing Data Back

You can also write categories, environment info, or even individual test results:

```typescript
import { fromDirectory } from 'allure-store';

(async () => {
  const store = await fromDirectory('allure-results', { overwrite: true });

  await store.writeEnvironmentInfo({
    NODE_ENV: 'production',
    SERVICE_URL: 'https://api.example.com',
  });

  await store.writeCategories([
    { name: 'Product defects', matchedStatuses: ['failed'] },
    { name: 'Test defects', matchedStatuses: ['broken'] },
  ]);
})();
```

### Reading a Compiled Allure2 Report

If you have a compiled Allure2 report (the output of `allure generate`), use `fromReport`. It accepts a local directory, a local HTML file, an HTTP(S) URL, or a `file://` URL:

```typescript
import { fromReport } from 'allure-store';

(async () => {
  // From a local report directory
  const store = await fromReport('/path/to/allure-report');

  // From a single-file HTML report
  const store2 = await fromReport('/path/to/report.html');

  // From a URL (auto-detects multi-file vs single-file)
  const store3 = await fromReport('https://my-report.example.com/');

  const allResults = await store.getAllResults();
  console.log('All test results:', allResults.length);

  // Latest results deduplicated by historyId (retries resolved)
  const latestResults = await store.getLatestResults();
  console.log('Unique tests:', latestResults.length);
})();
```

> **Note:** Compiled reports are read-only. Write operations will throw an error.

### Using Custom Readers/Writers

If your results are stored in a different system, implement the `AllureReader` and `AllureWriter` interfaces and provide them to `fromConfig`:

```typescript
import { fromConfig, AllureReader, AllureWriter } from 'allure-store';

const customReader: AllureReader = {
  async getContainerIds() { /* ... */ },
  async getResultIds() { /* ... */ },
  async readContainer(id: string) { /* ... */ },
  async readResult(id: string) { /* ... */ },
  async readCategories() { /* ... */ },
  async readEnvironmentInfo() { /* ... */ },
  async readExecutorInfo() { /* ... */ },
};

const customWriter: AllureWriter = {
  async writeCategories(categories) { /* ... */ },
  async writeEnvironmentInfo(env) { /* ... */ },
  async writeExecutorInfo(info) { /* ... */ },
  async writeContainer(container) { /* ... */ },
  async writeResult(result) { /* ... */ },
};

(async () => {
  const store = await fromConfig({ reader: customReader, writer: customWriter });
  const results = await store.getAllResults();
  console.log('Custom source results:', results);
})();
```

## When to Use `allure-store`

- **Custom CI Integrations**: Integrate Allure data from multiple pipelines or artifact stores, then produce a final Allure report.
- **Data Transformation**: Filter, enrich, or modify Allure results before final reporting.
- **Non-File Storage**: If your Allure data isn’t file-based, `allure-store` provides an abstraction to still leverage Allure’s ecosystem.

## Additional Documentation

- **[API Documentation](./API.md)**: Detailed information on the store design, available methods, and data types.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Guidelines for contributing to this project.
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**: Our expectations for community interactions.

## 🌐 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to get started.

## 📃 License

This project is licensed under the [MIT License](LICENSE).

[^1]: **Note:** `allure-store` is not affiliated with the official Allure framework. It aims to provide a compatible and convenient way to handle Allure data.
