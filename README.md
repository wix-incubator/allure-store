<div align="center">

<img src=".idea/icon.svg" width=64 height=64 />

# allure-store

A flexible and extensible store for reading, writing, and transforming [Allure](https://docs.qameta.io/allure/) test results [^1].

[![npm version](https://img.shields.io/npm/v/allure-store.svg)](https://www.npmjs.com/package/allure-store)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI Status](https://github.com/wix-incubator/allure-store/actions/workflows/ci.yml/badge.svg)](https://github.com/wix-incubator/allure-store/actions)

</div>

## 🌟 Features

- **Unified API**: Interact with Allure test results, containers, categories, environment, and executor info using a single, simple interface.
- **Filesystem Integration**: Easily read from and write Allure results in the familiar `allure-results` directory structure.
- **Custom Readers/Writers**: Inject your own `AllureReader` and `AllureWriter` implementations to integrate with your preferred storage backends.
- **Result Aggregation**: Merge test containers and results to produce enriched test data for Allure-compatible tools.
- **Flexible Composition**: Combine multiple data sources or transform results before generating your final Allure report.

## 🚀 Installation

```bash
npm install allure-store
```

or

```bash
yarn add allure-store
```

## 📖 Usage

### Initializing from a Directory

If you already have generated Allure results in a directory (e.g. `allure-results`), you can create a store directly:

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

  const environment = await store.getEnvironment();
  console.log('Environment info:', environment);
})();
```

### Writing Data

You can also write data back to the Allure results directory (or another destination) using the store’s writer:

```typescript
import { fromDirectory } from 'allure-store';

(async () => {
  // You can pass optional 'overwrite' parameter to delete the directory before writing anything
  const store = await fromDirectory('allure-results', { overwrite: true });

  // Add/update environment info
  await store.writeEnvironmentInfo({
    NODE_ENV: 'production',
    SERVICE_URL: 'https://api.example.com',
  });

  // Add new categories
  await store.writeCategories([
    { name: 'Product defects', matchedStatuses: ['failed'] },
    { name: 'Test defects', matchedStatuses: ['broken'] },
  ]);
})();
```

### Using a Custom Configuration

If you have a custom `AllureReader` or `AllureWriter`:

```typescript
import { fromConfig, AllureStore, AllureReader, AllureWriter } from 'allure-store';

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
  // ...do something with results...
})();
```

## API Overview

**Core Exports:**

- **Classes:**
  - `AllureStore`: Main class managing both reading and writing of Allure data.

- **Factory Functions:**
  - `fromConfig(options: AllureStoreConfig): Promise<AllureStore>`
  - `fromDirectory(options: FileSystemAllureWriterConfig): Promise<AllureStore>`

- **Types & Interfaces:**
  - `AllureReader`, `AllureWriter`: Protocols for custom readers/writers.
  - `AllureResult`, `AllureContainer`, `AllureStep`, `AllureParameter`, `Category`, `ExecutorInfo` and other core Allure data types.

## Use Cases

- **Custom CI Integrations**: Use `allure-store` to load Allure results from your CI artifacts and produce a final enriched Allure report.
- **Data Transformation**: Before generating the final report, read and manipulate test results (e.g., filter out certain tests, add environment details, or group tests differently).
- **Storage Abstraction**: If your results are stored in a database or remote object storage, implement a custom `AllureReader` and `AllureWriter` to integrate seamlessly.

## 🌐 Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.

1. Fork the repository
2. Create a new branch for your feature or fix
3. Submit a PR once you’re ready

## 📃 License

> [!NOTE]
> `allure-store` is not affiliated with the official Allure framework, but it aims to provide a compatible and convenient way to handle Allure data.

This project is licensed under the [MIT License](LICENSE).

[^1]: **Note:** `allure-store` is not affiliated with the official Allure framework, but it aims to provide a compatible and convenient way to handle Allure data.
