import { AsyncLocalStorage } from 'async_hooks';
import type { NextRequest } from 'next/server';

interface RequestContext {
  request: NextRequest;
}

const asyncLocalStorage = new AsyncLocalStorage<Map<string, RequestContext>>();

export function setRequestContext(request: NextRequest): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.set('request', { request });
  }
}

export function getRequestContext(): RequestContext | undefined {
  const store = asyncLocalStorage.getStore();
  return store?.get('request');
}

export { asyncLocalStorage };
