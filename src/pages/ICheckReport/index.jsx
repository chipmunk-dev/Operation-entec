import { useMemo, useState } from 'react';
import { IoMdCheckmark, IoMdCopy } from 'react-icons/io';
import {
  MdContentPaste,
  MdFactCheck,
  MdGroups,
  MdOutlineWarningAmber,
} from 'react-icons/md';
import { FaFileExcel } from 'react-icons/fa6';
import PageHeader from '../../components/PageHeader';
import {
  ICHECK_COLUMN_COUNT,
  formatICheckReport,
  groupICheckReportsByAdmin,
  parseICheckReportRows,
} from '../../utils/iCheckReportFormatter';
import {
  loadGemsReporterName,
  saveGemsReporterName,
} from '../../utils/gemsReporterStorage';

const inputPlaceholder =
  '2026-06-13\tLG전자\tLGECCRP1 / LGEAETL1\tSA3E-36\tIBM\tServer\tPOWER 570\tN/A\t!점등\t2\t정지운\t김미경 책임\t○ 06/13 김미경 책임 - 확인요청';

const howToSteps = [
  {
    title: `엑셀 ${ICHECK_COLUMN_COUNT}열 복사`,
    description: `아이체크에서 보고할 장비 행과 ${ICHECK_COLUMN_COUNT}개 열을 그대로 복사합니다.`,
    icon: <FaFileExcel />,
  },
  {
    title: '데이터 붙여넣기',
    description: '원본 입력란에 붙여넣으면 빈 줄과 중복 행을 자동 정리합니다.',
    icon: <MdContentPaste />,
  },
  {
    title: '담당자별 자동 분류',
    description: '12번째 열의 서버 담당자를 기준으로 장비를 한 번에 묶습니다.',
    icon: <MdGroups />,
  },
  {
    title: '보고 문구 복사',
    description: '담당자별 완성 문구를 복사해 메신저로 전달합니다.',
    icon: <IoMdCopy />,
  },
];

function ICheckReport() {
  const [reporterName, setReporterName] = useState(() =>
    loadGemsReporterName(),
  );
  const [reporterPosition, setReporterPosition] = useState('사원');
  const [rawInput, setRawInput] = useState('');
  const [copiedAdmin, setCopiedAdmin] = useState('');

  const parsedResult = useMemo(
    () => parseICheckReportRows(rawInput),
    [rawInput],
  );
  const reportGroups = useMemo(
    () => groupICheckReportsByAdmin(parsedResult.rows),
    [parsedResult.rows],
  );
  const incompleteRows = parsedResult.rows.filter((row) => !row.isComplete);
  const completeRowCount = parsedResult.rows.length - incompleteRows.length;
  const isReporterNameRequired = reportGroups.length > 0 && !reporterName.trim();

  const handleCopy = async (group) => {
    if (isReporterNameRequired) return;

    const message = formatICheckReport(group.rows, {
      name: reporterName,
      position: reporterPosition,
    });
    if (!message) return;

    await navigator.clipboard.writeText(message);
    setCopiedAdmin(group.serverAdmin);
    window.setTimeout(() => setCopiedAdmin(''), 2000);
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="아이체크 보고"
        description="장비 이상·점등 내역을 서버 담당자별 메신저 보고 문구로 변환합니다."
        icon={<MdFactCheck size={21} />}
        iconClassName="bg-cyan-50 text-cyan-700"
        helpTitle="아이체크 보고 사용방법"
        helpSummary="엑셀 데이터를 붙여넣고 담당자별 보고 문구를 바로 복사하세요."
        helpSteps={howToSteps}
      />

      <div className="grid gap-6">
        <section
          aria-invalid={isReporterNameRequired || undefined}
          className={`panel px-4 py-3 transition-colors ${
            isReporterNameRequired
              ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-100'
              : ''
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <h2
              className={`shrink-0 text-sm font-bold ${
                isReporterNameRequired ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              1. 보고자 정보
            </h2>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(200px,1fr)_160px]">
              <label className="mb-0 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="shrink-0">이름</span>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setReporterName(nextName);
                    saveGemsReporterName(nextName);
                  }}
                  aria-invalid={isReporterNameRequired || undefined}
                  maxLength={50}
                  className={`field-input min-w-0 py-2 ${
                    isReporterNameRequired ? 'border-rose-300 bg-rose-50' : ''
                  }`}
                  placeholder="정지운"
                />
              </label>
              <label className="mb-0 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="shrink-0">직급</span>
                <select
                  value={reporterPosition}
                  onChange={(event) => setReporterPosition(event.target.value)}
                  className="field-select min-w-0 py-2"
                >
                  <option value="사원">사원</option>
                  <option value="선임">선임</option>
                  <option value="책임">책임</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">2. 아이체크 엑셀 데이터</h2>
            <div className="flex flex-wrap items-center gap-2">
              {parsedResult.duplicateCount > 0 && (
                <span className="status-pill bg-amber-50 text-amber-700">
                  중복 제외 {parsedResult.duplicateCount}건
                </span>
              )}
              {incompleteRows.length > 0 && (
                <span className="status-pill bg-rose-50 text-rose-700">
                  확인 필요 {incompleteRows.length}건
                </span>
              )}
              <span
                className={`status-pill ${
                  completeRowCount
                    ? 'bg-cyan-50 text-cyan-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                보고 대상 {completeRowCount}건
              </span>
            </div>
          </div>
          <div className="panel-body">
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              className="field-input source-input-compact"
              placeholder={inputPlaceholder}
              aria-label="아이체크 엑셀 원본 데이터"
              spellCheck="false"
            />
            <p className="mt-3 text-xs leading-5 text-slate-500">
              엑셀의 {ICHECK_COLUMN_COUNT}개 열을 그대로 복사해 붙여넣으세요.
              헤더·빈 줄은 자동 제외하고, 완전히 동일한 행은 한 건으로
              처리합니다.
            </p>

            {incompleteRows.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <MdOutlineWarningAmber size={17} />
                  확인 필요 행
                </div>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-800">
                  {incompleteRows.map((row) => (
                    <li key={row.id}>
                      {row.lineNumber}행 ·{' '}
                      {row.columnCount !== ICHECK_COLUMN_COUNT
                        ? `${row.columnCount}열 입력 (${ICHECK_COLUMN_COUNT}열 필요)`
                        : `${row.missingFields.join(', ')} 누락`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">3. 담당자별 보고 문구</h2>
            <span
              className={`status-pill ${
                reportGroups.length
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              서버 담당자 {reportGroups.length}명
            </span>
          </div>

          <div className="space-y-5 p-5">
            {isReporterNameRequired && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                보고 문구를 복사하려면 보고자 이름을 입력해 주세요.
              </p>
            )}

            {reportGroups.length > 0 ? (
              reportGroups.map((group) => {
                const isCopied = copiedAdmin === group.serverAdmin;
                const message = formatICheckReport(group.rows, {
                  name: reporterName,
                  position: reporterPosition,
                });

                return (
                  <article
                    key={group.serverAdmin}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {group.serverAdmin}
                        </h3>
                        <span className="status-pill bg-cyan-100 text-cyan-800">
                          장비 {group.rows.length}건
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(group)}
                        disabled={isReporterNameRequired}
                        className={
                          isCopied
                            ? 'btn bg-emerald-600 text-white'
                            : 'btn-primary'
                        }
                      >
                        {isCopied ? (
                          <IoMdCheckmark size={18} />
                        ) : (
                          <IoMdCopy size={18} />
                        )}
                        {isCopied ? '복사 완료' : '담당자 문구 복사'}
                      </button>
                    </div>
                    <pre className="overflow-auto whitespace-pre-wrap bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-200">
                      {message}
                    </pre>
                  </article>
                );
              })
            ) : (
              <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <MdFactCheck className="mx-auto mb-3 text-4xl text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">
                    담당자별 보고 문구가 여기에 표시됩니다.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    위에 아이체크 엑셀 데이터를 붙여넣어 주세요.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ICheckReport;
