import { useMemo, useState } from 'react';
import { IoMdCheckmark, IoMdCopy } from 'react-icons/io';
import {
  MdContentPaste,
  MdEditNote,
  MdOutlineLightbulb,
  MdOutlineViewList,
} from 'react-icons/md';
import HowToPopover from '../../components/HowToPopover';
import WorkflowGuide from '../../components/WorkflowGuide';
import { buildLightLog } from '../../utils/lightLogFormatter';

const howToSteps = [
  {
    title: '기존 내역 붙여넣기',
    description: '엑셀의 점등내역 셀을 그대로 붙여넣습니다. 줄바꿈이 있어도 됩니다.',
    icon: <MdContentPaste />,
  },
  {
    title: '점등·소등 입력',
    description: '아이체크에서 확인한 켜진 자리와 꺼진 자리를 한꺼번에 적습니다.',
    icon: <MdEditNote />,
  },
  {
    title: '구역별 확인',
    description: '구역마다 한 줄로 펼쳐 바뀐 항목을 눈으로 확인합니다.',
    icon: <MdOutlineViewList />,
  },
  {
    title: '결과 복사',
    description: '원래 한 줄 형태로 되돌린 내역을 복사해 엑셀에 붙여넣습니다.',
    icon: <IoMdCopy />,
  },
];

const markStyles = {
  added: 'bg-emerald-50 text-emerald-700 font-bold',
  changed: 'bg-amber-50 text-amber-800 font-bold',
  removed: 'bg-rose-50 text-rose-600 line-through',
};

function LightLogEditor() {
  const [baseInput, setBaseInput] = useState('');
  const [onInput, setOnInput] = useState('');
  const [offInput, setOffInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const log = useMemo(
    () => buildLightLog(baseInput, onInput, offInput),
    [baseInput, onInput, offInput],
  );

  const diff = log ? log.total - log.before : 0;
  const canCopy = Boolean(log?.output);

  const handleCopy = async () => {
    if (!canCopy) return;

    try {
      await navigator.clipboard.writeText(log.output);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-start justify-between gap-3">
          <span className="page-eyebrow">Light log editor</span>
          <HowToPopover
            title="점등 내역 편집 사용방법"
            summary="기존 내역에 점등·소등을 반영해 원래 형태로 되돌립니다."
            steps={howToSteps}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-600">
            <MdOutlineLightbulb size={25} />
          </span>
          <h1 className="page-title">점등 내역 편집</h1>
        </div>
        <p className="page-description">
          기존 내역에 아이체크 결과를 반영합니다. 바뀐 항목만 손대고 나머지 글자와
          줄 구조는 원문 그대로 두기 때문에, 결과를 그대로 엑셀에 붙여넣을 수 있습니다.
        </p>
      </header>

      <WorkflowGuide steps={['기존 내역 입력', '점등·소등 입력', '결과 확인·복사']} />

      <div className="grid gap-6">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">1. 기존 내역</h2>
          </div>
          <div className="panel-body">
            <textarea
              value={baseInput}
              onChange={(event) => setBaseInput(event.target.value)}
              className="field-input min-h-28 resize-y font-mono leading-6"
              placeholder={'점등(95ea) : A-15(3),21/B-01-3,15,18'}
              spellCheck="false"
            />
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">2. 아이체크 결과 입력</h2>
          </div>
          <div className="panel-body">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="mb-0 block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="status-pill bg-emerald-50 text-emerald-700">점등</span>
                  새로 켜진 것
                </span>
                <textarea
                  value={onInput}
                  onChange={(event) => setOnInput(event.target.value)}
                  className="field-input min-h-20 resize-y font-mono leading-6"
                  placeholder={'A-15, D-24(2), M-01'}
                  spellCheck="false"
                />
              </label>
              <label className="mb-0 block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="status-pill bg-rose-50 text-rose-700">소등</span>
                  꺼진 것
                </span>
                <textarea
                  value={offInput}
                  onChange={(event) => setOffInput(event.target.value)}
                  className="field-input min-h-20 resize-y font-mono leading-6"
                  placeholder={'B-18, E-49(2)'}
                  spellCheck="false"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              쉼표나 줄바꿈으로 구분합니다. 구역 글자를 붙여 주세요
              (<code className="font-mono">A-15</code>). 같은 자리가 여러 개면{' '}
              <code className="font-mono">D-24(2)</code>처럼 개수를 적습니다.
            </p>
          </div>
        </section>

        {log && log.sectors.length > 0 && (
          <section className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="font-bold text-slate-900">3. 구역별 정리</h2>
              <span className="text-xs text-slate-500">
                구역 {log.sectors.length}개 · 총 {log.total}
              </span>
            </div>
            <div className="panel-body">
              <div className="divide-y divide-slate-100">
                {log.sectors.map((sector) => (
                  <div
                    key={sector.group}
                    className="grid grid-cols-[38px_1fr_auto] items-baseline gap-3 py-2.5"
                  >
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {sector.group}
                    </span>
                    <span className="break-all font-mono text-[13px] leading-7">
                      {sector.items.map((item) => (
                        <span
                          key={`${sector.group}-${item.num}`}
                          className={`mr-0.5 inline-block rounded px-1.5 ${
                            markStyles[item.mark] ?? ''
                          }`}
                        >
                          {item.num || sector.group}
                          {item.count > 1 ? `(${item.count})` : ''}
                        </span>
                      ))}
                    </span>
                    <span className="text-right font-mono text-[13px] text-slate-500">
                      {sector.items.reduce(
                        (sum, item) => sum + (item.removed ? 0 : item.count),
                        0,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="panel flex min-h-[360px] flex-col overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">4. 갱신된 내역</h2>
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
            {log && log.unread.length > 0 && (
              <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                인식하지 못한 조각이 있어 반영하지 않았습니다 : {log.unread.join(', ')}
              </p>
            )}
            {log && log.missing.length > 0 && (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                소등으로 넣었지만 기존 내역에 없는 자리입니다 : {log.missing.join(', ')}
              </p>
            )}
            {log && !log.hasHead && (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                머리말의 개수 표기를 찾지 못했습니다. 개수는 세었지만 갱신하지
                않고 원문을 그대로 두었습니다.
              </p>
            )}
            {copyFailed && (
              <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                복사하지 못했습니다. 아래 내용을 직접 선택해 복사해 주세요.
              </p>
            )}

            {log && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="status-pill bg-amber-50 text-amber-700">
                  총 점등 {log.total}
                </span>
                {diff !== 0 && (
                  <span
                    className={`status-pill ${
                      diff > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff} (이전 {log.before})
                  </span>
                )}
              </div>
            )}

            {log?.output ? (
              <pre className="h-full min-h-56 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-7 text-slate-200">
                {log.output}
              </pre>
            ) : (
              <div className="grid h-full min-h-56 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <MdOutlineLightbulb className="mx-auto mb-3 text-4xl text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">
                    갱신된 내역이 여기에 표시됩니다.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    위에 기존 내역을 붙여넣어 주세요.
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

export default LightLogEditor;
