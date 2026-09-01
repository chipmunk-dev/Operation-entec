import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  MdBlock,
  MdCheckCircle,
  MdOutlineFileDownload,
  MdOutlineTune,
  MdUndo,
  MdOutlineVisibility,
  MdOutlineVisibilityOff,
  MdWarningAmber,
} from 'react-icons/md';
import { FaFileExcel } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader';
import WorkflowGuide from '../../components/WorkflowGuide';
import {
  DEFAULT_PERSISTENT_EVENT_ORDER,
  PERSISTENT_EVENT_FIELDS,
  expandRowsForExcel,
  getResolvedAdmins,
  parsePersistentEventRows,
} from '../../utils/persistentEventParser';
import { downloadPersistentEventWorkbook } from '../../utils/xlsxExport';

const buildFileName = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const compactDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `지속메시지_${compactDate}.xlsx`;
};

const howToSteps = [
  {
    title: '원본 데이터 입력',
    description: '지속시간·그룹·호스트·내용·발생일시·IP 열을 붙여넣습니다.',
    icon: <MdOutlineTune />,
  },
  {
    title: '담당자 확인',
    description: '자동 판독된 담당자를 확인하고 복수·미검출 항목을 확정합니다.',
    icon: <MdOutlineVisibility />,
  },
  {
    title: '제외 항목 정리',
    description: '엑셀에 포함하지 않을 특이사항 행을 개별 또는 일괄 제외합니다.',
    icon: <MdBlock />,
  },
  {
    title: '엑셀 다운로드',
    description: '검토가 끝난 데이터를 담당자 필터가 적용된 파일로 저장합니다.',
    icon: <MdOutlineFileDownload />,
  },
];

const getReviewMeta = (row) => {
  const adminIssue =
    row.adminCandidates.length === 0
      ? '담당자 미검출'
      : row.adminCandidates.length > 1
        ? '복수 담당자'
        : null;
  const dataIssues = [
    !row.hasEnoughColumns ? '열 개수 부족' : null,
    !row.occurrenceAt ? '발생일시 누락' : null,
    !row.data.host ? '호스트 누락' : null,
    !row.cleanContent ? '내용 누락' : null,
  ].filter(Boolean);
  const requiresAdminSelectionConfirmation = row.adminCandidates.length > 1;

  return {
    adminIssue,
    dataIssues,
    redirectFallbackIssue: row.usedRedirectFallback
      ? '재전달 이력 참고'
      : null,
    recoveryIssue: row.wasRecovered
      ? [
          row.extraContentColumns > 0 || row.physicalLineCount > 1
            ? '내용 탭·줄바꿈 자동 복구'
            : null,
          row.ignoredTrailingColumns > 0
            ? `후행 열 ${row.ignoredTrailingColumns}개 자동 제외`
            : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null,
    isResolved:
      row.excluded ||
      (getResolvedAdmins(row).length > 0 &&
        dataIssues.length === 0 &&
        (!requiresAdminSelectionConfirmation ||
          row.adminSelectionConfirmed)),
  };
};

function AdminEditor({
  row,
  onToggle,
  onManualDraftChange,
  onManualConfirm,
  onSelectionConfirm,
}) {
  const resolvedAdmins = getResolvedAdmins(row);
  const canConfirmManualAdmin = row.manualAdminDraft.trim().length > 0;
  const requiresSelectionConfirm = row.adminCandidates.length > 1;

  const handleManualKeyDown = (event) => {
    if (
      event.key === 'Enter' &&
      !event.nativeEvent.isComposing &&
      canConfirmManualAdmin
    ) {
      event.preventDefault();
      onManualConfirm(row.id);
    }
  };

  return (
    <div className="space-y-3">
      {row.adminCandidates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {row.adminCandidates.map((candidate) => {
            const isSelected = row.selectedAdmins.includes(candidate.label);
            return (
              <label
                key={candidate.label}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(row.id, candidate.label)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {candidate.label}
              </label>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={row.manualAdminDraft}
          onChange={(event) =>
            onManualDraftChange(row.id, event.target.value)
          }
          onKeyDown={handleManualKeyDown}
          className="field-input py-2 text-xs"
          placeholder={
            row.adminCandidates.length
              ? '추가 담당자 직접 입력 (여러 명은 쉼표로 구분)'
              : '담당자 직접 입력 (예: 정민규 책임)'
          }
          aria-label={`${row.lineNumber}행 담당자 직접 입력`}
        />
        <button
          type="button"
          onClick={() => onManualConfirm(row.id)}
          disabled={!canConfirmManualAdmin}
          className="btn-primary shrink-0 py-2 text-xs"
        >
          담당자 확정
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        입력 후 Enter 또는 담당자 확정 버튼을 눌러야 목록에 반영됩니다.
      </p>

      {resolvedAdmins.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            엑셀 입력:{' '}
            <span className="font-semibold text-slate-700">
              {resolvedAdmins.join(', ')}
            </span>
          </p>
          {requiresSelectionConfirm && (
            <button
              type="button"
              onClick={() => onSelectionConfirm(row.id)}
              className="btn-primary py-2 text-xs"
            >
              선택 완료
            </button>
          )}
        </div>
      )}
    </div>
  );
}

AdminEditor.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string.isRequired,
    lineNumber: PropTypes.number.isRequired,
    adminCandidates: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
      }),
    ).isRequired,
    selectedAdmins: PropTypes.arrayOf(PropTypes.string).isRequired,
    adminSelectionConfirmed: PropTypes.bool.isRequired,
    manualAdmins: PropTypes.string.isRequired,
    manualAdminDraft: PropTypes.string.isRequired,
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  onManualDraftChange: PropTypes.func.isRequired,
  onManualConfirm: PropTypes.func.isRequired,
  onSelectionConfirm: PropTypes.func.isRequired,
};

function PersistentEventExcel() {
  const [rawInput, setRawInput] = useState('');
  const [inputColumnOrder, setInputColumnOrder] = useState(
    DEFAULT_PERSISTENT_EVENT_ORDER,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showCompletedReviews, setShowCompletedReviews] = useState(false);
  const [rows, setRows] = useState([]);
  const [exportFeedback, setExportFeedback] = useState(null);

  useEffect(() => {
    setRows(parsePersistentEventRows(rawInput, inputColumnOrder));
    setExportFeedback(null);
    setShowCompletedReviews(false);
  }, [rawInput, inputColumnOrder]);

  const handleColumnSelectChange = (currentIndex) => (event) => {
    const nextField = event.target.value;
    const currentField = inputColumnOrder[currentIndex];
    if (nextField === currentField) return;

    const targetIndex = inputColumnOrder.indexOf(nextField);
    const nextOrder = [...inputColumnOrder];
    nextOrder[currentIndex] = nextField;
    nextOrder[targetIndex] = currentField;
    setInputColumnOrder(nextOrder);
  };

  const updateRow = (rowId, updater) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? updater(row) : row)),
    );
  };

  const handleToggleAdmin = (rowId, label) => {
    updateRow(rowId, (row) => ({
      ...row,
      adminSelectionConfirmed: false,
      selectedAdmins: row.selectedAdmins.includes(label)
        ? row.selectedAdmins.filter((admin) => admin !== label)
        : [...row.selectedAdmins, label],
    }));
  };

  const handleManualAdminDraftChange = (rowId, value) => {
    updateRow(rowId, (row) => ({ ...row, manualAdminDraft: value }));
  };

  const handleManualAdminConfirm = (rowId) => {
    updateRow(rowId, (row) => ({
      ...row,
      adminSelectionConfirmed: false,
      manualAdmins: row.manualAdminDraft.trim(),
    }));
  };

  const handleAdminSelectionConfirm = (rowId) => {
    updateRow(rowId, (row) => ({
      ...row,
      adminSelectionConfirmed: getResolvedAdmins(row).length > 0,
    }));
  };

  const handleToggleRowExclusion = (rowId) => {
    updateRow(rowId, (row) => ({ ...row, excluded: !row.excluded }));
  };

  const attentionRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.adminCandidates.length !== 1 ||
          row.usedRedirectFallback ||
          row.wasRecovered ||
          !row.hasEnoughColumns ||
          !row.occurrenceAt ||
          !row.data.host ||
          !row.cleanContent,
      ),
    [rows],
  );
  const activeRows = rows.filter((row) => !row.excluded);
  const excludedRows = rows.filter((row) => row.excluded);
  const unresolvedAdminRows = activeRows.filter(
    (row) => getResolvedAdmins(row).length === 0,
  );
  const unconfirmedMultiAdminRows = activeRows.filter(
    (row) =>
      row.adminCandidates.length > 1 &&
      getResolvedAdmins(row).length > 0 &&
      !row.adminSelectionConfirmed,
  );
  const recoveredRows = rows.filter((row) => row.wasRecovered);
  const pendingReviewRows = attentionRows.filter(
    (row) => !getReviewMeta(row).isResolved,
  );
  const completedReviewRows = attentionRows.filter(
    (row) => getReviewMeta(row).isResolved,
  );
  const invalidDataRows = activeRows.filter(
    (row) =>
      !row.hasEnoughColumns ||
      !row.occurrenceAt ||
      !row.data.host ||
      !row.cleanContent,
  );
  const blockingRowCount = activeRows.filter(
    (row) =>
      getResolvedAdmins(row).length === 0 ||
      (row.adminCandidates.length > 1 &&
        !row.adminSelectionConfirmed) ||
      !row.hasEnoughColumns ||
      !row.occurrenceAt ||
      !row.data.host ||
      !row.cleanContent,
  ).length;
  const allAttentionRowsExcluded =
    attentionRows.length > 0 && attentionRows.every((row) => row.excluded);
  const excelRows = useMemo(() => expandRowsForExcel(rows), [rows]);
  const canExport =
    activeRows.length > 0 &&
    unresolvedAdminRows.length === 0 &&
    unconfirmedMultiAdminRows.length === 0 &&
    invalidDataRows.length === 0;

  const handleToggleAllAttentionExclusion = () => {
    const attentionRowIds = new Set(attentionRows.map(({ id }) => id));
    const nextExcludedState = !allAttentionRowsExcluded;
    setRows((currentRows) =>
      currentRows.map((row) =>
        attentionRowIds.has(row.id)
          ? { ...row, excluded: nextExcludedState }
          : row,
      ),
    );
  };

  const handleExport = () => {
    if (!canExport) {
      setExportFeedback({
        type: 'error',
        message: '담당자와 입력 데이터의 미해결 항목을 먼저 확인해 주세요.',
      });
      return;
    }

    try {
      downloadPersistentEventWorkbook(excelRows, buildFileName());
      setExportFeedback({
        type: 'success',
        message: `${excelRows.length}개 행이 포함된 엑셀 파일을 생성했습니다.`,
      });
    } catch {
      setExportFeedback({
        type: 'error',
        message: '엑셀 파일 생성에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
      });
    }
  };

  const renderReviewCard = (row) => {
    const {
      adminIssue,
      dataIssues,
      redirectFallbackIssue,
      recoveryIssue,
      isResolved,
    } = getReviewMeta(row);

    return (
      <article
        key={row.id}
        className={`rounded-xl border p-4 ${
          row.excluded
            ? 'border-slate-200 bg-slate-100/70'
            : isResolved
            ? 'border-emerald-200 bg-emerald-50/50'
            : 'border-amber-200 bg-amber-50/60'
        }`}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                입력 {row.lineNumber}
                {row.physicalLineCount > 1
                  ? `~${row.lineNumber + row.physicalLineCount - 1}`
                  : ''}
                행 · {row.data.host || '호스트 없음'}
              </span>
              {[
                adminIssue,
                redirectFallbackIssue,
                recoveryIssue,
                ...dataIssues,
              ]
                .filter(Boolean)
                .map((issue) => (
                  <span
                    key={issue}
                    className="status-pill bg-amber-100 text-amber-800"
                  >
                    {issue}
                  </span>
                ))}
            </div>
            {row.confirmationText && (
              <div className="mt-2 space-y-1 break-all text-xs leading-5 text-slate-500">
                <p>
                  담당자 판독 범위
                  {row.usedRedirectFallback ? ' (재전달 이력 참고)' : ''}:{' '}
                  {row.adminSourceText}
                </p>
                {row.ignoredRedirectText && !row.usedRedirectFallback && (
                  <p className="text-slate-400">
                    재전달 제외 범위: {row.ignoredRedirectText}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`status-pill ${
                row.excluded
                  ? 'bg-slate-200 text-slate-700'
                  : isResolved
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-white text-amber-800'
              }`}
            >
              {row.excluded
                ? '엑셀 제외'
                : isResolved
                  ? '설정 완료'
                  : '확인 필요'}
            </span>
            <button
              type="button"
              onClick={() => handleToggleRowExclusion(row.id)}
              className={
                row.excluded
                  ? 'btn-secondary px-3 py-1.5 text-xs'
                  : 'btn px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50'
              }
            >
              {row.excluded ? <MdUndo size={15} /> : <MdBlock size={15} />}
              {row.excluded ? '제외 취소' : '엑셀 제외'}
            </button>
          </div>
        </div>

        {adminIssue && !row.excluded && (
          <AdminEditor
            row={row}
            onToggle={handleToggleAdmin}
            onManualDraftChange={handleManualAdminDraftChange}
            onManualConfirm={handleManualAdminConfirm}
            onSelectionConfirm={handleAdminSelectionConfirm}
          />
        )}
      </article>
    );
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="지속 메시지 엑셀 추출"
        description="지속 메시지의 담당자를 검토하고 필터가 포함된 보고용 엑셀을 생성합니다."
        icon={<FaFileExcel size={19} />}
        iconClassName="bg-emerald-50 text-emerald-600"
        helpTitle="지속 메시지 엑셀 추출 사용방법"
        helpSummary="지속 메시지의 담당자를 검토하고 보고용 엑셀을 생성합니다."
        helpSteps={howToSteps}
      />

      <WorkflowGuide
        steps={['원본 데이터 입력', '담당자·특이사항 검토', '엑셀 추출']}
      />

      <section className="panel mb-6 overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="font-bold text-slate-900">1. 원본 데이터 입력</h2>
            <p className="mt-1 text-xs text-slate-500">
              탭(Tab)으로 구분된 데이터를 한 행씩 붙여넣으세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((current) => !current)}
            aria-expanded={showSettings}
            className="btn-secondary"
          >
            <MdOutlineTune size={18} />
            {showSettings ? '열 순서 닫기' : '열 순서 설정'}
          </button>
        </div>

        {showSettings && (
          <div className="border-b border-blue-100 bg-blue-50/70 p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {inputColumnOrder.map((field, index) => (
                <label
                  key={field}
                  className="text-xs font-semibold text-blue-700"
                >
                  {index + 1}열
                  <select
                    value={field}
                    onChange={handleColumnSelectChange(index)}
                    className="field-select mt-1.5"
                  >
                    {PERSISTENT_EVENT_FIELDS.map(({ key, label }) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-blue-700">
              기본값은 지속시간 → 그룹명 → 호스트 → 내용 → 발생일시 → IP입니다.
              필드를 바꾸면 기존 필드와 위치가 서로 교환됩니다.
            </p>
          </div>
        )}

        <div className="panel-body">
          <textarea
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            className="field-input min-h-56 resize-y font-mono text-xs leading-6"
            placeholder={
              '1일 16시간 57분\t하이엠솔루텍\tHIMSWHIRUN02V\t/logs001 Utilization MAJOR occurred [2026-07-08 13:39:08: 이승규 선임 문자 → 전예찬 사원 이승규 선임 메신저 재전달 확인]\t2026-07-08 13:22:28\t156.147.36.89'
            }
            spellCheck="false"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              입력한 발생일시를 계산하거나 변환하지 않고 그대로 사용합니다.
            </span>
            <span
              className={`status-pill ${
                rows.length
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {rows.length}개 입력 행
            </span>
            {recoveredRows.length > 0 && (
              <span className="status-pill bg-violet-50 text-violet-700">
                내용 구분자 자동 복구 {recoveredRows.length}건
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="panel mb-6 overflow-hidden">
        <div className="panel-header">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">2. 특이사항 확인</h2>
              {rows.length > 0 && (
                <span
                  className={`status-pill ${
                    activeRows.length === 0
                      ? 'bg-slate-200 text-slate-700'
                      : unresolvedAdminRows.length ||
                          unconfirmedMultiAdminRows.length ||
                          invalidDataRows.length
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {activeRows.length === 0
                    ? '모든 행 엑셀 제외'
                    : unresolvedAdminRows.length ||
                        unconfirmedMultiAdminRows.length ||
                        invalidDataRows.length
                    ? `${blockingRowCount}건 확인 필요`
                    : '추출 준비 완료'}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              복수 담당자는 모두 고른 뒤 선택 완료를 누르고, 미검출 담당자는 직접
              입력해 주세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {attentionRows.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAllAttentionExclusion}
                className={
                  allAttentionRowsExcluded
                    ? 'btn-secondary'
                    : 'btn border border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                }
              >
                {allAttentionRowsExcluded ? (
                  <MdUndo size={18} />
                ) : (
                  <MdBlock size={18} />
                )}
                {allAttentionRowsExcluded
                  ? '일괄 제외 취소'
                  : '특이사항 일괄 제외'}
              </button>
            )}
            {completedReviewRows.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setShowCompletedReviews((currentValue) => !currentValue)
                }
                className="btn-secondary"
              >
                {showCompletedReviews ? (
                  <MdOutlineVisibilityOff size={18} />
                ) : (
                  <MdOutlineVisibility size={18} />
                )}
                {showCompletedReviews ? '설정 완료 숨기기' : '설정 완료 보기'}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {completedReviewRows.length}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          {!rows.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-400">
              원본 데이터를 입력하면 담당자 검토 항목이 표시됩니다.
            </div>
          ) : (
            <div className="space-y-6">
              {pendingReviewRows.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-800">
                      확인 필요
                    </h3>
                    <span className="status-pill bg-amber-100 text-amber-800">
                      {pendingReviewRows.length}건
                    </span>
                  </div>
                  {pendingReviewRows.map(renderReviewCard)}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  <MdCheckCircle className="shrink-0 text-2xl" />
                  <span>
                    확인이 필요한 항목이 없습니다.
                    {completedReviewRows.length > 0 &&
                      ` 설정 완료 ${completedReviewRows.length}건은 숨겨져 있습니다.`}
                  </span>
                </div>
              )}

              {showCompletedReviews && completedReviewRows.length > 0 && (
                <div className="space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-emerald-700">
                      설정 완료
                    </h3>
                    <span className="status-pill bg-emerald-100 text-emerald-700">
                      {completedReviewRows.length}건
                    </span>
                  </div>
                  {completedReviewRows.map(renderReviewCard)}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="font-bold text-slate-900">3. 엑셀 미리보기</h2>
            <p className="mt-1 text-xs text-slate-500">
              실제 파일에 입력될 행입니다. 복수 담당자는 같은 메시지가 담당자별로
              한 행씩 표시됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            className="btn-primary"
          >
            <MdOutlineFileDownload size={19} />
            엑셀 파일 추출
          </button>
        </div>

        {exportFeedback && (
          <div
            className={`border-b px-5 py-3 text-sm ${
              exportFeedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {exportFeedback.message}
          </div>
        )}

        {!canExport && rows.length > 0 && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800">
            <MdWarningAmber className="shrink-0 text-lg" />
            {activeRows.length === 0
              ? '모든 입력 행이 엑셀에서 제외되었습니다. 한 건 이상 제외를 취소해 주세요.'
              : `담당자 미해결 ${unresolvedAdminRows.length}건 · 복수선택 미확정 ${unconfirmedMultiAdminRows.length}건 · 입력 오류 ${invalidDataRows.length}건을 해결하면 추출할 수 있습니다.`}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[1300px] w-full border-collapse text-left text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                {[
                  'No.',
                  '발생일시',
                  '지속시간',
                  '어드민',
                  '호스트명',
                  '내용',
                  'IP',
                  '그룹명',
                ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-bold"
                    >
                      {header}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {!excelRows.length ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-sm text-slate-400">
                    {activeRows.length === 0 && rows.length
                      ? '모든 입력 행이 엑셀에서 제외되었습니다.'
                      : rows.length
                        ? '담당자를 설정하면 출력 행이 표시됩니다.'
                      : '미리볼 데이터가 없습니다.'}
                  </td>
                </tr>
              ) : (
                excelRows.map((row) => (
                    <tr
                      key={`${row.no}-${row.admin}-${row.host}`}
                      className="align-top even:bg-slate-50/60"
                    >
                      <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-500">
                        {row.no}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-700">
                        {row.occurredAt || '계산 불가'}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-600">
                        {row.duration || '-'}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <span className="status-pill bg-blue-50 text-blue-700">
                          {row.admin}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-700">
                        {row.host || '-'}
                      </td>
                      <td className="max-w-md whitespace-pre-wrap break-words border-b border-slate-100 px-4 py-4 leading-5 text-slate-600">
                        {row.content || '-'}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-600">
                        {row.ip || '-'}
                      </td>
                      <td className="max-w-xs break-words border-b border-slate-100 px-4 py-4 leading-5 text-slate-600">
                        {row.group || '-'}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500">
          <span>
            엑셀 열: No. · 발생일시 · 지속시간 · 어드민 · 호스트명 · 내용 · IP ·
            그룹명
            {excludedRows.length > 0 && ` · 제외 ${excludedRows.length}건`}
          </span>
          <span className="font-semibold text-slate-700">
            최종 {excelRows.length}개 행
          </span>
        </div>
      </section>
    </div>
  );
}

export default PersistentEventExcel;
