import { useEffect, useState } from 'react';
import { IoMdCheckmark, IoMdCopy } from 'react-icons/io';
import { MdEmail, MdOutlineTune } from 'react-icons/md';

const dataTypes = ['host', 'message', 'date', 'ip'];
const labels = { host: 'Host', message: 'Message', date: 'Date', ip: 'IP' };

function ForeignMail() {
  const [mails, setMails] = useState([]);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputColumnOrder, setInputColumnOrder] = useState(dataTypes);
  const [showSettings, setShowSettings] = useState(false);

  const validRowCount = mails.filter((mail) => mail.trim()).length;

  useEffect(() => {
    const messages = mails.reduce((acc, mail) => {
      if (!mail.trim()) return acc;

      const columns = mail.split('\t');
      const parsedData = {};
      inputColumnOrder.forEach((dataType, columnIndex) => {
        parsedData[dataType] = columns[columnIndex] || '';
      });

      const cleanedMessage = (parsedData.message || '').replace(/\[202.*/g, '');
      const separator =
        '------------------------------------------------------------------------------------------';
      const block = `${acc ? '' : `${separator}\n`}Date: ${parsedData.date} (Base On Korea Time)
IP: ${parsedData.ip}
Host: ${parsedData.host}
Message: ${cleanedMessage}
${separator}
`;
      return acc + block;
    }, '');

    setResult(
      messages
        ? `Dear!
This is KIC Control office in Korea.
Monitoring System detected warning message(s) from your server.
Please check following message(s).

${messages}
Thank you.`
        : '',
    );
  }, [mails, inputColumnOrder]);

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
      <header className="page-header">
        <span className="page-eyebrow">Message formatter</span>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 text-blue-600">
            <MdEmail size={25} />
          </span>
          <h1 className="page-title">해외메일 포맷 변환기</h1>
        </div>
        <p className="page-description">
          모니터링 데이터를 붙여넣으면 해외 담당자에게 전달할 표준 영문 메일을
          자동으로 완성합니다.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="font-bold text-slate-900">1. 원본 데이터 입력</h2>
              <p className="mt-1 text-xs text-slate-500">엑셀 데이터를 그대로 붙여넣으세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="btn-secondary"
            >
              <MdOutlineTune size={18} />
              열 순서 설정
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
                      {dataTypes.map((type) => (
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
              className="field-input min-h-72 resize-y font-mono leading-6"
              onChange={(event) => setMails(event.target.value.split('\n'))}
              placeholder={'HOST-01\tDisk usage warning\t2026-07-26 09:00\t10.0.0.1'}
              spellCheck="false"
            />
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">탭(Tab)으로 구분된 4개 열을 인식합니다.</span>
              <span className={`status-pill ${validRowCount ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {validRowCount}개 행
              </span>
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
                  <p className="mt-1 text-xs text-slate-400">왼쪽에 원본 데이터를 입력해 주세요.</p>
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
