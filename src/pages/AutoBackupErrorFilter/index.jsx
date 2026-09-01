import { useEffect, useMemo, useState } from 'react';
import { IoMdCheckmark, IoMdCopy } from 'react-icons/io';
import {
  MdBackup,
  MdDeleteOutline,
  MdExpandMore,
  MdFileDownload,
  MdInfoOutline,
  MdOutlineCloudDone,
  MdOutlineTableView,
} from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import {
  createDefaultBackupState,
  DEFAULT_COLUMN_POSITIONS,
  loadBackupDraft,
  saveBackupDraft,
} from '../../utils/autoBackupStorage';
import {
  createBackupNotepadFileName,
  formatBackupNotepad,
} from '../../utils/backupNotepad';

const zones = ['P-EUBKMST', 'NBUMASTER', 'EXTMASTER'];
const columnOptions = Array.from({ length: 40 }, (_, index) => index + 1);
const columnFields = [
  { key: 'status', label: 'Status' },
  { key: 'policyName', label: 'Policy' },
  { key: 'startTime', label: 'Start Time' },
];

const howToSteps = [
  {
    title: '저장 상태 확인',
    description: '브라우저 임시 저장 상태를 확인하거나 오류 결과를 메모장으로 내보냅니다.',
    icon: <MdFileDownload />,
  },
  {
    title: '백업존 데이터 입력',
    description: '백업존을 선택하고 작업 목록과 필요한 열 위치를 확인합니다.',
    icon: <MdOutlineTableView />,
  },
  {
    title: '오류 자동 추출',
    description: '정상 상태를 제외하고 확인이 필요한 백업 오류만 모읍니다.',
    icon: <MdBackup />,
  },
  {
    title: '결과 복사·저장',
    description: '오류 보고를 복사하거나 세 백업존의 오류 결과를 메모장으로 저장합니다.',
    icon: <IoMdCopy />,
  },
];

const pad = (number) => number.toString().padStart(2, '0');

const formatBackupTime = (value) => {
  if (!value?.trim()) return 'Unknown Time';

  const time = value
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const months = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };

  const korean = time.match(
    /^(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})\.?\s*(오전|오후)\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
  );
  const english = time.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)$/i,
  );
  const numeric = time.match(
    /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?(?:Z|[+-]\d{2}:?\d{2})?$/i,
  );

  let year;
  let month;
  let day;
  let hour;
  let minute;
  let second = 0;
  let period;

  if (korean) {
    [, year, month, day, period, hour, minute, second = 0] = korean;
  } else if (english) {
    const monthNumber = months[english[1].toLowerCase()];
    if (!monthNumber) return value;
    [, , day, year, hour, minute, second = 0, period] = english;
    month = monthNumber;
  } else if (numeric) {
    [, year, month, day, hour, minute, second = 0, period] = numeric;
  } else {
    return value;
  }

  year = Number(year);
  month = Number(month);
  day = Number(day);
  hour = Number(hour);
  minute = Number(minute);
  second = Number(second);
  period = period?.toUpperCase();

  if ((period === '오후' || period === 'PM') && hour !== 12) hour += 12;
  if ((period === '오전' || period === 'AM') && hour === 12) hour = 0;

  const isValid =
    year >= 1000 &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= new Date(year, month, 0).getDate() &&
    hour >= 0 && hour <= 23 &&
    minute >= 0 && minute <= 59 &&
    second >= 0 && second <= 59;

  if (!isValid) return value;

  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

const parseRows = (text, zone, columnPositions) => {
  let invalidCount = 0;
  let normalCount = 0;
  let timeWarningCount = 0;
  const statusIndex = columnPositions.status - 1;
  const policyIndex = columnPositions.policyName - 1;
  const startTimeIndex = columnPositions.startTime - 1;
  const requiredColumnCount = Math.max(
    columnPositions.status,
    columnPositions.policyName,
    columnPositions.startTime,
  );

  const errors = text.split('\n').reduce((result, line) => {
    if (!line.trim() || line.startsWith('[')) return result;
    const columns = line.split('\t');
    if (columns.length < requiredColumnCount) {
      invalidCount += 1;
      return result;
    }
    const status = columns[statusIndex]?.trim();
    const policyName = columns[policyIndex]?.trim();
    const rawStartTime = columns[startTimeIndex]?.trim();
    if (!status || !policyName || !rawStartTime) {
      invalidCount += 1;
      return result;
    }
    if (status === '0' || status === '1') {
      normalCount += 1;
      return result;
    }
    const startTime = formatBackupTime(rawStartTime);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(startTime)) {
      timeWarningCount += 1;
    }
    result.push({
      id: `${zone}-${result.length}`,
      zone,
      errorCode: status,
      policyName,
      startTime,
    });
    return result;
  }, []);

  return { errors, invalidCount, normalCount, timeWarningCount };
};

function AutoBackupErrorFilter() {
  const initialDraft = useMemo(() => loadBackupDraft(zones), []);
  const [activeZone, setActiveZone] = useState(initialDraft.state.activeZone);
  const [inputs, setInputs] = useState(initialDraft.state.inputs);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columnPositions, setColumnPositions] = useState(initialDraft.state.columnPositions);
  const [copiedKey, setCopiedKey] = useState('');
  const [storageStatus, setStorageStatus] = useState(
    initialDraft.restoredAt ? 'restored' : 'ready',
  );
  const [lastSavedAt, setLastSavedAt] = useState(initialDraft.restoredAt);
  const [notice, setNotice] = useState(initialDraft.notice || '');
  const summaries = useMemo(
    () =>
      Object.fromEntries(
        zones.map((zone) => [zone, parseRows(inputs[zone], zone, columnPositions)]),
      ),
    [inputs, columnPositions],
  );
  const allErrors = zones.flatMap((zone) => summaries[zone].errors);
  const totalNormal = zones.reduce((sum, zone) => sum + summaries[zone].normalCount, 0);
  const totalInvalid = zones.reduce(
    (sum, zone) =>
      sum + summaries[zone].invalidCount + summaries[zone].timeWarningCount,
    0,
  );

  useEffect(() => {
    setStorageStatus('saving');
    const timer = window.setTimeout(() => {
      try {
        const savedAt = saveBackupDraft({ inputs, columnPositions, activeZone });
        setLastSavedAt(savedAt);
        setStorageStatus('saved');
      } catch (error) {
        setStorageStatus('error');
        setNotice(
          error instanceof Error
            ? error.message
            : '브라우저 임시 저장에 실패했습니다.',
        );
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [inputs, columnPositions, activeZone]);

  const copy = async (key, content) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      setNotice('클립보드 접근이 차단되었습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  const resetAllInputs = () => {
    if (!window.confirm('입력된 데이터를 모두 초기화하시겠습니까?')) return;
    setInputs(createDefaultBackupState(zones).inputs);
    setNotice('세 백업존의 입력 데이터를 모두 초기화했습니다.');
  };

  const handleNotepadExport = async () => {
    try {
      const exportedAt = new Date();
      const fileName = createBackupNotepadFileName(exportedAt);
      const content = `\uFEFF${formatBackupNotepad(summaries, zones)}`;

      if (typeof window.showSaveFilePicker === 'function') {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          startIn: 'downloads',
          types: [
            {
              description: '텍스트 문서',
              accept: { 'text/plain': ['.txt'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setNotice('오류 내역을 메모장 파일로 저장했습니다.');
        return;
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('오류 내역 메모장 파일을 다운로드했습니다.');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setNotice(
        error instanceof Error
          ? error.message
          : '메모장 파일을 저장하지 못했습니다.',
      );
    }
  };

  const copyOutlookTable = async (zone, rows) => {
    const escapeHtml = (text) =>
      text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    const toLines = (values) => values.map(escapeHtml).join('<br>');
    const policies = rows.map((row) => row.policyName);
    const times = rows.map((row) => row.startTime);
    const statuses = rows.map((row) => `Err: ${row.errorCode}`);
    const plain = `${zone}\t${policies.join('\n')}\t${times.join('\n')}\t${statuses.join('\n')}`;
    const html = `<table><tr><td>${escapeHtml(zone)}</td><td>${toLines(policies)}</td><td>${toLines(times)}</td><td>${toLines(statuses)}</td></tr></table>`;

    try {
      if (!window.ClipboardItem || !navigator.clipboard.write) {
        await copy(`${zone}-table`, plain);
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      setCopiedKey(`${zone}-table`);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      setNotice('Outlook 표 복사에 실패했습니다. 열별 묶음 복사를 이용해 주세요.');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="자동 백업 에러 필터"
        description="백업 작업 목록에서 정상 건을 제외하고 확인이 필요한 오류만 추출합니다."
        icon={<MdBackup size={21} />}
        iconClassName="bg-violet-50 text-violet-600"
        helpTitle="자동 백업 에러 필터 사용방법"
        helpSummary="백업 작업에서 정상 건을 제외하고 오류 보고를 정리합니다."
        helpSteps={howToSteps}
      />

      {notice && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="shrink-0 font-bold text-blue-500 hover:text-blue-800"
            aria-label="알림 닫기"
          >
            ×
          </button>
        </div>
      )}

      <section className="panel mb-6 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDataManagement((current) => !current)}
          aria-expanded={showDataManagement}
          aria-controls="auto-backup-data-management"
          className={`group flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
            showDataManagement
              ? 'bg-slate-50/70'
              : 'hover:bg-blue-50/80 hover:shadow-[inset_4px_0_0_#3b82f6]'
          }`}
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-700">
              데이터 관리
            </span>
            <span className="mt-1 block truncate text-xs text-slate-500">
              데이터 메모장 저장 · 현재 PC 임시 저장
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="status-pill bg-emerald-50 text-emerald-700">
              <MdOutlineCloudDone size={16} />
              {storageStatus === 'saving' ? '저장 중' : '자동 저장'}
            </span>
            <span className="hidden text-xs font-bold text-slate-400 transition-colors group-hover:text-blue-700 sm:inline">
              {showDataManagement ? '접기' : '펼치기'}
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 group-hover:translate-y-0.5 group-hover:bg-blue-100 group-hover:text-blue-700">
              <MdExpandMore
                size={22}
                aria-hidden="true"
                className={`transition-transform duration-200 ${
                  showDataManagement ? 'rotate-180' : ''
                }`}
              />
            </span>
          </span>
        </button>

        {showDataManagement && (
          <div
            id="auto-backup-data-management"
            className="grid gap-4 border-t border-slate-100 bg-slate-50/50 p-4 lg:grid-cols-2"
          >
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
              <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      데이터 메모장으로 저장하기
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      입력된 오류값을 메모장으로 저장하여 내보냅니다.
                    </p>
                  </div>
                  <span className="status-pill bg-blue-100 text-blue-700">
                    TXT 저장
                  </span>
                </div>
              </div>
              <div className="p-5">
                <p className="min-h-10 text-xs leading-5 text-slate-500">
                  세 백업존의 오류 Policy, Start Time, Status를 구분선과 함께
                  저장합니다. 오류가 없는 백업존도 함께 표시합니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleNotepadExport}
                    className="btn-primary"
                  >
                    <MdFileDownload size={18} />
                    메모장으로 내보내기
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
              <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      현재 PC 임시 저장
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      입력할 때마다 이 브라우저에 자동 저장합니다.
                    </p>
                  </div>
                  <span className="status-pill bg-emerald-100 text-emerald-700">
                    <MdOutlineCloudDone size={16} />
                    {storageStatus === 'saving' ? '저장 중' : '자동 저장'}
                  </span>
                </div>
              </div>
              <div className="flex h-[154px] flex-col justify-between p-5">
                <p className="text-xs leading-5 text-slate-500">
                  새로고침해도 복원되며 마지막 수정 후 7일이 지나면 삭제됩니다.
                  이 데이터는 다른 PC에서는 볼 수 없습니다.
                </p>
                <span className="text-xs font-semibold text-emerald-700">
                  {lastSavedAt
                    ? `최근 저장 · ${new Date(lastSavedAt).toLocaleString('ko-KR')}`
                    : '저장된 임시 데이터 없음'}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['입력 백업존', `${zones.filter((zone) => inputs[zone].trim()).length} / ${zones.length}`, 'text-blue-600'],
          ['오류 작업', `${allErrors.length}건`, 'text-rose-600'],
          ['정상 제외', `${totalNormal}건`, 'text-emerald-600'],
          ['형식 확인 필요', `${totalInvalid}건`, 'text-amber-600'],
        ].map(([label, value, color]) => (
          <div key={label} className="panel p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="panel mb-6 overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="font-bold text-slate-900">1. 백업 데이터 입력</h2>
            <p className="mt-1 text-xs text-slate-500">백업존을 선택하고 데이터를 붙여넣으세요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!zones.some((zone) => inputs[zone].trim())}
              onClick={resetAllInputs}
              className="btn-ghost text-rose-600 hover:bg-rose-50"
            >
              <MdDeleteOutline size={18} />
              전체 초기화
            </button>
            <button
              type="button"
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              aria-expanded={showColumnSettings}
              className="btn-secondary"
            >
              {showColumnSettings ? '열 순서 닫기' : '열 순서 설정'}
            </button>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              aria-expanded={showGuide}
              className="btn-ghost"
            >
              <MdInfoOutline size={18} />
              입력 형식 {showGuide ? '닫기' : '보기'}
            </button>
          </div>
        </div>

        {showColumnSettings && (
          <div className="border-b border-blue-100 bg-blue-50/70 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-blue-900">필드별 입력 열 위치</p>
                <p className="mt-1 text-xs text-blue-700">
                  붙여넣을 데이터에서 각 필드가 위치한 열 번호를 선택하세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setColumnPositions({ ...DEFAULT_COLUMN_POSITIONS })
                }
                className="btn-ghost px-3 py-2 text-blue-700 hover:bg-blue-100"
              >
                기본값 복원
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {columnFields.map(({ key, label }) => (
                <label key={key} className="text-xs font-semibold text-blue-800">
                  {label}
                  <select
                    value={columnPositions[key]}
                    onChange={(event) =>
                      setColumnPositions((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                    className="field-select mt-1.5"
                  >
                    {columnOptions.map((column) => (
                      <option key={column} value={column}>
                        {column}번째 열
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {new Set(Object.values(columnPositions)).size !== columnFields.length && (
              <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                서로 다른 필드에 같은 열이 선택되어 있습니다. 입력 열 위치를 확인해 주세요.
              </p>
            )}
          </div>
        )}

        {showGuide && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="font-semibold">
              현재 설정에서는 최소{' '}
              {Math.max(...Object.values(columnPositions))}개 열이 필요합니다.
            </p>
            <p className="mt-1 leading-6 text-amber-800">
              Status는 {columnPositions.status}번째, Policy는{' '}
              {columnPositions.policyName}번째, Start Time은{' '}
              {columnPositions.startTime}번째 열에서 읽습니다. 열은 탭(Tab)으로
              구분되어야 합니다.
            </p>
          </div>
        )}

        <div className="border-b border-slate-200 px-5 pt-4">
          <div className="flex gap-1 overflow-x-auto">
            {zones.map((zone) => {
              const errorCount = summaries[zone].errors.length;
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setActiveZone(zone)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    activeZone === zone
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {zone}
                  {errorCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700">
                      {errorCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel-body">
          <textarea
            value={inputs[activeZone]}
            onChange={(event) =>
              setInputs((current) => ({ ...current, [activeZone]: event.target.value }))
            }
            className="field-input source-input-compact"
            placeholder={`${activeZone} 백업 작업 목록을 여기에 붙여넣으세요.`}
            spellCheck="false"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 text-xs">
              <span className="status-pill bg-emerald-50 text-emerald-700">
                정상 {summaries[activeZone].normalCount}
              </span>
              <span className="status-pill bg-rose-50 text-rose-700">
                오류 {summaries[activeZone].errors.length}
              </span>
              {summaries[activeZone].invalidCount > 0 && (
                <span className="status-pill bg-amber-50 text-amber-700">
                  제외된 행 {summaries[activeZone].invalidCount}
                </span>
              )}
              {summaries[activeZone].timeWarningCount > 0 && (
                <span className="status-pill bg-amber-50 text-amber-700">
                  시간 확인 {summaries[activeZone].timeWarningCount}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={!inputs[activeZone]}
              onClick={() => setInputs((current) => ({ ...current, [activeZone]: '' }))}
              className="btn-ghost text-rose-600 hover:bg-rose-50"
            >
              <MdDeleteOutline size={18} />
              현재 백업존 데이터 지우기
            </button>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="font-bold text-slate-900">2. Outlook 보고용 결과</h2>
            <p className="mt-1 text-xs text-slate-500">
              백업존별로 각 열을 복사해 Outlook 테이블의 해당 셀에 붙여넣으세요.
            </p>
          </div>
        </div>

        {allErrors.length ? (
          <div className="divide-y divide-slate-200">
            {zones.map((zone) => {
              const zoneErrors = summaries[zone].errors;
              if (!zoneErrors.length) return null;

              const bundles = [
                {
                  key: 'policy',
                  label: 'Policy 명',
                  content: zoneErrors.map((row) => row.policyName).join('\n'),
                  style: 'bg-blue-50/60 text-blue-950',
                },
                {
                  key: 'time',
                  label: 'RIC 시간',
                  content: zoneErrors.map((row) => row.startTime).join('\n'),
                  style: 'bg-violet-50/60 text-violet-950',
                },
                {
                  key: 'status',
                  label: '특이사항 (Status 코드)',
                  content: zoneErrors.map((row) => `Err: ${row.errorCode}`).join('\n'),
                  style: 'bg-rose-50/60 text-rose-950',
                },
              ];

              return (
                <article key={zone} className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{zone}</h3>
                      <span className="status-pill bg-rose-100 text-rose-700">
                        오류 {zoneErrors.length}건
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        세 목록은 입력 순서대로 정렬됩니다.
                      </span>
                      <button
                        type="button"
                        onClick={() => copyOutlookTable(zone, zoneErrors)}
                        className="btn-primary px-3 py-2"
                      >
                        {copiedKey === `${zone}-table` ? (
                          <IoMdCheckmark />
                        ) : (
                          <MdOutlineTableView />
                        )}
                        {copiedKey === `${zone}-table` ? '표 복사됨' : 'Outlook 행 복사'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    {bundles.map((bundle) => {
                      const copyKey = `${zone}-${bundle.key}`;
                      return (
                        <section
                          key={bundle.key}
                          className="overflow-hidden rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                            <h4 className="text-sm font-bold text-slate-700">{bundle.label}</h4>
                            <button
                              type="button"
                              onClick={() => copy(copyKey, bundle.content)}
                              className="btn-ghost px-3 py-1.5"
                            >
                              {copiedKey === copyKey ? (
                                <IoMdCheckmark className="text-emerald-600" />
                              ) : (
                                <IoMdCopy />
                              )}
                              {copiedKey === copyKey ? '복사됨' : '묶음 복사'}
                            </button>
                          </div>
                          <div className={`min-h-32 p-4 ${bundle.style}`}>
                            <pre className="whitespace-pre-wrap font-mono text-sm leading-7">
                              {bundle.content}
                            </pre>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
                <MdBackup size={28} />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-700">표시할 오류가 없습니다.</p>
              <p className="mt-1 text-xs text-slate-400">데이터를 입력하면 오류 작업이 여기에 표시됩니다.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default AutoBackupErrorFilter;
