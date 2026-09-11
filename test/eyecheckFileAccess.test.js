import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureWritePermission,
  readDroppedFile,
  saveWorkbookFile,
} from '../src/pages/EyeCheckLightLog/fileAccess.js';

test('덮어쓰기 전에 기존 바이트를 백업하고 새 바이트를 기록한다', async () => {
  let original = new Blob(['before']);
  let pending;
  const events = [];
  const downloads = [];
  const fileHandle = {
    getFile: async () => original,
    createWritable: async () => {
      events.push('open');
      return {
        write: async (blob) => {
          pending = blob;
        },
        close: async () => {
          original = pending;
          events.push('saved');
        },
      };
    },
  };
  const message = await saveWorkbookFile({
    fileHandle,
    blob: new Blob(['after']),
    fileName: 'sample.xlsx',
    date: '2026-09-08',
    overwrite: true,
    backup: true,
    download: (blob, name) => {
      events.push('backup');
      downloads.push({ blob, name });
    },
  });
  assert.deepEqual(events, ['backup', 'open', 'saved']);
  assert.equal(await downloads[0].blob.text(), 'before');
  assert.equal(downloads[0].name, 'sample_백업_20260908.xlsx');
  assert.equal(await original.text(), 'after');
  assert.equal(message, 'sample.xlsx에 덮어썼습니다 (백업도 내려받음)');
});

test('쓰기 실패 때 원본 커밋을 중단하고 앞서 만든 백업은 유지한다', async () => {
  const original = new Blob(['original']);
  const downloads = [];
  let committed = false;
  let aborted = false;
  await assert.rejects(
    saveWorkbookFile({
      fileHandle: {
        getFile: async () => original,
        createWritable: async () => ({
          write: async () => {
            throw new Error('disk full');
          },
          close: async () => {
            committed = true;
          },
          abort: async () => {
            aborted = true;
          },
        }),
      },
      blob: new Blob(['changed']),
      fileName: 'sample.xlsx',
      date: '2026-09-08',
      overwrite: true,
      backup: true,
      download: (blob) => downloads.push(blob),
    }),
    /파일을 쓰는 중 실패/
  );
  assert.equal(committed, false);
  assert.equal(aborted, true);
  assert.equal(await downloads[0].text(), 'original');
});

test('쓰기 권한 거부를 호출자에게 전달하고 요청한 권한 범위를 유지한다', async () => {
  const requested = [];
  await assert.rejects(
    ensureWritePermission({
      queryPermission: async (options) => {
        requested.push(options);
        return 'prompt';
      },
      requestPermission: async (options) => {
        requested.push(options);
        return 'denied';
      },
    }),
    /쓸 권한을 받지 못했습니다/
  );
  assert.deepEqual(requested, [{ mode: 'readwrite' }, { mode: 'readwrite' }]);
});

test('드롭 파일의 핸들을 얻지 못하면 제공된 파일로 연다', async () => {
  const file = new Blob(['workbook']);
  const result = await readDroppedFile({
    items: [
      {
        getAsFileSystemHandle: async () => {
          throw new Error('unsupported');
        },
      },
    ],
    files: [file],
  });
  assert.equal(result.file, file);
  assert.equal(result.handle, null);
});
