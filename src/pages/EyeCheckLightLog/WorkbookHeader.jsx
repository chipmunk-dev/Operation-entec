import PropTypes from 'prop-types';
import { EYE_SHEET, ON_SHEET, OFF_SHEET } from '../../utils/eyecheckWorkbook';

export default function WorkbookHeader({
  doc,
  floors,
  date,
  setDate,
  settings,
  updateSettings,
  resetDoc,
  setNotice,
}) {
  return (
    <section className="panel px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {doc.fileName}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {[
              doc.eye
                ? `${EYE_SHEET} ${floors.map((floor) => `${floor.floor}층`).join('·')}`
                : `${EYE_SHEET} 없음`,
              doc.move
                ? `${ON_SHEET} ${doc.move.rows.length}건 · ${OFF_SHEET} 마지막 ${doc.move.offLast}행`
                : `${ON_SHEET}/${OFF_SHEET} 없음`,
            ].join(' — ')}
          </p>
        </div>
        <label
          className="flex items-center gap-2 text-xs font-semibold text-slate-700"
          title="새로 추가되는 점등 행의 Check Date와 소등장비로 옮길 때의 날짜에 쓰입니다"
        >
          <span className="shrink-0">점검 날짜</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="field-input w-auto py-2"
          />
        </label>
        <label
          className="flex items-center gap-2 text-xs font-semibold text-slate-700"
          title="점등장비 시트에 추가되는 행의 Shift·발견자 칸에 들어갑니다"
        >
          <span className="shrink-0">아이체크 담당</span>
          <input
            type="text"
            value={settings.shift}
            onChange={(event) => updateSettings({ shift: event.target.value })}
            placeholder="조"
            maxLength={6}
            aria-label="조"
            className="field-input w-16 py-2"
          />
          <input
            type="text"
            value={settings.finder}
            onChange={(event) => updateSettings({ finder: event.target.value })}
            placeholder="이름"
            maxLength={10}
            aria-label="발견자 이름"
            className="field-input w-24 py-2"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            resetDoc();
            setNotice(null);
          }}
          className="btn-secondary"
        >
          다른 파일 열기
        </button>
      </div>
    </section>
  );
}

WorkbookHeader.propTypes = {
  doc: PropTypes.object.isRequired,
  floors: PropTypes.array.isRequired,
  date: PropTypes.string.isRequired,
  setDate: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  updateSettings: PropTypes.func.isRequired,
  resetDoc: PropTypes.func.isRequired,
  setNotice: PropTypes.func.isRequired,
};
