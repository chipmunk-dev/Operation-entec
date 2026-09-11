import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  formatChangeReport,
  groupChangeReports,
  reportMissingFields,
} from '../../utils/eyecheckReport';
import {
  loadGemsReporterName,
  saveGemsReporterName,
} from '../../utils/gemsReporterStorage';

export default function ChangeReport({
  changes,
  currentRows,
  hasPending,
  updateDeviceDetail,
}) {
  const [name, setName] = useState(loadGemsReporterName);
  const [position, setPosition] = useState('사원');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [excluded, setExcluded] = useState(() => new Set());
  const [extra, setExtra] = useState(() => new Set());
  const [overrides, setOverrides] = useState({});
  const [copyStatus, setCopyStatus] = useState('');
  const [showExisting, setShowExisting] = useState(false);
  const changedRows = new Set(
    changes.filter((row) => row.kind === 'on').map((row) => row.r)
  );
  const existingCounts = new Map();
  const existing = currentRows
    .filter((row) => row.r && !changedRows.has(row.r))
    .map((row) => {
      const key = JSON.stringify(
        ['C', 'D', 'I', 'L'].map((col) => String(row.vals[col] ?? '').trim())
      );
      const n = existingCounts.get(key) ?? 0;
      existingCounts.set(key, n + 1);
      return { ...row, kind: 'existing', id: `existing:${key}:${n}` };
    });
  const validIds = JSON.stringify(
    [...changes, ...existing].map((row) => row.id)
  );
  useEffect(() => {
    const valid = new Set(JSON.parse(validIds));
    const prune = (previous) => {
      const next = new Set([...previous].filter((id) => valid.has(id)));
      return next.size === previous.size ? previous : next;
    };
    setExcluded(prune);
    setExtra(prune);
    setOverrides((previous) => {
      const entries = Object.entries(previous).filter(([id]) => valid.has(id));
      return entries.length === Object.keys(previous).length
        ? previous
        : Object.fromEntries(entries);
    });
    setCopyStatus('');
  }, [validIds]);
  const rows = [
    ...changes,
    ...existing.filter((row) => showExisting || extra.has(row.id)),
  ].map((row) => ({
    ...row,
    vals: { ...row.vals, ...overrides[row.id] },
  }));
  const isSelected = (row) =>
    row.kind === 'existing' ? extra.has(row.id) : !excluded.has(row.id);
  const toggle = (row) => {
    const setter = row.kind === 'existing' ? setExtra : setExcluded;
    setter((previous) => {
      const next = new Set(previous);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
    setCopyStatus('');
  };
  const visible = rows.filter(
    (row) =>
      (kind === 'all' || row.kind === kind) &&
      ['C', 'D', 'I', 'L'].some((col) =>
        String(row.vals[col] ?? '')
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
  );
  const selectedRows = rows.filter(isSelected);
  const missing = selectedRows.filter((row) => reportMissingFields(row).length);
  const groups = groupChangeReports(selectedRows);
  const copy = async (group) => {
    try {
      await navigator.clipboard.writeText(
        formatChangeReport(group.rows, name, position)
      );
      setCopyStatus(`${group.admin} 문구 복사 완료`);
    } catch {
      setCopyStatus(
        '복사하지 못했습니다. 미리보기 문구를 직접 선택해 복사해 주세요.'
      );
    }
  };
  return (
    <section className="grid gap-4">
      <div className="panel panel-body">
        <h2 className="font-bold text-slate-900">원본 대비 변경내역 보고</h2>
        <p className="mt-2 text-sm text-slate-600">
          최초에 연 파일과 현재 장비 목록을 비교합니다. 신규 점등·소등은 자동
          선택되며, 저장 후에도 변경내역이 유지됩니다.
        </p>
        <p className="mt-2 text-xs text-amber-800">
          {hasPending
            ? '미저장 변경사항이 보고에 포함되어 있습니다.'
            : '현재 파일 기준입니다. 내려받은 파일은 사용자가 별도로 보관해야 합니다.'}{' '}
          층별 점검대상 문구만 수정한 경우에는 장비 보고가 생성되지 않습니다.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold">
            보고자 이름
            <input
              aria-label="보고자 이름"
              className="field-input mt-1"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                saveGemsReporterName(event.target.value);
                setCopyStatus('');
              }}
            />
          </label>
          <label className="text-xs font-semibold">
            직급
            <select
              aria-label="보고자 직급"
              className="field-select mt-1"
              value={position}
              onChange={(event) => {
                setPosition(event.target.value);
                setCopyStatus('');
              }}
            >
              {['사원', '선임', '책임'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <span className="status-pill bg-blue-50 text-blue-700">
            신규 {changes.filter((row) => row.kind === 'on').length} · 소등{' '}
            {changes.filter((row) => row.kind === 'off').length} · 보고 선택{' '}
            {selectedRows.length}
          </span>
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="panel panel-body min-w-0">
          <h3 className="font-bold">보고 대상 확인</h3>
          <div className="my-3 flex flex-wrap gap-2">
            <input
              aria-label="보고 장비 검색"
              placeholder="호스트, 위치, 상태, 담당자 검색"
              className="field-input min-w-0 flex-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              aria-label="보고 유형"
              className="field-select w-auto"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="all">전체</option>
              <option value="on">신규 점등</option>
              <option value="off">소등</option>
              <option value="existing">기존 재보고</option>
            </select>
          </div>
          <label className="mb-3 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showExisting}
              onChange={(event) => setShowExisting(event.target.checked)}
            />
            변경 없는 기존 장비도 표시 (재보고용)
          </label>
          <button
            type="button"
            className="btn-secondary mb-3"
            disabled={!visible.length}
            onClick={() => {
              const all = visible.every(isSelected);
              setExcluded((previous) => {
                const next = new Set(previous);
                visible
                  .filter((row) => row.kind !== 'existing')
                  .forEach((row) =>
                    all ? next.add(row.id) : next.delete(row.id)
                  );
                return next;
              });
              setExtra((previous) => {
                const next = new Set(previous);
                visible
                  .filter((row) => row.kind === 'existing')
                  .forEach((row) =>
                    all ? next.delete(row.id) : next.add(row.id)
                  );
                return next;
              });
              setCopyStatus('');
            }}
          >
            {visible.length > 0 && visible.every(isSelected)
              ? '검색 결과 선택 해제'
              : '검색 결과 전체 선택'}
          </button>
          <div className="max-h-[60vh] space-y-3 overflow-auto">
            {!visible.length && (
              <p className="p-6 text-sm text-slate-500">
                {changes.length
                  ? '검색 결과가 없습니다.'
                  : '변경내역이 없습니다. 내역 편집에서 신규 점등을 입력하거나 소등 장비를 선택하세요.'}
              </p>
            )}
            {visible.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    aria-label={`${row.vals.D} ${row.kind} 보고 선택`}
                    checked={isSelected(row)}
                    onChange={() => toggle(row)}
                  />
                  <span
                    className={
                      row.kind === 'off' ? 'text-rose-700' : 'text-blue-700'
                    }
                  >
                    {row.kind === 'off'
                      ? '소등'
                      : row.kind === 'on'
                        ? '신규 점등'
                        : '기존 재보고'}
                  </span>
                  {row.vals.D}
                </label>
                <p className="my-2 text-xs text-slate-600">
                  {row.vals.I || '점등상태 없음'}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ['C', '호스트명'],
                    ['L', '서버 담당자'],
                  ].map(([col, label]) => (
                    <label key={col} className="text-xs">
                      {label}
                      <input
                        aria-label={`${row.vals.D} ${label}`}
                        className="field-input mt-1"
                        value={row.vals[col] ?? ''}
                        onChange={(event) => {
                          if (row.detailKey)
                            updateDeviceDetail(
                              row.detailKey,
                              col,
                              event.target.value
                            );
                          else
                            setOverrides((previous) => ({
                              ...previous,
                              [row.id]: {
                                ...previous[row.id],
                                [col]: event.target.value,
                              },
                            }));
                          setCopyStatus('');
                        }}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {row.detailKey
                    ? '입력한 장비 정보는 엑셀 저장에도 반영됩니다.'
                    : '이곳의 정보 보완은 보고 문구에만 반영됩니다.'}
                </p>
                {reportMissingFields(row).length > 0 && (
                  <p className="mt-2 text-xs text-amber-800">
                    확인 필요: {reportMissingFields(row).join(', ')}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
        <div className="panel panel-body min-w-0 xl:sticky xl:top-4">
          <h3 className="font-bold">담당자별 보고 미리보기</h3>
          {missing.length > 0 && (
            <p role="status" className="mt-3 text-sm text-amber-800">
              선택한 {missing.length}건의 필수 정보가 없습니다. 누락을 방지하기
              위해 보완하거나 보고 선택을 해제한 후 복사해 주세요.
            </p>
          )}
          {!name.trim() && (
            <p className="mt-3 text-sm text-amber-800">
              보고자 이름을 입력해 주세요.
            </p>
          )}
          {!groups.length && (
            <p className="py-6 text-sm text-slate-500">
              보고 대상을 선택하고 필수 정보를 확인해 주세요.
            </p>
          )}
          {groups.map((group) => (
            <div
              key={group.admin}
              className="mt-4 rounded-xl border border-slate-200 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold">
                  {group.admin} · {group.rows.length}건
                </h4>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={!name.trim() || missing.length > 0}
                  onClick={() => copy(group)}
                >
                  문구 복사
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6">
                {formatChangeReport(group.rows, name || '(이름)', position)}
              </pre>
            </div>
          ))}
          {copyStatus && (
            <p role="status" className="mt-3 text-sm text-blue-700">
              {copyStatus}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

ChangeReport.propTypes = {
  changes: PropTypes.array.isRequired,
  currentRows: PropTypes.array.isRequired,
  hasPending: PropTypes.bool.isRequired,
  updateDeviceDetail: PropTypes.func.isRequired,
};
