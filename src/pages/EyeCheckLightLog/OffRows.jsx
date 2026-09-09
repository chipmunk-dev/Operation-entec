import PropTypes from 'prop-types';
import { MdSearch } from 'react-icons/md';
import {
  EYE_SHEET,
  ON_SHEET,
  OFF_SHEET,
  MOVE_COLUMNS,
} from '../../utils/eyecheckWorkbook';

export default function OffRows({
  hasEye,
  rowCount,
  selected,
  search,
  setSearch,
  allVisibleSelected,
  visibleRows,
  toggleVisibleRows,
  toggleRow,
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="font-bold text-slate-900">
            {hasEye ? '2. ' : '1. '}소등 — 고른 행이 {OFF_SHEET} 시트로 이동
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            고른 행이 소등 처리됩니다. {OFF_SHEET} 시트로 옮기고, 그 자리를{' '}
            {EYE_SHEET}의 점검대상 칸에서도 뺍니다.
          </p>
        </div>
        <span
          className={`status-pill ${
            selected.size
              ? 'bg-rose-50 text-rose-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {selected.size}건 선택
        </span>
      </div>
      <div className="panel-body">
        <label className="relative mb-3 block max-w-md">
          <MdSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Hostname, 위치, 장비, 내용으로 찾기"
            aria-label="점등장비 검색"
            className="field-input py-2 pl-10"
          />
        </label>
        <div className="max-h-[46vh] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-9 px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={visibleRows.length === 0}
                    onChange={toggleVisibleRows}
                    aria-label="보이는 행 전체 선택"
                    className="h-4 w-4 accent-rose-600"
                  />
                </th>
                <th className="w-12 px-2 py-2">행</th>
                {MOVE_COLUMNS.map(([col, label]) => (
                  <th key={col} className="px-3 py-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowCount === 0 && (
                <tr>
                  <td
                    colSpan={MOVE_COLUMNS.length + 2}
                    className="p-7 text-center text-slate-500"
                  >
                    {ON_SHEET} 시트에 값이 있는 행이 없습니다.
                  </td>
                </tr>
              )}
              {rowCount > 0 && visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={MOVE_COLUMNS.length + 2}
                    className="p-7 text-center text-slate-500"
                  >
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
              {visibleRows.map((row) => {
                const isSelected = selected.has(row.r);
                return (
                  <tr
                    key={row.r}
                    onClick={() => toggleRow(row.r)}
                    className={`cursor-pointer border-t border-slate-100 ${
                      isSelected
                        ? 'bg-rose-50 text-rose-900'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.r)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`${row.r}행 선택`}
                        className="h-4 w-4 accent-rose-600"
                      />
                    </td>
                    <td className="px-2 py-2 tabular-nums text-slate-400">
                      {row.r}
                    </td>
                    {MOVE_COLUMNS.map(([col]) => (
                      <td
                        key={col}
                        title={row.vals[col] ?? ''}
                        className={`px-3 py-2 ${
                          col === 'M'
                            ? 'max-w-[280px] truncate text-slate-500'
                            : ''
                        }`}
                      >
                        {row.vals[col] ?? ''}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

OffRows.propTypes = {
  hasEye: PropTypes.bool.isRequired,
  rowCount: PropTypes.number.isRequired,
  selected: PropTypes.object.isRequired,
  search: PropTypes.string.isRequired,
  setSearch: PropTypes.func.isRequired,
  allVisibleSelected: PropTypes.bool.isRequired,
  visibleRows: PropTypes.array.isRequired,
  toggleVisibleRows: PropTypes.func.isRequired,
  toggleRow: PropTypes.func.isRequired,
};
