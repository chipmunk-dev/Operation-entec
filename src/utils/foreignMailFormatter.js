import {
  extractPersistentRedirectEvent,
  parsePersistentRedirectRows,
} from './persistentRedirectParser.js';

export const FOREIGN_MAIL_FIELDS = ['host', 'message', 'date', 'ip'];

const toPersistentRedirectField = (field) =>
  field === 'message' ? 'event' : field;

export const parseForeignMailRows = (
  rawInput,
  inputColumnOrder = FOREIGN_MAIL_FIELDS,
) => {
  const parserColumnOrder = inputColumnOrder.map(toPersistentRedirectField);

  return parsePersistentRedirectRows(rawInput, parserColumnOrder).map((row) => {
    const eventDetails = extractPersistentRedirectEvent(row.data.event);

    return {
      ...row,
      data: {
        host: row.data.host,
        message: eventDetails.cleanEvent,
        date: row.data.date,
        ip: row.data.ip,
      },
      confirmationText: eventDetails.processingLog,
    };
  });
};

const toMailText = (value) => (value == null ? '' : String(value));

export const formatForeignMail = (rows, options = {}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const { heading = '' } = options ?? {};
  const lineDivider = '-------------------------------------------------------';

  // 각 이벤트를 문자열로 변환
  const messages = safeRows
    .map((row) => {
      const data = row?.data ?? {};
      const message = data.message ?? data.cleanEvent ?? '';

      return `Date    : ${toMailText(data.date)} (Base On Korea Time)
IP      : ${toMailText(data.ip)}
Host    : ${toMailText(data.host)}
Message : ${toMailText(message)}`;
    })
    // 각 이벤트 내용 앞뒤를 점선으로 감싸기 위해 조인 규칙 변경
    .join(`\n${lineDivider}\n`);

  if (!messages) return '';

  const headingText = heading ? `${toMailText(heading)}\n\n` : '';

  // 시작 점선과 끝 점선을 붙여서 최종 템플릿 완성
  return `${headingText}Dear!
This is KIC Control office in Korea.
Monitoring System detected warning message(s) from your server.
Please check following message(s).

${lineDivider}
${messages}
${lineDivider}

Thank you.`;
};

