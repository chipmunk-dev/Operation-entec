import { sanitizeBackupState } from './autoBackupStorage.js';

export const BACKUP_TRANSFER_TYPE = 'operation-entec-backup-report';
export const BACKUP_TRANSFER_VERSION = 1;
export const MAX_BACKUP_TRANSFER_SIZE = 4 * 1024 * 1024;

const getByteLength = (value) => new TextEncoder().encode(value).byteLength;

const assertHasBackupInput = (state, zones) => {
  if (!zones.some((zone) => state.inputs[zone].trim())) {
    throw new Error('내보내거나 불러올 백업 데이터가 없습니다.');
  }
};

const assertTransferSize = (serialized) => {
  if (getByteLength(serialized) > MAX_BACKUP_TRANSFER_SIZE) {
    throw new Error('공유 JSON 파일이 허용 크기(4MB)를 초과했습니다.');
  }
};

export const createBackupTransfer = (state, zones, exportedAt = new Date()) => {
  const sanitized = sanitizeBackupState(state, zones);
  assertHasBackupInput(sanitized, zones);

  const date = exportedAt instanceof Date ? exportedAt : new Date(exportedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error('JSON 파일의 내보낸 시각이 올바르지 않습니다.');
  }

  return {
    type: BACKUP_TRANSFER_TYPE,
    version: BACKUP_TRANSFER_VERSION,
    exportedAt: date.toISOString(),
    data: sanitized,
  };
};

export const serializeBackupTransfer = (state, zones, exportedAt) => {
  const serialized = JSON.stringify(
    createBackupTransfer(state, zones, exportedAt),
    null,
    2,
  );
  assertTransferSize(serialized);
  return serialized;
};

export const parseBackupTransfer = (serialized, zones) => {
  if (typeof serialized !== 'string') {
    throw new Error('공유 JSON 파일을 텍스트로 읽을 수 없습니다.');
  }
  assertTransferSize(serialized);

  let candidate;
  try {
    candidate = JSON.parse(serialized.replace(/^\uFEFF/u, ''));
  } catch {
    throw new Error('올바른 JSON 파일이 아닙니다.');
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('공유 JSON 파일의 구조가 올바르지 않습니다.');
  }
  if (candidate.type !== BACKUP_TRANSFER_TYPE) {
    throw new Error('Operation CNS Elect 자동 백업 공유 파일이 아닙니다.');
  }
  if (candidate.version !== BACKUP_TRANSFER_VERSION) {
    throw new Error('지원하지 않는 공유 JSON 파일 버전입니다.');
  }
  if (typeof candidate.exportedAt !== 'string') {
    throw new Error('JSON 파일에 내보낸 시각이 없습니다.');
  }

  const exportedAt = new Date(candidate.exportedAt);
  if (Number.isNaN(exportedAt.getTime())) {
    throw new Error('JSON 파일의 내보낸 시각이 올바르지 않습니다.');
  }

  const state = sanitizeBackupState(candidate.data, zones);
  assertHasBackupInput(state, zones);

  return {
    state,
    exportedAt: exportedAt.toISOString(),
  };
};

export const createBackupTransferFileName = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    'operation-entec-backup',
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    `${pad(date.getHours())}${pad(date.getMinutes())}`,
  ].join('-') + '.json';
};
