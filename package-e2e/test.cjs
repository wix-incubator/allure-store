const assert = require('assert');
const {
  AllureStore,
  fromConfig,
  fromDirectory,
  FileAllureReader,
  FileAllureWriter,
  // Type exports won't be runtime objects, so we can't assert them directly,
  // but we can at least check some known runtime values like classes.
} = require('allure-store');

// Check functions
assert(typeof fromConfig === 'function', 'fromConfig should be a function');
assert(typeof fromDirectory === 'function', 'fromDirectory should be a function');

// Check classes
assert(typeof AllureStore === 'function', 'AllureStore should be a class/function');
assert(typeof FileAllureReader === 'function', 'FileAllureReader should be a class/function');
assert(typeof FileAllureWriter === 'function', 'FileAllureWriter should be a class/function');
