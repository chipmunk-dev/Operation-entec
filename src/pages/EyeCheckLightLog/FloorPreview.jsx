import PropTypes from 'prop-types';
import { MdRestartAlt, MdOutlineWarningAmber } from 'react-icons/md';
import { ON_SHEET } from '../../utils/eyecheckWorkbook';
import { zoneRange } from './floorView';

export default function FloorPreview({
  hasMove,
  activeFloor,
  activeCalc,
  clearActiveEdits,
  activeWarnings,
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="font-bold text-slate-900">
            {hasMove ? '3. ' : '2. '}기록할 칸 ({activeFloor.floor}층)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {activeFloor.targetCol
              ? `점검대상 칸 ${zoneRange(activeFloor)} (${activeFloor.zones[0].label}~${activeFloor.zones[activeFloor.zones.length - 1].label} 구역)에 구역 글자별로 기록합니다.`
              : '이 파일에서는 점검대상 칸의 위치를 찾지 못했습니다.'}
          </p>
        </div>
        <button
          type="button"
          onClick={clearActiveEdits}
          className="btn-secondary"
        >
          <MdRestartAlt size={17} />이 층 입력 되돌리기
        </button>
      </div>
      <div className="panel-body">
        {activeFloor.targetCol && (
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-28 px-3 py-2">구역</th>
                  <th className="px-3 py-2">현재 값</th>
                  <th className="px-3 py-2">새 값</th>
                </tr>
              </thead>
              <tbody>
                {activeCalc.zones.map((zone) => {
                  const changed = (zone.text || '') !== (zone.next || '');
                  return (
                    <tr
                      key={zone.ref ?? zone.label}
                      className={`border-t border-slate-100 align-top ${
                        changed ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-mono font-bold text-slate-700">
                        {zone.label}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          {zone.ref ?? ''}
                        </span>
                      </td>
                      <td className="break-all px-3 py-2 font-mono text-slate-600">
                        {zone.text || (
                          <span className="text-slate-400">비어 있음</span>
                        )}
                      </td>
                      <td
                        className={`break-all px-3 py-2 font-mono ${
                          changed
                            ? 'font-bold text-amber-900'
                            : 'text-slate-600'
                        }`}
                      >
                        {zone.next || (
                          <span className="font-normal text-slate-400">
                            비어 있음
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="field-label mb-1 mt-4">결과 (위 칸들을 이어 붙인 것)</p>
        <pre
          className={`min-h-12 whitespace-pre-wrap break-all rounded-xl border px-4 py-3 font-mono text-xs leading-6 ${
            activeCalc.output
              ? 'border-emerald-100 bg-emerald-50/60 text-slate-800'
              : 'border-slate-200 bg-slate-50 text-slate-400'
          }`}
        >
          {activeCalc.output || '(비어 있음)'}
        </pre>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activeCalc.log && (
            <span className="status-pill bg-amber-50 text-amber-700">
              총 {activeCalc.log.total}개
            </span>
          )}
          {activeCalc.log && activeCalc.log.before !== activeCalc.log.total && (
            <span className="status-pill bg-slate-100 text-slate-600">
              이전 {activeCalc.log.before}개
            </span>
          )}
          {activeCalc.deviceCount !== null && (
            <span
              className={`status-pill ${
                activeCalc.log &&
                activeCalc.log.total !== activeCalc.deviceCount
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {ON_SHEET} {activeCalc.deviceCount}건
            </span>
          )}
        </div>

        {activeWarnings.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <MdOutlineWarningAmber size={17} />
              확인 필요
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-800">
              {activeWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

FloorPreview.propTypes = {
  hasMove: PropTypes.bool.isRequired,
  activeFloor: PropTypes.object.isRequired,
  activeCalc: PropTypes.object.isRequired,
  clearActiveEdits: PropTypes.func.isRequired,
  activeWarnings: PropTypes.array.isRequired,
};
