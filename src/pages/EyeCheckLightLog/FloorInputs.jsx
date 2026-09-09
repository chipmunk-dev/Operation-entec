import PropTypes from 'prop-types';
import { zoneRange } from './floorView';

export default function FloorInputs({
  grandTotal,
  calcs,
  settings,
  updateSettings,
  activeFloor,
  activeInput,
  setActiveInput,
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <h2 className="font-bold text-slate-900">1. 층별 점등내역</h2>
        <span className="status-pill bg-amber-50 text-amber-700">
          합계 {grandTotal}
        </span>
      </div>
      <div className="panel-body">
        <div
          className="mb-4 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="점검 층 선택"
        >
          {calcs.map(({ floor, calc }) => {
            const isActive = floor.floor === settings.active;
            return (
              <button
                key={floor.floor}
                type="button"
                role="tab"
                aria-selected={isActive}
                title={calc.dirty ? '저장 시 기록됩니다' : '변경 없음'}
                onClick={() => updateSettings({ active: floor.floor })}
                className={
                  isActive
                    ? 'btn bg-amber-500 text-white shadow-md shadow-amber-200/80'
                    : 'btn border border-slate-200 bg-white/90 text-slate-600 shadow-sm hover:border-amber-300 hover:bg-amber-50/70 hover:text-amber-700'
                }
              >
                {floor.floor}층
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {calc.log ? calc.log.total : '–'}
                </span>
                {calc.dirty && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-orange-500"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4">
          <label className="mb-0 block">
            <span className="field-label mb-1">
              기존 내역 ({activeFloor.floor}층)
            </span>
            <span
              className={`mb-1.5 block text-xs ${
                activeFloor.targetCol
                  ? 'text-slate-500'
                  : 'font-semibold text-amber-800'
              }`}
            >
              {activeFloor.targetCol
                ? `점검대상 칸 ${zoneRange(activeFloor)}의 구역별 내용을 이어 붙였습니다. 고쳐도 됩니다.`
                : '이 파일에서 점검대상 칸의 위치를 찾지 못했습니다.'}
            </span>
            <textarea
              value={activeInput.base}
              onChange={(event) => setActiveInput('base', event.target.value)}
              className="field-input min-h-24 resize-y font-mono leading-6"
              placeholder="A-15(3),21/B-01-3,15,18"
              spellCheck="false"
            />
          </label>
          <label className="mb-0 block">
            <span className="field-label mb-1 flex items-center gap-2">
              <span className="status-pill bg-emerald-50 text-emerald-700">
                점등
              </span>
              새로 켜진 자리
            </span>
            <span className="mb-1.5 block text-xs text-slate-500">
              쉼표나 줄바꿈으로 구분합니다.{' '}
              <code className="font-mono">A-1,2,3</code>은 A-1·A-2·A-3으로 읽고,
              같은 자리가 여러 개면 <code className="font-mono">D-24(2)</code>
              처럼 적습니다. 소등은 아래 목록에서 고릅니다.
            </span>
            <textarea
              value={activeInput.on}
              onChange={(event) => setActiveInput('on', event.target.value)}
              className="field-input min-h-20 resize-y border-l-4 border-l-emerald-300 font-mono leading-6"
              placeholder="A-15, D-24(2)"
              spellCheck="false"
            />
          </label>
        </div>
      </div>
    </section>
  );
}

FloorInputs.propTypes = {
  grandTotal: PropTypes.number.isRequired,
  calcs: PropTypes.array.isRequired,
  settings: PropTypes.object.isRequired,
  updateSettings: PropTypes.func.isRequired,
  activeFloor: PropTypes.object.isRequired,
  activeInput: PropTypes.object.isRequired,
  setActiveInput: PropTypes.func.isRequired,
};
