import { FaFileExcel } from 'react-icons/fa6';
import {
  MdClose,
  MdEditNote,
  MdOutlineLightbulb,
  MdOutlineViewList,
  MdOutlineWarningAmber,
  MdSave,
  MdUploadFile,
} from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import useEyeCheckLightLog from './useEyeCheckLightLog';
import { canOverwrite } from './fileAccess';
import WorkbookHeader from './WorkbookHeader';
import FloorInputs from './FloorInputs';
import OffRows from './OffRows';
import FloorPreview from './FloorPreview';
import DeviceRows from './DeviceRows';
import SaveBar from './SaveBar';

const howToSteps = [
  {
    title: '파일 열기',
    description:
      'Eye Check xlsx를 끌어다 놓거나 클릭해서 엽니다. 크롬에서 클릭해 열면 원본에 바로 덮어쓸 수 있습니다.',
    icon: <MdUploadFile />,
  },
  {
    title: '층별 점등 입력',
    description:
      '층 탭을 고르고 새로 켜진 자리를 적습니다. 기존 내역은 점검대상 칸에서 자동으로 가져옵니다.',
    icon: <MdEditNote />,
  },
  {
    title: '소등 고르기',
    description:
      '점등장비 목록에서 꺼진 장비 행을 체크하면 소등장비 시트로 옮기고 점검대상 칸에서도 뺍니다.',
    icon: <MdOutlineViewList />,
  },
  {
    title: '기록 내용 확인',
    description:
      '기록할 칸, 추가될 행, 경고를 확인합니다. 이상 있을 시 알려주세요!',
    icon: <MdOutlineWarningAmber />,
  },
  {
    title: '저장',
    description: '원본 파일에 덮어쓰거나(백업 자동) 새 파일로 내려받습니다.',
    icon: <MdSave />,
  },
];

const noticeStyles = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
};

function EyeCheckLightLog() {
  const {
    settings,
    doc,
    fileHandle,
    date,
    setDate,
    search,
    setSearch,
    notice,
    setNotice,
    alertText,
    setAlertText,
    saving,
    dragOver,
    setDragOver,
    fileInputRef,
    updateSettings,
    resetDoc,
    openFile,
    pickFile,
    handleDrop,
    floors,
    calcs,
    activeFloor,
    activeCalc,
    activeInput,
    grandTotal,
    visibleRows,
    selected,
    allVisibleSelected,
    overwrite,
    saveLabel,
    setActiveInput,
    clearActiveEdits,
    toggleRow,
    toggleVisibleRows,
    setPickType,
    setPickOther,
    handleSave,
    activeWarnings,
    floorsWithItems,
    totalDeviceRows,
    summaryParts,
    hasPending,
    isPreviewStale,
    content,
  } = useEyeCheckLightLog();

  return (
    <div className="page-shell">
      <PageHeader
        title="아이체크 점등·소등 처리"
        description="Eye Check 파일을 열어 층별 점등내역을 점검대상 칸에 기록하고, 소등된 장비를 소등장비 시트로 옮깁니다."
        icon={<FaFileExcel size={19} />}
        iconClassName="bg-amber-50 text-amber-700"
        helpTitle="아이체크 점등·소등 처리 사용방법"
        helpSummary="엑셀 파일을 직접 고쳐 원본에 덮어쓰거나 새 파일로 내려받습니다."
        helpSteps={howToSteps}
      />

      {alertText && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="eyecheck-alert-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setAlertText('');
          }}
        >
          <div className="panel w-full max-w-md border-t-4 border-t-amber-400 p-6">
            <p
              id="eyecheck-alert-title"
              className="text-lg font-extrabold text-amber-900"
            >
              파일이 최신인지 확인해 주세요
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {alertText}
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setAlertText('')}
              className="btn-primary mt-5 w-full"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${noticeStyles[notice.kind]}`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            aria-label="알림 닫기"
            onClick={() => setNotice(null)}
            className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100"
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        hidden
        onChange={(event) => openFile(event.target.files[0])}
      />

      {!doc ? (
        <div
          role="button"
          tabIndex={0}
          onClick={pickFile}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              pickFile();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`grid min-h-64 cursor-pointer place-items-center rounded-3xl border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? 'border-amber-400 bg-amber-50/80'
              : 'border-slate-300 bg-white/70 hover:border-amber-300 hover:bg-amber-50/40'
          }`}
        >
          <div>
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-3xl text-amber-600">
              <MdUploadFile />
            </span>
            <p className="text-base font-bold text-slate-800">
              Eye Check xlsx 파일을 여기에 놓거나 클릭해서 선택
            </p>
            <p className="mt-2 text-xs text-slate-500">
              파일은 이 브라우저 안에서만 처리되며 서버로 보내지 않습니다.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {canOverwrite
                ? '클릭해서 열면 원본 파일에 바로 덮어쓸 수 있습니다.'
                : '이 브라우저는 원본 덮어쓰기를 지원하지 않아 새 파일로 내려받습니다. (크롬 권장)'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <WorkbookHeader
            doc={doc}
            floors={floors}
            date={date}
            setDate={setDate}
            settings={settings}
            updateSettings={updateSettings}
            resetDoc={resetDoc}
            setNotice={setNotice}
          />

          {doc.eye && activeFloor && activeCalc && activeInput && (
            <FloorInputs
              grandTotal={grandTotal}
              calcs={calcs}
              settings={settings}
              updateSettings={updateSettings}
              activeFloor={activeFloor}
              activeInput={activeInput}
              setActiveInput={setActiveInput}
            />
          )}

          {doc.move && (
            <OffRows
              hasEye={Boolean(doc.eye)}
              rowCount={doc.move.rows.length}
              selected={selected}
              search={search}
              setSearch={setSearch}
              allVisibleSelected={allVisibleSelected}
              visibleRows={visibleRows}
              toggleVisibleRows={toggleVisibleRows}
              toggleRow={toggleRow}
            />
          )}

          {doc.eye && activeFloor && activeCalc && (
            <FloorPreview
              hasMove={Boolean(doc.move)}
              activeFloor={activeFloor}
              activeCalc={activeCalc}
              clearActiveEdits={clearActiveEdits}
              activeWarnings={activeWarnings}
            />
          )}

          {doc.move && floors.length > 0 && (
            <DeviceRows
              hasEye={Boolean(doc.eye)}
              settings={settings}
              updateSettings={updateSettings}
              content={content}
              floorsWithItems={floorsWithItems}
              totalDeviceRows={totalDeviceRows}
              setPickType={setPickType}
              setPickOther={setPickOther}
            />
          )}

          <SaveBar
            summaryParts={summaryParts}
            canWriteOriginal={Boolean(fileHandle)}
            settings={settings}
            updateSettings={updateSettings}
            overwrite={overwrite}
            fileName={doc.fileName}
            handleSave={handleSave}
            hasPending={hasPending}
            isPreviewStale={isPreviewStale}
            saving={saving}
            saveLabel={saveLabel}
          />
        </div>
      )}

      {!doc && (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <MdOutlineLightbulb size={16} className="text-amber-500" />
          기존 내역의 입력 규칙은 점등 내역 편집과 같습니다. 괄호 숫자는 자리별
          개수, 콤마 뒤 맨숫자는 앞 구역 글자를 이어받습니다.
        </p>
      )}
    </div>
  );
}

export default EyeCheckLightLog;
