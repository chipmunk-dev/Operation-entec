import {
  XLSX_MIME,
  backupName,
  outputName,
} from '../../utils/eyecheckWorkbook.js';

export const canOverwrite =
  typeof window !== 'undefined' &&
  typeof window.showOpenFilePicker === 'function';

export const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/** 원본 파일에 덮어쓴다. 권한이 없으면 요청하고, 거부되면 그대로 알린다. */
export const overwriteFile = async (handle, blob) => {
  let writable;
  try {
    writable = await handle.createWritable();
  } catch (error) {
    throw new Error(
      `원본 파일을 열 수 없습니다. 엑셀에서 이 파일을 닫고 다시 시도하세요. (${error?.name || error})`
    );
  }
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // 이미 닫힘
    }
    throw new Error(
      `파일을 쓰는 중 실패했습니다. 원본은 그대로입니다. (${error?.name || error})`
    );
  }
};

/** 덮어쓰기 전 원본 그대로의 사본을 만든다. */
export const backupBlob = async (handle) => {
  const file = await handle.getFile();
  return new Blob([await file.arrayBuffer()], { type: XLSX_MIME });
};

export const ensureWritePermission = async (handle) => {
  const options = { mode: 'readwrite' };
  let permission = (await handle.queryPermission?.(options)) ?? 'granted';
  if (permission !== 'granted') {
    permission = (await handle.requestPermission?.(options)) ?? 'denied';
  }
  if (permission !== 'granted') {
    throw new Error(
      '원본 파일에 쓸 권한을 받지 못했습니다. 다시 시도하거나 덮어쓰기를 끄고 새 파일로 내려받으세요.'
    );
  }
};

export const pickWorkbookHandle = async () => {
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      { description: 'Excel 통합 문서', accept: { [XLSX_MIME]: ['.xlsx'] } },
    ],
  });
  return handle;
};

export const readDroppedFile = async (dataTransfer) => {
  const item = dataTransfer.items?.[0];
  let handle = null;
  if (item?.getAsFileSystemHandle) {
    try {
      const candidate = await item.getAsFileSystemHandle();
      if (candidate?.kind === 'file') handle = candidate;
    } catch {
      // 핸들 없이 진행
    }
  }
  return {
    file: handle ? await handle.getFile() : dataTransfer.files[0],
    handle,
  };
};

/** 백업을 먼저 내려받고 원본을 쓴다. 새 파일 저장은 다운로드만 수행한다. */
export const saveWorkbookFile = async ({
  fileHandle,
  blob,
  fileName,
  date,
  overwrite,
  backup,
  download = downloadBlob,
}) => {
  if (overwrite) {
    if (backup)
      download(await backupBlob(fileHandle), backupName(fileName, date));
    await overwriteFile(fileHandle, blob);
    return `${fileName}에 덮어썼습니다${backup ? ' (백업도 내려받음)' : ''}`;
  }
  const name = outputName(fileName, date);
  download(blob, name);
  return `${name} 내려받음`;
};
