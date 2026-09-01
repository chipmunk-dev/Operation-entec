import { useMemo, useState } from 'react';
import { IoMdCheckmark, IoMdCopy } from 'react-icons/io';
import { MdContentPaste, MdEmail, MdOutlineTune } from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import {
  FOREIGN_MAIL_FIELDS,
  formatForeignMail,
  parseForeignMailRows,
} from '../../utils/foreignMailFormatter';

const labels = { host: 'Host', message: 'Message', date: 'Date', ip: 'IP' };

const howToSteps = [
  {
    title: '원본 데이터 붙여넣기',
    description: 'Host·Message·Date·IP 데이터 행을 입력란에 붙여넣습니다.',
    icon: <MdContentPaste />,
  },
  {
    title: '열 순서 확인',
    description: '입력 순서가 다르면 열 설정에서 네 필드의 위치를 맞춥니다.',
    icon: <MdOutlineTune />,
  },
  {
    title: '영문 메일 복사',
    description: '자동 완성된 해외메일을 확인하고 전체 복사해 전달합니다.',
    icon: <IoMdCopy />,
  },
];

function ForeignMail() {
  const [rawInput, setRawInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputColumnOrder, setInputColumnOrder] = useState(
    FOREIGN_MAIL_FIELDS,
  );
  const [showSettings, setShowSettings] = useState(false);

  const parsedRows = useMemo(
    () => parseForeignMailRows(rawInput, inputColumnOrder),
    [rawInput, inputColumnOrder],
  );
  const result = useMemo(() => formatForeignMail(parsedRows), [parsedRows]);
  const validRowCount = parsedRows.length;
  const recoveredRowCount = parsedRows.filter((row) => row.wasRecovered).length;

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleColumnSelectChange = (currentIndex) => (event) => {
    const selectedDataType = event.target.value;
    const currentDataType = inputColumnOrder[currentIndex];
    if (selectedDataType === currentDataType) return;

    const targetIndex = inputColumnOrder.indexOf(selectedDataType);
    const nextOrder = [...inputColumnOrder];
    nextOrder[targetIndex] = currentDataType;
    nextOrder[currentIndex] = selectedDataType;
    setInputColumnOrder(nextOrder);
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="해외메일 포맷 변환기"
        description="모니터링 데이터를 표준 영문 장애 메일로 자동 변환합니다."
        icon={<MdEmail size={21} />}
        iconClassName="bg-blue-50 text-blue-600"
        helpTitle="해외메일 작성 사용방법"
        helpSummary="모니터링 데이터를 표준 영문 장애 메일로 변환합니다."
        helpSteps={howToSteps}
      />

      <div className="grid gap-6">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="font-bold text-slate-900">1. 원본 데이터 입력</h2>
              <p className="mt-1 text-xs text-slate-500">엑셀 데이터를 그대로 붙여넣으세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              aria-expanded={showSettings}
              className="btn-secondary"
            >
              <MdOutlineTune size={18} />
              {showSettings ? '열 순서 닫기' : '열 순서 설정'}
            </button>
          </div>

          {showSettings && (
            <div className="border-b border-blue-100 bg-blue-50/70 p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {inputColumnOrder.map((dataType, index) => (
                  <label key={dataType} className="text-xs font-semibold text-blue-700">
                    {index + 1}열
                    <select
                      value={dataType}
                      onChange={handleColumnSelectChange(index)}
                      className="field-select mt-1.5"
                    >
                      {FOREIGN_MAIL_FIELDS.map((type) => (
                        <option key={type} value={type}>
                          {labels[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="panel-body">
            <textarea
              className="field-input source-input-compact"
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              placeholder={'HOST-01\tDisk usage warning\t2026-07-26 09:00\t10.0.0.1'}
              spellCheck="false"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">탭(Tab)으로 구분된 4개 열을 인식합니다.</span>
              <div className="flex flex-wrap items-center gap-2">
                {recoveredRowCount > 0 && (
                  <span className="status-pill bg-violet-50 text-violet-700">
                    Message 탭·줄바꿈 자동 정리 {recoveredRowCount}건
                  </span>
                )}
                <span className={`status-pill ${validRowCount ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {validRowCount}개 행
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel flex min-h-[480px] flex-col overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="font-bold text-slate-900">2. 완성된 메일</h2>
              <p className="mt-1 text-xs text-slate-500">내용을 확인한 뒤 복사하세요.</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!result}
              className={copied ? 'btn bg-emerald-600 text-white' : 'btn-primary'}
            >
              {copied ? <IoMdCheckmark size={18} /> : <IoMdCopy size={18} />}
              {copied ? '복사 완료' : '메일 전체 복사'}
            </button>
          </div>

          <div className="flex-1 p-5">
            {result ? (
              <pre className="h-full min-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-200">
                {result}
              </pre>
            ) : (
              <div className="grid h-full min-h-80 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <MdEmail className="mx-auto mb-3 text-4xl text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">완성된 메일이 여기에 표시됩니다.</p>
                  <p className="mt-1 text-xs text-slate-400">위에 원본 데이터를 입력해 주세요.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ForeignMail;
