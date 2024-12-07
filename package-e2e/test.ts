import {
  AllureStore,
  AllureStoreConfig,
  AllureStoreDirectoryConfig,
  fromConfig,
  fromDirectory,
  AllureReader,
  AllureWriter,
  FileAllureReader,
  FileAllureReaderConfig,
  FileAllureWriter,
  FileSystemAllureWriterConfig,
  Container,
  Result,
  Category,
  ExecutorInfo,
  Step,
  Parameter,
  Attachment,
  Label,
  Link,
  StatusDetails,
  Stage,
  Status
} from 'allure-store';

declare function assertType<T>(value: T): T;

// Check classes and functions
assertType<typeof AllureStore>(AllureStore);
assertType<(options: AllureStoreConfig) => Promise<AllureStore>>(fromConfig);
assertType<(resultsDirectory: string, options?: AllureStoreDirectoryConfig) => Promise<AllureStore>>(fromDirectory);

// Check Reader/Writer interfaces
const dummyReader: AllureReader = {
  getContainerIds: async () => [],
  getResultIds: async () => [],
  readContainer: async () => null,
  readResult: async () => null,
  readCategories: async () => null,
  readEnvironmentInfo: async () => null,
  readExecutorInfo: async () => null
};
assertType<AllureReader>(dummyReader);

const dummyWriter: AllureWriter = {
  writeCategories: async () => {},
  writeEnvironmentInfo: async () => {},
  writeExecutorInfo: async () => {},
  writeContainer: async () => {},
  writeResult: async () => {}
};
assertType<AllureWriter>(dummyWriter);
assertType<FileAllureReader>(new FileAllureReader({ resultsDirectory: 'fake-dir' }));
assertType<FileAllureWriter>(new FileAllureWriter({ resultsDirectory: 'fake-dir' }));

// Check File readers/writers configs
assertType<FileAllureReaderConfig>({ resultsDirectory: 'fake-dir' });
assertType<FileSystemAllureWriterConfig>({ resultsDirectory: 'fake-dir', overwrite: true });

// Check various data types
assertType<Container>({ uuid: 'fake-uuid', children: [] });
assertType<Result>({
  uuid: 'r-uuid',
  historyId: 'h-id',
  name: 'Test',
  fullName: 'Test Full',
  start: 0,
  stop: 1,
  stage: 'finished',
  status: 'passed'
});
assertType<Category>({ name: 'My Category', matchedStatuses: ['failed'] });
assertType<ExecutorInfo>({});
assertType<Step>({
  name: 'step',
  start: 0,
  stop: 1,
  stage: 'finished',
  status: 'passed'
});
assertType<Parameter>({ name: 'param', value: 'val' });
assertType<Attachment>({ name: 'attach', type: 'text/plain', source: 'path/to/file' });
assertType<Label>({ name: 'label', value: 'val' });
assertType<Link>({ url: 'http://example.com' });
assertType<StatusDetails>({});
assertType<Stage>('finished');
assertType<Status>('passed');
