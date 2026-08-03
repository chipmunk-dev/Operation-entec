export const PERSISTENT_REDIRECT_FIELDS = [
  { key: 'host', label: 'Host' },
  { key: 'event', label: 'Event' },
  { key: 'date', label: 'Date' },
  { key: 'ip', label: 'IP' },
];

export const DEFAULT_PERSISTENT_REDIRECT_ORDER =
  PERSISTENT_REDIRECT_FIELDS.map(({ key }) => key);

export const startsWithSConfirmationContent = (value) =>
  /^[sS](?=$|\s)/u.test(String(value || '').trim());

export const requiresPersistentRedirectReview = (value) => {
  const content = String(value || '').trim();
  if (!content) return false;

  const contentWithoutNotSkipMarkers = content.replace(
    /(?:skip|스킵)\s*[xX](?![A-Za-z])/giu,
    '',
  );
  const hasNotSkipMarker = contentWithoutNotSkipMarkers !== content;

  if (/(?:skip|스킵)/iu.test(contentWithoutNotSkipMarkers)) return true;
  if (hasNotSkipMarker) return false;

  return startsWithSConfirmationContent(content);
};

export const extractPersistentRedirectEvent = (value) => {
  const rawEvent = String(value || '');
  const logPattern =
    /(\[(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}[\s\S]*\])$/u;
  const match = rawEvent.match(logPattern);

  let cleanEvent = rawEvent;
  let processingLog = '';
  let processingContent = '';

  if (match) {
    processingLog = match[1];
    cleanEvent = rawEvent.replace(logPattern, '').trim();

    const contentMatch = processingLog.match(
      /\d{2}:\d{2}:\d{2}:\s*([\s\S]*?)\s*확인/u,
    );

    if (contentMatch) {
      processingContent = contentMatch[1].trim();
    } else {
      const parts = processingLog.split(':');
      if (parts.length > 3) {
        const temp = processingLog.substring(
          processingLog.indexOf(':', 15) + 1,
        );
        const confirmIndex = temp.lastIndexOf('확인');
        if (confirmIndex !== -1) {
          processingContent = temp.substring(0, confirmIndex).trim();
        }
      }
    }
  }

  return {
    cleanEvent,
    processingLog,
    processingContent,
  };
};

export const togglePersistentRedirectId = (selectedIds, id) =>
  selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id];

export const toggleAllPersistentRedirectIds = (
  selectedIds,
  availableIds,
) => {
  const availableIdSet = new Set(availableIds);
  const areAllAvailableIdsSelected =
    availableIds.length > 0 &&
    availableIds.every((id) => selectedIds.includes(id));

  if (areAllAvailableIdsSelected) {
    return selectedIds.filter((id) => !availableIdSet.has(id));
  }

  return [...new Set([...selectedIds, ...availableIds])];
};

export const mergePersistentRedirectIds = (currentIds, idsToAdd) => [
  ...new Set([...currentIds, ...idsToAdd]),
];

const stableFieldValidators = {
  host: (value) => value.length > 0,
  date: (value) =>
    /(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/u.test(value),
  ip: (value) =>
    /^(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]*:[0-9a-f:]+)$/iu.test(value),
};

const isValidStableField = (field, value) => {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) return false;
  return stableFieldValidators[field]
    ? stableFieldValidators[field](trimmedValue)
    : true;
};

const normalizeLogicalRow = (rawRow, inputColumnOrder) => {
  const rawColumns = rawRow.split('\t');
  while (
    rawColumns.length > 0 &&
    rawColumns[rawColumns.length - 1].trim() === ''
  ) {
    rawColumns.pop();
  }

  const eventIndex = inputColumnOrder.indexOf('event');
  const suffixFields = inputColumnOrder.slice(eventIndex + 1);
  const suffixCount = suffixFields.length;

  if (eventIndex < 0 || rawColumns.length < inputColumnOrder.length) {
    return {
      columns: rawColumns,
      hasEnoughColumns: false,
      extraEventColumns: 0,
      ignoredTrailingColumns: 0,
    };
  }

  let suffixStart =
    suffixCount === 0 ? rawColumns.length : rawColumns.length - suffixCount;

  if (suffixCount > 0) {
    for (
      let candidateStart = rawColumns.length - suffixCount;
      candidateStart > eventIndex;
      candidateStart -= 1
    ) {
      const isStableSuffix = suffixFields.every((field, suffixIndex) =>
        isValidStableField(field, rawColumns[candidateStart + suffixIndex]),
      );

      if (isStableSuffix) {
        suffixStart = candidateStart;
        break;
      }
    }
  }

  const prefixColumns = rawColumns.slice(0, eventIndex);
  const eventColumns = rawColumns.slice(eventIndex, suffixStart);
  const suffixColumns =
    suffixCount === 0
      ? []
      : rawColumns.slice(suffixStart, suffixStart + suffixCount);
  const normalizedEvent = eventColumns
    .join(' ')
    .replace(/[ \t]*\n[ \t]*/gu, ' ')
    .replace(/ {2,}/gu, ' ');

  return {
    columns: [...prefixColumns, normalizedEvent, ...suffixColumns],
    hasEnoughColumns: true,
    extraEventColumns: Math.max(0, eventColumns.length - 1),
    ignoredTrailingColumns:
      suffixCount === 0
        ? 0
        : Math.max(0, rawColumns.length - suffixStart - suffixCount),
  };
};

const isCompleteLogicalRow = (normalizedRow, inputColumnOrder) =>
  normalizedRow.hasEnoughColumns &&
  inputColumnOrder.every(
    (field, index) =>
      field === 'event' ||
      isValidStableField(field, normalizedRow.columns[index]),
  );

const looksLikeRecordStart = (physicalLine, inputColumnOrder) => {
  const eventIndex = inputColumnOrder.indexOf('event');
  if (eventIndex === 0) return false;

  const columns = physicalLine.split('\t');
  if (columns.length <= eventIndex) return false;

  return inputColumnOrder
    .slice(0, eventIndex)
    .every((field, index) => isValidStableField(field, columns[index]));
};

const buildLogicalRows = (rawInput, inputColumnOrder) => {
  const physicalLines = String(rawInput || '').split(/\r?\n/u);
  const logicalRows = [];
  const eventIndex = inputColumnOrder.indexOf('event');
  let buffer = '';
  let startLineIndex = 0;
  let physicalLineCount = 0;

  const flushBuffer = () => {
    if (!buffer.trim()) return;

    const normalized = normalizeLogicalRow(buffer, inputColumnOrder);
    logicalRows.push({
      ...normalized,
      raw: buffer,
      lineIndex: startLineIndex,
      physicalLineCount,
      wasRecovered:
        physicalLineCount > 1 ||
        normalized.extraEventColumns > 0 ||
        normalized.ignoredTrailingColumns > 0,
    });
    buffer = '';
    physicalLineCount = 0;
  };

  physicalLines.forEach((physicalLine, lineIndex) => {
    if (!buffer && !physicalLine.trim()) return;

    if (!buffer) {
      buffer = physicalLine;
      startLineIndex = lineIndex;
      physicalLineCount = 1;
    } else {
      buffer += `\n${physicalLine}`;
      physicalLineCount += 1;
    }

    const normalized = normalizeLogicalRow(buffer, inputColumnOrder);
    const isComplete = isCompleteLogicalRow(normalized, inputColumnOrder);
    const nextLine = physicalLines[lineIndex + 1];
    const isLastLine = lineIndex === physicalLines.length - 1;
    const nextStartsRecord =
      nextLine !== undefined &&
      looksLikeRecordStart(nextLine, inputColumnOrder);

    if (isComplete && (isLastLine || eventIndex === 0 || nextStartsRecord)) {
      flushBuffer();
    }
  });

  flushBuffer();
  return logicalRows;
};

export const parsePersistentRedirectRows = (
  rawInput,
  inputColumnOrder = DEFAULT_PERSISTENT_REDIRECT_ORDER,
) =>
  buildLogicalRows(rawInput, inputColumnOrder)
    .filter(({ raw }) => raw.trim())
    .map((logicalRow) => {
      const data = {};

      inputColumnOrder.forEach((field, columnIndex) => {
        data[field] = (logicalRow.columns[columnIndex] || '').trim();
      });

      return {
        id: logicalRow.lineIndex,
        lineNumber: logicalRow.lineIndex + 1,
        data,
        raw: logicalRow.raw,
        hasEnoughColumns: logicalRow.hasEnoughColumns,
        extraEventColumns: logicalRow.extraEventColumns,
        ignoredTrailingColumns: logicalRow.ignoredTrailingColumns,
        physicalLineCount: logicalRow.physicalLineCount,
        wasRecovered: logicalRow.wasRecovered,
      };
    });

export const parsePersistentRedirectMessages = (
  rawInput,
  inputColumnOrder = DEFAULT_PERSISTENT_REDIRECT_ORDER,
) =>
  parsePersistentRedirectRows(rawInput, inputColumnOrder).map((parsedRow) => {
    const eventDetails = extractPersistentRedirectEvent(parsedRow.data.event);

    return {
      ...parsedRow,
      data: {
        ...parsedRow.data,
        ...eventDetails,
      },
      requiresReview: requiresPersistentRedirectReview(
        eventDetails.processingContent,
      ),
    };
  });
