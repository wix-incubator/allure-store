import assert from 'node:assert';
import {
  AllureStore,
  fromConfig,
  fromDirectory,
  FileAllureReader,
  FileAllureWriter,
  // Since MJS also doesn't give us runtime interfaces,
  // we just ensure the named exports exist.
} from 'allure-store';

assert(typeof fromConfig === 'function', 'fromConfig should be a function');
assert(typeof fromDirectory === 'function', 'fromDirectory should be a function');

assert(typeof AllureStore === 'function', 'AllureStore should be a class');
assert(typeof FileAllureReader === 'function', 'FileAllureReader should be a class');
assert(typeof FileAllureWriter === 'function', 'FileAllureWriter should be a class');
