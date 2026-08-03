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
  const totalCount = String(safeRows.length).padStart(2, '0');
  const messages = safeRows
    .map(
      (row, index) => {
        const data = row?.data ?? {};
        const message = data.message ?? data.cleanEvent ?? '';

        return `[ EVENT ${String(index + 1).padStart(2, '0')} / TOTAL ${totalCount} ]
Date    : ${toMailText(data.date)} (Base On Korea Time)
IP      : ${toMailText(data.ip)}
Host    : ${toMailText(data.host)}
Message : ${toMailText(message)}`;
      },
    )
    .join('\n\n');

  if (!messages) return '';

  const headingText = heading ? `${toMailText(heading)}\n\n` : '';

  return `${headingText}Dear!
This is KIC Control office in Korea.
Monitoring System detected warning message(s) from your server.
Please check following message(s).

${messages}

Thank you.`;
};
