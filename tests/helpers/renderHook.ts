import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach } from 'vitest';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReactTestRenderer[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount());
});

export async function renderHook<T>(hook: () => T) {
  let current: T;
  function Probe() { current = hook(); return null; }
  let root: ReactTestRenderer;
  await act(async () => { root = create(createElement(Probe)); });
  roots.push(root!);
  return {
    get current() { return current!; },
    async rerender() { await act(async () => root.update(createElement(Probe))); },
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
