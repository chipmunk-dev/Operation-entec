import { extractPersistentRedirectEvent } from './persistentRedirectParser.js';

const normalizeMessageTabs = (value) =>
  String(value || '')
    .replace(/\t+/gu, ' ')
    .trim();

export const parseGemsMessageRows = (rawInput) =>
  String(rawInput || '')
    .split(/\r?\n/u)
    .map((line, lineIndex) => ({
      line: lineIndex === 0 ? line.replace(/^\uFEFF/u, '') : line,
      lineIndex,
    }))
    .filter(({ line }) => line.trim())
    .map(({ line, lineIndex }) => {
      const delimiterIndex = line.indexOf('\t');
      const hasDelimiter = delimiterIndex >= 0;
      const host = (hasDelimiter ? line.slice(0, delimiterIndex) : line).trim();
      const rawMessage = hasDelimiter ? line.slice(delimiterIndex + 1) : '';
      const eventDetails = extractPersistentRedirectEvent(
        normalizeMessageTabs(rawMessage),
      );

      return {
        id: lineIndex,
        lineNumber: lineIndex + 1,
        host,
        message: eventDetails.cleanEvent,
        confirmationText: eventDetails.processingLog,
        hasDelimiter,
        isComplete: Boolean(host && eventDetails.cleanEvent),
      };
    });

export const formatGemsMessage = (
  rows,
  { mode = 'basic', name = '', position = '사원' } = {},
) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const messageBlocks = safeRows
    .map(
      (row) => `${String(row?.host || '')}
${String(row?.message || '')}`,
    )
    .join('\n\n');

  if (!messageBlocks) return '';
  if (mode !== 'report') return messageBlocks;

  const reporterName = String(name || '').trim() || '(이름)';
  const reporterPosition = String(position || '').trim() || '(직급)';

  return `안녕하세요 상암 상황실 ${reporterName} ${reporterPosition} 입니다.
G-EMS에서 발생한 메세지 전달드리니 확인 부탁드립니다.

${messageBlocks}`;
};
