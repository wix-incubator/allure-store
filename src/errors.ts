/** The allowed types for `onError` configuration. */
export type OnErrorHandler = ((error: Error) => void) | 'throw' | 'ignore';

/** Resolve the given `onError` handler into a function that handles errors consistently. */
export function resolveOnError(onError: OnErrorHandler): (error: Error) => void {
  if (onError === undefined || onError === 'throw') {
    return (e: Error) => { throw e; };
  } else if (onError === 'ignore') {
    return () => {};
  } else {
    // custom error function
    return onError;
  }
}

export class AllureStoreError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, { cause });
    this.name = 'AllureStoreError';
  }
}
