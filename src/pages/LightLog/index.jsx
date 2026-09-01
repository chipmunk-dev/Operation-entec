import { useEffect, useMemo, useRef, useState } from 'react';
import { IoMdCheckmark, IoMdCopy } from 'react-icons/io';
import {
  MdContentPaste,
  MdEditNote,
  MdGridOn,
  MdOutlineLightbulb,
  MdOutlineViewList,
} from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import WorkflowGuide from '../../components/WorkflowGuide';
import { buildLightLog, splitLabel } from '../../utils/lightLogFormatter';
import {
  FLOOR_KEYS,
  loadLightLogState,
  saveLightLogState,
} from '../../utils/lightLogStorage';

const howToSteps = [
  {
    title: '층 선택·기존 내역 붙여넣기',
    description: '엑셀에서 각 층 셀을 복사해 해당 층 탭에 붙여넣습니다.',
    icon: <MdContentPaste />,
  },
  {
    title: '점등·소등 입력',
    description: '아이체크에서 확인한 켜진 자리와 꺼진 자리를 채워 넣습니다.',
    icon: <MdEditNote />,
  },
  {
    title: '구역별 더블체크',
    description:
      '점등이 추가되고 소등이 제거되었는지 확인합니다. 이상 있을 시 알려주세요!',
    icon: <MdOutlineViewList />,
  },
  {
    title: '반영 후 전체 복사',
    description:
      '갱신된 내역을 기존 내역에 반영을 누른 뒤 전체 복사를 누릅니다.',
    icon: <IoMdCopy />,
  },
  {
    title: '엑셀에 붙여넣기',
    description: '복사된 값을 층에 맞는 엑셀 셀에 붙여넣습니다.',
    icon: <MdGridOn />,
  },
];

const markStyles = {
  added: 'bg-emerald-50 text-emerald-700 font-bold',
  changed: 'bg-amber-100 text-amber-800 font-bold',
  removed: 'bg-rose-50 text-rose-600 line-through',
};

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ],
  );

/* 결과 텍스트를 눈으로 읽기 쉽게 색으로 구분한다. 복사되는 내용은 원문 그대로다. */
const colorizeOutput = (text) =>
  text
    .split('\n')
    .map((line, index) => {
      let label = null;
      let gap = '';
      let data = line;

      if (index === 0) {
        const head = splitLabel(line);
        if (head.label !== null) {
          ({ label, gap, data } = head);
        }
      }

      const labelHtml =
        label === null
          ? ''
          : `<span class="text-slate-400">${escapeHtml(label).replace(
              /(\d+\s*(?:ea|개))/i,
              '<b class="text-amber-300">$1</b>',
            )}</span>${escapeHtml(gap)}`;

      const dataHtml = data
        .split(/([/／])/)
        .map((part) => {
          if (part === '/' || part === '／') {
            return `<b class="text-slate-500">${part}</b>`;
          }
          return escapeHtml(part)
            .replace(
              /(^|\s)([A-Za-z가-힣]+)-/g,
              '$1<b class="text-sky-300">$2</b>-',
            )
            .replace(/\((\d+)\)/g, '<span class="text-orange-300">($1)</span>');
        })
        .join('');

      return labelHtml + dataHtml;
    })
    .join('\n');

function LightLogEditor() {
  const [state, setState] = useState(() => loadLightLogState());
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyTimerRef = useRef(null);

  const { active, floors } = state;
  const floor = floors[active];

  useEffect(() => {
    saveLightLogState(state);
  }, [state]);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const log = useMemo(
    () => buildLightLog(floor.base, floor.on, floor.off),
    [floor],
  );

  const floorSummaries = useMemo(
    () =>
      FLOOR_KEYS.map((key) => {
        const target = floors[key];
        const floorLog = buildLightLog(target.base, target.on, target.off);
        return {
          key,
          total: floorLog ? floorLog.total : null,
          hasData: [target.base, target.on, target.off].some((value) =>
            value.trim(),
          ),
        };
      }),
    [floors],
  );
  const countedFloors = floorSummaries.filter(({ total }) => total !== null);
  const grandTotal = countedFloors.reduce((sum, { total }) => sum + total, 0);

  const diff = log ? log.total - log.before : 0;
  const canCopy = Boolean(log?.output);

  const resetCopyState = () => {
    clearTimeout(copyTimerRef.current);
    setCopied(false);
    setCopyFailed(false);
  };

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target;
    setState((prev) => ({
      ...prev,
      floors: {
        ...prev.floors,
        [prev.active]: { ...prev.floors[prev.active], [field]: value },
      },
    }));
  };

  const handleSelectFloor = (key) => {
    if (key === active) return;
    resetCopyState();
    setState((prev) => ({ ...prev, active: key }));
  };

  const handleAdopt = () => {
    if (!log?.output) return;
    setState((prev) => ({
      ...prev,
      floors: {
        ...prev.floors,
        [prev.active]: { base: log.output, on: '', off: '' },
      },
    }));
  };

  const handleCopy = async () => {
    if (!canCopy) return;

    try {
      await navigator.clipboard.writeText(log.output);
      setCopyFailed(false);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="점등 내역 편집"
        description="기존 내역의 형식을 유지하며 아이체크 점등·소등 결과를 반영합니다."
        icon={<MdOutlineLightbulb size={21} />}
        iconClassName="bg-amber-50 text-amber-600"
        helpTitle="점등 내역 편집 사용방법"
        helpSummary="기존 내역에 점등·소등을 반영해 원래 형태로 되돌립니다."
        helpSteps={howToSteps}
      />

      <WorkflowGuide
        steps={['층 선택·기존 내역 입력', '점등·소등 입력', '결과 확인·복사']}
      />

      <div
        className="mb-5 flex flex-wrap items-center gap-2.5"
        role="tablist"
        aria-label="점검 층 선택"
      >
        {floorSummaries.map(({ key, total, hasData }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => handleSelectFloor(key)}
            className={
              active === key
                ? 'btn bg-amber-500 text-white shadow-md shadow-amber-200/80'
                : 'btn border border-slate-200 bg-white/90 text-slate-600 shadow-sm hover:border-amber-300 hover:bg-amber-50/70 hover:text-amber-700'
            }
          >
            {key}층
            {total !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                  active === key
                    ? 'bg-white/25 text-white'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {total}
              </span>
            )}
            {total === null && hasData && active !== key && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-400"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
        {countedFloors.length > 0 && (
          <span className="status-pill bg-amber-50 text-amber-700">
            합계 {grandTotal}
          </span>
        )}
        <span className="text-xs text-slate-500">
          층별 입력은 이 브라우저에만 7일 동안 저장되어, 탭을 오가거나
          새로고침해도 남아 있습니다.
        </span>
      </div>

      <div className="grid gap-6">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">
              1. 기존 내역 ({active}층)
            </h2>
          </div>
          <div className="panel-body">
            <textarea
              value={floor.base}
              onChange={handleFieldChange('base')}
              className="field-input min-h-28 resize-y font-mono leading-6"
              placeholder={'점등(95ea) : A-15(3),21/B-01-3,15,18'}
              spellCheck="false"
            />
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">
              2. 아이체크 결과 입력 ({active}층)
            </h2>
          </div>
          <div className="panel-body">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="mb-0 block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="status-pill bg-emerald-50 text-emerald-700">
                    점등
                  </span>
                  새로 켜진 것
                </span>
                <textarea
                  value={floor.on}
                  onChange={handleFieldChange('on')}
                  className="field-input min-h-20 resize-y border-l-4 border-l-emerald-300 font-mono leading-6"
                  placeholder={'A-15, D-24(2), M-01'}
                  spellCheck="false"
                />
              </label>
              <label className="mb-0 block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="status-pill bg-rose-50 text-rose-700">
                    소등
                  </span>
                  꺼진 것
                </span>
                <textarea
                  value={floor.off}
                  onChange={handleFieldChange('off')}
                  className="field-input min-h-20 resize-y border-l-4 border-l-rose-300 font-mono leading-6"
                  placeholder={'B-18, E-49(2)'}
                  spellCheck="false"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              쉼표나 줄바꿈으로 구분합니다.{' '}
              <code className="font-mono">A-1,2,3</code>처럼 적으면 A-1 · A-2 ·
              A-3으로 읽습니다. 같은 자리가 여러 개면{' '}
              <code className="font-mono">D-24(2)</code>처럼 개수를 적습니다.
            </p>
          </div>
        </section>

        {log && log.sectors.length > 0 && (
          <section className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="font-bold text-slate-900">3. 구역별 정리</h2>
              <span className="flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  className={`inline-block rounded-lg px-2 py-0.5 ${markStyles.added}`}
                >
                  추가
                </span>
                <span
                  className={`inline-block rounded-lg px-2 py-0.5 ${markStyles.changed}`}
                >
                  변경
                </span>
                <span
                  className={`inline-block rounded-lg px-2 py-0.5 ${markStyles.removed}`}
                >
                  제거
                </span>
                <span className="ml-1.5 text-slate-500">
                  구역 {log.sectors.length}개 · 총 {log.total}
                </span>
              </span>
            </div>
            <div className="panel-body">
              <div className="grid grid-cols-[46px_1fr_64px] gap-3 border-b border-slate-200 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <span>구역</span>
                <span>점등 자리</span>
                <span className="text-right">소계</span>
              </div>
              {log.sectors.map((sector, sectorIndex) => (
                <div
                  key={`${sector.group}-${sectorIndex}`}
                  className="grid grid-cols-[46px_1fr_64px] items-center gap-3 border-b border-slate-100 py-2.5 last:border-b-0"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 font-mono text-sm font-extrabold text-white">
                    {sector.group}
                  </span>
                  <span className="break-all font-mono text-[13px] leading-8">
                    {sector.items.map((item, itemIndex) => (
                      <span
                        key={`${item.num}-${itemIndex}`}
                        className={`mr-1 inline-block rounded-lg px-2 ${
                          markStyles[item.mark] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.num || sector.group}
                        {item.count > 1 ? `(${item.count})` : ''}
                      </span>
                    ))}
                  </span>
                  <span className="text-right font-mono text-[13px] font-bold text-slate-600">
                    {sector.items.reduce(
                      (sum, item) => sum + (item.removed ? 0 : item.count),
                      0,
                    )}
                    개
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel flex min-h-[360px] flex-col overflow-hidden">
          <div className="panel-header">
            <h2 className="font-bold text-slate-900">4. 갱신된 내역</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAdopt}
                disabled={!canCopy}
                className="btn-secondary"
              >
                기존 내역으로 반영
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!canCopy}
                className={
                  copied ? 'btn bg-emerald-600 text-white' : 'btn-primary'
                }
              >
                {copied ? <IoMdCheckmark size={18} /> : <IoMdCopy size={18} />}
                {copied ? '복사 완료' : '전체 복사'}
              </button>
            </div>
          </div>

          <div className="flex-1 p-5">
            {log && log.unread.length > 0 && (
              <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                인식하지 못한 조각이 있어 반영하지 않았습니다 :{' '}
                {log.unread.join(', ')}
              </p>
            )}
            {log && log.missing.length > 0 && (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                소등으로 넣었지만 기존 내역에 없는 자리입니다 :{' '}
                {log.missing.join(', ')}
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

            {canCopy ? (
              <pre
                className="h-full min-h-56 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-7 text-slate-200"
                dangerouslySetInnerHTML={{ __html: colorizeOutput(log.output) }}
              />
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
