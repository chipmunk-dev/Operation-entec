export const PERSISTENT_EVENT_FIELDS = [
  { key: 'duration', label: '지속시간' },
  { key: 'group', label: '그룹명' },
  { key: 'host', label: '호스트' },
  { key: 'content', label: '내용' },
  { key: 'occurredAt', label: '발생일시' },
  { key: 'ip', label: 'IP' },
];

export const DEFAULT_PERSISTENT_EVENT_ORDER = PERSISTENT_EVENT_FIELDS.map(
  ({ key }) => key,
);

export const ADMIN_POSITION_TITLES = [
  '사원',
  '주임',
  '대리',
  '선임',
  '책임',
  '과장',
  '차장',
  '부장',
  '수석',
  '팀장',
  '실장',
  '센터장',
  '이사',
  '상무',
  '전무',
];

const unique = (values) => [...new Set(values)];

export const splitEventContent = (rawContent) => {
  const content = String(rawContent || '').trim();
  if (!content) return { cleanContent: '', confirmationText: '' };

  const datedLogIndex = content.search(
    /\[(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}[\s\S]*$/u,
  );
  if (datedLogIndex >= 0) {
    return {
      cleanContent: content.slice(0, datedLogIndex).trim(),
      confirmationText: content.slice(datedLogIndex).trim(),
    };
  }

  const historyMarker = /(?:확인|처리)\s*내역\s*[:：]?/u;
  const markerMatch = historyMarker.exec(content);
  if (markerMatch) {
    return {
      cleanContent: content.slice(0, markerMatch.index).trim(),
      confirmationText: content.slice(markerMatch.index + markerMatch[0].length).trim(),
    };
  }

  return { cleanContent: content, confirmationText: '' };
};

export const extractAdminCandidates = (confirmationText) => {
  const titlePattern = [...ADMIN_POSITION_TITLES].sort(
    (first, second) => second.length - first.length,
  ).join('|');
  const boundary = String.raw`(?:^|[\s,，/()[\]{}<>:：;.!?→-])`;
  const endBoundary = String.raw`(?=$|[\s,，/()[\]{}<>:：;.!?→-])`;
  const pattern = new RegExp(
    `${boundary}([가-힣]{2,4})\\s*(${titlePattern})(?:님)?${endBoundary}`,
    'gu',
  );

  const candidates = [];
  for (const match of String(confirmationText || '').matchAll(pattern)) {
    const name = match[1];
    const position = match[2];
    const label = `${name} ${position}`;
    if (!candidates.some((candidate) => candidate.label === label)) {
      candidates.push({ name, position, label });
    }
  }

  return candidates;
};

export const extractDbaAdminCandidates = (confirmationText) => {
  const candidates = [];
  const pattern = /\(\s*dba\s+([^)]*)\)/giu;

  for (const match of String(confirmationText || '').matchAll(pattern)) {
    extractAdminCandidates(match[1]).forEach((candidate) => {
      if (!candidates.some(({ label }) => label === candidate.label)) {
        candidates.push(candidate);
      }
    });
  }

  return candidates;
};

export const extractMailAdminKeywords = (confirmationText) => {
  const candidates = [];
  const pattern =
    /(?:^|[\s,，/()[\]{}<>:：;→-])([A-Z][A-Z0-9_-]{2,})\s*메일(?=$|[\s,，/()[\]{}<>:：;.!?→-])/gu;

  for (const match of String(confirmationText || '').matchAll(pattern)) {
    const keyword = match[1];
    if (!candidates.some((candidate) => candidate.label === keyword)) {
      candidates.push({
        name: keyword,
        position: '해외 메일',
        label: keyword,
        type: 'mail',
      });
    }
  }

  return candidates;
};

export const extractMessengerAdminKeywords = (confirmationText) => {
  const text = String(confirmationText || '');

  const keywordDefinitions = [
    {
      pattern:
        /(?:^|[\s,，/()[\]{}<>:：;→-])(?:TRAN\s+VAN\s+SON(?:\s*,\s*PETER)?|NGUYEN\s+DUC\s+ANH)\s*메신저(?=$|[\s,，/()[\]{}<>:：;.!?→-])/giu,
      label: 'TRAN VAN SON, Peter',
    },
    { pattern: /(?:^|[\s,，/()[\]{}<>:：;→-])cicop(?=$|[\s,，/()[\]{}<>:：;.!?→-])/giu, label: 'cicop' },
    {
      pattern:
        /(?:^|[\s,，/()[\]{}<>:：;→-])해외클라우드(?:운영)?\s*메신저(?=$|[\s,，/()[\]{}<>:：;.!?→-])/gu,
      label: '해외클라우드운영',
    },
    { pattern: /(?:^|[\s,，/()[\]{}<>:：;→-])infra(?=$|[\s,，/()[\]{}<>:：;.!?→-])/giu, label: 'infra' },
  ];

  return keywordDefinitions
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => ({
      name: label,
      position: '메신저 수신자',
      label,
      type: 'messenger',
    }));
};

export const excludeRedirectSection = (confirmationText) => {
  const text = String(confirmationText || '').trim();
  const arrows = [...text.matchAll(/->|→|>/gu)];

  for (let index = 0; index < arrows.length; index += 1) {
    const arrow = arrows[index];
    const nextArrow = arrows[index + 1];
    const segmentEnd = nextArrow ? nextArrow.index : text.length;
    const segmentAfterArrow = text.slice(
      arrow.index + arrow[0].length,
      segmentEnd,
    );

    if (segmentAfterArrow.includes('재전달')) {
      const textBeforeArrow = text
        .slice(0, arrow.index)
        .replace(
          /^\[\s*(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}\s*:\s*/u,
          '',
        )
        .replace(/[\s[\]():：]+/gu, '')
        .toLowerCase();

      if (/^[srw]$/u.test(textBeforeArrow)) {
        return {
          adminSourceText: text
            .slice(arrow.index + arrow[0].length)
            .trim(),
          ignoredRedirectText: '',
        };
      }

      return {
        adminSourceText: text.slice(0, arrow.index).trim(),
        ignoredRedirectText: text.slice(arrow.index).trim(),
      };
    }
  }

  return {
    adminSourceText: text,
    ignoredRedirectText: '',
  };
};

export const splitManualAdmins = (value) =>
  unique(
    String(value || '')
      .split(/[\n,，/]+/u)
      .map((admin) => admin.trim())
      .filter(Boolean),
  );

export const getResolvedAdmins = (row) =>
  unique([...(row.selectedAdmins || []), ...splitManualAdmins(row.manualAdmins)]);

const extractPrioritizedAdminCandidates = (sourceText) => {
  const mailAdminCandidates = extractMailAdminKeywords(sourceText);
  const messengerAdminCandidates = extractMessengerAdminKeywords(sourceText);
  const hasInfraRecipient = messengerAdminCandidates.some(
    ({ label }) => label === 'infra',
  );
  const dbaAdminCandidates = hasInfraRecipient
    ? extractDbaAdminCandidates(sourceText)
    : [];
  const adjustedMessengerCandidates =
    dbaAdminCandidates.length > 0
      ? messengerAdminCandidates.filter(({ label }) => label !== 'infra')
      : messengerAdminCandidates;
  const recipientCandidates = [
    ...mailAdminCandidates,
    ...adjustedMessengerCandidates.filter(
      ({ label }) =>
        mailAdminCandidates.length === 0 || label !== '해외클라우드운영',
    ),
    ...dbaAdminCandidates,
  ];

  return recipientCandidates.length > 0
    ? recipientCandidates
    : extractAdminCandidates(sourceText);
};

const strongFieldValidators = {
  duration: (value) => /\d/u.test(value),
  occurredAt: (value) =>
    /(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/u.test(value),
  ip: (value) =>
    /^(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]*:[0-9a-f:]+)$/iu.test(value),
};

const isValidStableField = (field, value) => {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) return false;
  return strongFieldValidators[field]
    ? strongFieldValidators[field](trimmedValue)
    : true;
};

const splitRowColumns = (rawRow) => {
  const columns = String(rawRow || '').split('\t');

  while (columns.length > 0 && columns[0].trim() === '') {
    columns.shift();
  }

  while (
    columns.length > 0 &&
    columns[columns.length - 1].trim() === ''
  ) {
    columns.pop();
  }

  return columns;
};

const normalizeLogicalRow = (rawRow, inputColumnOrder) => {
  const rawColumns = splitRowColumns(rawRow);
  const contentIndex = inputColumnOrder.indexOf('content');
  const suffixCount = inputColumnOrder.length - contentIndex - 1;
  const suffixFields = inputColumnOrder.slice(contentIndex + 1);

  if (contentIndex < 0 || rawColumns.length < inputColumnOrder.length) {
    return {
      columns: rawColumns,
      hasEnoughColumns: false,
      extraContentColumns: 0,
      ignoredTrailingColumns: 0,
    };
  }

  let suffixStart =
    suffixCount === 0 ? rawColumns.length : rawColumns.length - suffixCount;

  if (suffixCount > 0) {
    for (
      let candidateStart = rawColumns.length - suffixCount;
      candidateStart > contentIndex;
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

  const contentEnd = suffixStart;
  const prefixColumns = rawColumns.slice(0, contentIndex);
  const contentColumns = rawColumns.slice(contentIndex, contentEnd);
  const suffixColumns =
    suffixCount === 0
      ? []
      : rawColumns.slice(suffixStart, suffixStart + suffixCount);
  const ignoredTrailingColumns =
    suffixCount === 0
      ? 0
      : Math.max(0, rawColumns.length - suffixStart - suffixCount);
  const normalizedContent = contentColumns
    .join(' ')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n[ \t]+/gu, '\n');

  return {
    columns: [...prefixColumns, normalizedContent, ...suffixColumns],
    hasEnoughColumns: true,
    extraContentColumns: Math.max(0, contentColumns.length - 1),
    ignoredTrailingColumns,
  };
};

const isCompleteLogicalRow = (normalizedRow, inputColumnOrder) =>
  normalizedRow.hasEnoughColumns &&
  inputColumnOrder.every(
    (field, index) =>
      field === 'content' ||
      isValidStableField(field, normalizedRow.columns[index]),
  );

const looksLikeRecordStart = (physicalLine, inputColumnOrder) => {
  const contentIndex = inputColumnOrder.indexOf('content');
  if (contentIndex === 0) return false;

  const columns = splitRowColumns(physicalLine);
  if (columns.length <= contentIndex) return false;

  return inputColumnOrder
    .slice(0, contentIndex)
    .every((field, index) => isValidStableField(field, columns[index]));
};

const buildLogicalRows = (rawInput, inputColumnOrder) => {
  const physicalLines = String(rawInput || '').split(/\r?\n/u);
  const logicalRows = [];
  let buffer = '';
  let startLineIndex = 0;
  let physicalLineCount = 0;
  const contentIndex = inputColumnOrder.indexOf('content');

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
        normalized.extraContentColumns > 0 ||
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

    if (
      isComplete &&
      (isLastLine || contentIndex === 0 || nextStartsRecord)
    ) {
      flushBuffer();
    }
  });

  flushBuffer();
  return logicalRows;
};

export const parsePersistentEventRows = (
  rawInput,
  inputColumnOrder = DEFAULT_PERSISTENT_EVENT_ORDER,
) => {
  return buildLogicalRows(rawInput, inputColumnOrder)
    .filter(({ raw }) => raw.trim())
    .map((logicalRow) => {
      const { columns, lineIndex } = logicalRow;
      const data = {};

      inputColumnOrder.forEach((field, columnIndex) => {
        data[field] = (columns[columnIndex] || '').trim();
      });

      const { cleanContent, confirmationText } = splitEventContent(data.content);
      const {
        adminSourceText: primaryAdminSourceText,
        ignoredRedirectText,
      } =
        excludeRedirectSection(confirmationText);
      let adminSourceText = primaryAdminSourceText;
      let adminCandidates =
        extractPrioritizedAdminCandidates(primaryAdminSourceText);
      let usedRedirectFallback = false;

      if (adminCandidates.length === 0 && ignoredRedirectText) {
        const redirectAdminCandidates =
          extractPrioritizedAdminCandidates(ignoredRedirectText);

        if (redirectAdminCandidates.length > 0) {
          adminSourceText = ignoredRedirectText;
          adminCandidates = redirectAdminCandidates;
          usedRedirectFallback = true;
        }
      }

      return {
        id: `line-${lineIndex + 1}`,
        lineNumber: lineIndex + 1,
        raw: logicalRow.raw,
        data,
        cleanContent,
        confirmationText,
        adminSourceText,
        ignoredRedirectText,
        usedRedirectFallback,
        occurrenceAt: data.occurredAt,
        adminCandidates,
        selectedAdmins:
          adminCandidates.length === 1 ? [adminCandidates[0].label] : [],
        adminSelectionConfirmed: false,
        manualAdmins: '',
        manualAdminDraft: '',
        excluded: false,
        hasEnoughColumns: logicalRow.hasEnoughColumns,
        extraContentColumns: logicalRow.extraContentColumns,
        ignoredTrailingColumns: logicalRow.ignoredTrailingColumns,
        physicalLineCount: logicalRow.physicalLineCount,
        wasRecovered: logicalRow.wasRecovered,
      };
    });
};

export const expandRowsForExcel = (rows) => {
  const expandedRows = [];

  rows.forEach((row) => {
    if (row.excluded) return;

    getResolvedAdmins(row).forEach((admin) => {
      expandedRows.push({
        no: expandedRows.length + 1,
        occurredAt: row.occurrenceAt,
        duration: row.data.duration,
        admin,
        host: row.data.host,
        content: row.cleanContent,
        ip: row.data.ip,
        group: row.data.group,
      });
    });
  });

  return expandedRows;
};
