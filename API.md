# API Overview

`allure-store` is built around a central `AllureStore` class that abstracts reading, writing, and transforming Allure data. It uses pluggable `AllureReader` and `AllureWriter` interfaces to allow custom data sources and destinations.

## High-Level Architecture

The core components are:

- **AllureStore**: A single interface for reading and writing Allure data. It delegates low-level operations to `AllureReader` and `AllureWriter` implementations.
- **AllureReader**: Responsible for fetching Allure data (containers, results, categories, environment, executor) from a source (e.g., filesystem, database).
- **AllureWriter**: Responsible for persisting Allure data back to some storage medium (e.g., writing JSON files, updating a database, etc.).

By default, `allure-store` provides:

- `FileAllureReader`: Reads Allure data from a directory containing `*-result.json`, `*-container.json`, `categories.json`, `environment.properties`, and optionally `executor.json`.
- `FileAllureWriter`: Writes data back to a directory using the Allure standard file formats.

## `AllureStore` Lifecycle

1. **Initialization**:
   Use `fromDirectory` or `fromConfig` to create and initialize an `AllureStore` instance.
   - `fromDirectory(resultsDir, options?)`:
     - Creates a `FileAllureReader` and `FileAllureWriter` based on the provided directory.
     - Optional `overwrite` parameter to clear the directory before writing new data.
     - Optional `onError` parameter controlling error handling (`'throw' | 'ignore' | (err: Error) => void`).
   - `fromConfig({ reader, writer })`:
     - Use a custom reader/writer combination.

2. **Reading Data**:
   Once you have an `AllureStore` instance:
   - `getAllResults()`: Returns all results, including merged steps from ancestor containers.
   - `getLatestResults()`: Returns only the most recent result per `historyId`.
   - `getCategories()`: Fetches categories defined for the test results.
   - `getEnvironment()`: Fetches environment properties.
   - `getExecutor()`: Fetches executor info (CI system, etc.).
   - `getContainer(id: string)`: Fetches a specific container.
   - `getResult(id: string)`: Fetches a specific test result.

3. **Writing Data**:
   `AllureStore` also provides methods to write data back to your storage:
   - `writeCategories(categories: Category[])`: Updates the categories file.
   - `writeEnvironmentInfo(info: Record<string, string>)`: Writes environment properties.
   - `writeExecutorInfo(info: ExecutorInfo)`: Writes executor information.
   - `writeContainer(container: Container)`: Writes an `*-container.json` file.
   - `writeResult(result: Result)`: Writes a `*-result.json` file.

4. **Customization & Extensibility**:
   - Create custom `AllureReader` and `AllureWriter` classes to support non-file-based stores:
     ```typescript
     class MyDatabaseReader implements AllureReader {
       async getContainerIds() { /* query DB */ }
       async getResultIds() { /* query DB */ }
       async readContainer(id: string) { /* fetch container from DB */ }
       async readResult(id: string) { /* fetch result from DB */ }
       async readCategories() { /* fetch categories */ }
       async readEnvironmentInfo() { /* fetch environment info */ }
       async readExecutorInfo() { /* fetch executor info */ }
     }
     ```

   - Similarly, implement `AllureWriter` to save data to a desired location.

## Data Structures

The core Allure data types follow the Allure data model:

- **Result**: Represents a single test’s execution data: `uuid`, `historyId`, `name`, `status`, `steps`, etc.
- **Container**: Groups related tests (results) and includes `befores` and `afters` steps.
- **Category**: Defines a set of conditions (e.g., regex-based) to group tests into categories.
- **Environment Info**: Key-value pairs describing the environment (e.g., `NODE_ENV=production`).
- **Executor Info**: Metadata about the system that ran the tests (e.g., CI pipeline details).

For full type definitions, see the TypeScript declarations in [src/types.ts](./src/types.ts).

## Error Handling

Both `FileAllureReader` and `FileAllureWriter` accept an `onError` parameter. This can be:

- `'throw'` (default): Throw an error to be handled by your application.
- `'ignore'`: Suppress errors silently.
- A custom function `(error: Error) => void`: Log or track errors according to your needs.

## Practical Examples

- **Merging Historical Results**:
  You might have multiple runs of the same test (differentiated by `historyId`). `getLatestResults()` returns only the most recent result per test, useful for building a stable, final Allure report.

- **Adding Custom Metadata**:
  Before generating a final Allure report, you can:
  1. Read environment info: `const env = await store.getEnvironment();`
  2. Update it with new data: `env['BUILD_ID'] = process.env.BUILD_ID;`
  3. Write it back: `await store.writeEnvironmentInfo(env);`

- **Integrating with CI**:
  In a CI pipeline, you might:
  1. Download `allure-results` from a previous step.
  2. Initialize `AllureStore` with `fromDirectory`.
  3. Add categories or environment info.
  4. Generate or update an Allure report with the enriched data.

## Next Steps

- Explore the source to understand how `FileAllureReader` and `FileAllureWriter` are implemented.
- Implement your own `AllureReader` and `AllureWriter` if your data isn’t file-based.
- Read the test suite to see practical usage scenarios.
