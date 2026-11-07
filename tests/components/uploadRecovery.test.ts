import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import UploadRecovery from '../../src/components/media/UploadRecovery';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fake = vi.hoisted(() => ({ jobs: [] as any[], list: vi.fn(), resume: vi.fn(), used: vi.fn(), starts: 0, ends: 0, failList: false }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable' }));
vi.mock('../../src/components/ui/Button', () => ({ default: ({ children, onPress, disabled, loading }: any) => createElement('Button', { onPress, disabled, loading }, children) }));
vi.mock('../../src/lib/storage/uploadJournal', () => ({ listUploadJobs: fake.list }));

const job = { ownerId: 'a', operationId: 'op', recordedDate: '2026-11-08', kind: 'form-video', file: { uri: 'file://clip', name: 'clip.mp4', type: 'video/mp4', size: 20 }, ready: true, createdAt: 'now' };
let root: ReactTestRenderer | undefined;
beforeEach(() => { fake.jobs = [job]; fake.list.mockImplementation(async () => {
  if (fake.failList) throw new Error('Disk unavailable'); return { jobs: fake.jobs, more: fake.jobs.length > 20 };
}); fake.resume.mockReset().mockResolvedValue({ key: 'form-video/a/op' }); fake.used.mockReset(); fake.starts = 0; fake.ends = 0; fake.failList = false; });
afterEach(async () => { await act(async () => root?.unmount()); root = undefined; });
async function mount(owner = 'a', disabled = false) { await act(async () => { root = create(createElement(UploadRecovery, { media: { ownerId: owner, status: 'idle', error: null, result: null, upload: vi.fn(), resume: fake.resume, reset: vi.fn() }, kind: 'form-video', disabled, onUse: fake.used, onStart: () => fake.starts++, onEnd: () => fake.ends++ })); }); }
function button(text: string) { return root!.root.findAllByType('Button' as any).find(node => node.children.join('') === text)!; }
async function open() { await act(async () => { button('Recover previous uploads').props.onPress(); }); }

it('pages through a large journal and reloads after a read error', async () => {
  fake.jobs = Array.from({ length: 21 }, (_, i) => ({ ...job, operationId: `op${i}` })); fake.failList = true;
  await mount(); await open(); expect(JSON.stringify(root!.toJSON())).toContain('Disk unavailable');
  fake.failList = false; await act(async () => button('Reload uploads').props.onPress());
  expect(fake.list).toHaveBeenLastCalledWith('a', 0);
  await act(async () => button('Older uploads').props.onPress());
  expect(fake.list).toHaveBeenLastCalledWith('a', 20);
  expect(JSON.stringify(root!.toJSON())).toContain('clip.mp4');
});

it('does not resume when the target is blocked', async () => { await mount('a', true); await open(); await act(async () => button('Resume and use this upload').props.onPress()); expect(fake.resume).not.toHaveBeenCalled(); expect(fake.used).not.toHaveBeenCalled(); });

it('only uses a recovered clip after same operation resume succeeds', async () => {
  await mount(); await open(); await act(async () => button('Resume and use this upload').props.onPress());
  expect(fake.resume).toHaveBeenCalledWith('op'); expect(fake.used).toHaveBeenCalledWith({ key: 'form-video/a/op' }); expect(fake.starts).toBe(1); expect(fake.ends).toBe(1);
});

it('does not attach when resuming the journal entry fails', async () => {
  fake.resume.mockRejectedValue(new Error('File changed')); await mount(); await open(); await act(async () => button('Resume and use this upload').props.onPress());
  expect(fake.used).not.toHaveBeenCalled(); expect(fake.ends).toBe(1); expect(JSON.stringify(root!.toJSON())).toContain('File changed');
});

it('ignores a recovered upload that resolves after switching owners', async () => {
  let resolve!: (value: unknown) => void; fake.resume.mockReturnValue(new Promise(r => { resolve = r; }));
  await mount(); await open(); let pending: Promise<void>;
  await act(async () => { pending = button('Resume and use this upload').props.onPress(); });
  await act(async () => { root!.update(createElement(UploadRecovery, { media: { ownerId: 'b', status: 'idle', error: null, result: null, upload: vi.fn(), resume: fake.resume, reset: vi.fn() }, kind: 'form-video', onUse: fake.used })); });
  await act(async () => { resolve({ key: 'form-video/a/op' }); await pending!; });
  expect(fake.used).not.toHaveBeenCalled();
});
