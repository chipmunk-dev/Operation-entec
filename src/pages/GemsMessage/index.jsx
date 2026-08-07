import { useMemo, useState } from 'react';
import { IoMdCheckmark, IoMdCopy } from 'react-icons/io';
import { MdOutlineMessage } from 'react-icons/md';
import {
  formatGemsMessage,
  parseGemsMessageRows,
} from '../../utils/gemsMessageFormatter';
import {
  loadGemsReporterName,
  saveGemsReporterName,
} from '../../utils/gemsReporterStorage';

const outputModes = [
  {
    value: 'basic',
    title: '확인 내역만 제거',
  },
  {
    value: 'report',
    title: '메신저 보고 양식 자동완성',
  },
];

function GemsMessage() {
  const [name, setName] = useState(() => loadGemsReporterName());
  const [position, setPosition] = useState('사원');
  const [outputMode, setOutputMode] = useState('basic');
  const [rawInput, setRawInput] = useState('');
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => parseGemsMessageRows(rawInput), [rawInput]);
  const result = useMemo(
    () =>
      formatGemsMessage(rows, {
        mode: outputMode,
        name,
        position,
      }),
    [rows, outputMode, name, position],
  );
  const incompleteRowCount = rows.filter((row) => !row.isComplete).length;
  const removedConfirmationCount = rows.filter(
    (row) => row.confirmationText,
  ).length;
  const isReporterNameRequired = outputMode === 'report' && !name.trim();
  const canCopy =
    Boolean(result) && !isReporterNameRequired && incompleteRowCount === 0;

  const handleCopy = async () => {
    if (!canCopy) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <span className="page-eyebrow">G-EMS message formatter</span>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-600">
            <MdOutlineMessage size={25} />
          </span>
          <h1 className="page-title">담당자 제거·메신저 최적화</h1>
        </div>
        <p className="page-description">
          확인 처리된 여러 메시지의 확인 내역을 일괄 제거하고, 전달하기 좋은
          형식으로 정리합니다.
        </p>
      </header>

      <div className="grid gap-6">
        <section
          aria-invalid={isReporterNameRequired || undefined}
          className={`panel px-4 py-3 transition-colors ${
            isReporterNameRequired
              ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-100'
              : ''
          }`}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <h2
              className={`shrink-0 text-sm font-bold ${
                isReporterNameRequired ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              1. 보고자 정보와 출력 방식
            </h2>

            <div
              id="gems-message-settings"
              className="grid min-w-0 flex-1 gap-2 lg:grid-cols-[minmax(180px,0.8fr)_150px_minmax(430px,1.6fr)]"
            >
              <label className="mb-0 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="shrink-0">이름</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setName(nextName);
                    saveGemsReporterName(nextName);
                  }}
                  aria-invalid={isReporterNameRequired || undefined}
                  maxLength={50}
                  className={`field-input min-w-0 py-2 ${
                    isReporterNameRequired ? 'border-rose-300 bg-rose-50' : ''
                  }`}
                  placeholder="홍길동"
                />
              </label>
              <label className="mb-0 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="shrink-0">직급</span>
                <select
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  className="field-select min-w-0 py-2"
                >
                  <option value="사원">사원</option>
                  <option value="선임">선임</option>
                  <option value="책임">책임</option>
                </select>
              </label>

              <fieldset className="min-w-0">
                <legend className="sr-only">출력 방식</legend>
                <div className="grid grid-cols-2 gap-2">
                  {outputModes.map(({ value, title }) => {
                    const isSelected = outputMode === value;

                    return (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100'
                            : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="gems-output-mode"
                          value={value}
                          checked={isSelected}
                          onChange={(event) =>
                            setOutputMode(event.target.value)
                          }
                          className="h-4 w-4 shrink-0 border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm font-bold text-slate-800">
                          {title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">2. 원본 데이터 입력</h2>
          </div>

          <div className="panel-body">
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              className="field-input min-h-32 resize-y font-mono leading-6"
              placeholder={
                'HOST-01\tCPU Utilization MAJOR occurred\nHOST-02\tDisk Utilization MAJOR occurred'
              }
              spellCheck="false"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                줄바꿈은 새 메시지로 인식하며, 두 번째 이후 탭은 메시지에
                합쳐집니다.
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {removedConfirmationCount > 0 && (
                  <span className="status-pill bg-emerald-50 text-emerald-700">
                    확인 내역 제거 {removedConfirmationCount}건
                  </span>
                )}
                {incompleteRowCount > 0 && (
                  <span className="status-pill bg-rose-50 text-rose-700">
                    호스트·메시지 확인 필요 {incompleteRowCount}건
                  </span>
                )}
                <span
                  className={`status-pill ${
                    rows.length
                      ? 'bg-violet-50 text-violet-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {rows.length}개 행
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel flex min-h-[420px] flex-col overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">3. 완성된 메시지</h2>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!canCopy}
              className={copied ? 'btn bg-emerald-600 text-white' : 'btn-primary'}
            >
              {copied ? <IoMdCheckmark size={18} /> : <IoMdCopy size={18} />}
              {copied ? '복사 완료' : '전체 복사'}
            </button>
          </div>

          <div className="flex-1 p-5">
            {isReporterNameRequired && result && (
              <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                메신저 보고 양식을 자동완성하려면 이름을 입력해 주세요.
              </p>
            )}
            {incompleteRowCount > 0 && (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                복사하려면 확인 필요 행의 호스트·탭·메시지 입력을 확인해 주세요.
              </p>
            )}
            {result ? (
              <pre className="h-full min-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-200">
                {result}
              </pre>
            ) : (
              <div className="grid h-full min-h-72 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <MdOutlineMessage className="mx-auto mb-3 text-4xl text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">
                    완성된 메시지가 여기에 표시됩니다.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    위에 호스트와 메시지를 입력해 주세요.
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

export default GemsMessage;
