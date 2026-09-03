import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FaFileExcel } from 'react-icons/fa6';
import {
  MdClose,
  MdEditNote,
  MdOutlineLightbulb,
  MdOutlineViewList,
  MdOutlineWarningAmber,
  MdRestartAlt,
  MdSave,
  MdSearch,
  MdUploadFile,
} from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import {
  EYE_SHEET,
  LIGHT_TYPES,
  MOVE_COLUMNS,
  OFF_SHEET,
  ON_SHEET,
  SEARCH_COLS,
  XLSX_MIME,
  applyEyecheckChanges,
  backupName,
  calculateFloor,
  checkWorkbookConsistency,
  collectPendingWork,
  contentText,
  lightValue,
  openEyecheckWorkbook,
  outputName,
  snapshotFloors,
} from '../../utils/eyecheckWorkbook';
import { isoToSerial } from '../../utils/xlsxSheetXml';
import {
  loadEyecheckSettings,
  mergeLastSaved,
  saveEyecheckSettings,
} from '../../utils/eyecheckStorage';

const howToSteps = [
  {
    title: '파일 열기',
    description:
      'Eye Check xlsx를 끌어다 놓거나 클릭해서 엽니다. 크롬에서 클릭해 열면 원본에 바로 덮어쓸 수 있습니다.',
    icon: <MdUploadFile />,
  },
  {
    title: '층별 점등 입력',
    description:
      '층 탭을 고르고 새로 켜진 자리를 적습니다. 기존 내역은 점검대상 칸에서 자동으로 가져옵니다.',
    icon: <MdEditNote />,
  },
  {
    title: '소등 고르기',
    description:
      '점등장비 목록에서 꺼진 장비 행을 체크하면 소등장비 시트로 옮기고 점검대상 칸에서도 뺍니다.',
    icon: <MdOutlineViewList />,
  },
  {
    title: '기록 내용 확인',
    description: '기록할 칸, 추가될 행, 경고를 확인합니다. 이상 있을 시 알려주세요!',
    icon: <MdOutlineWarningAmber />,
  },
  {
    title: '저장',
    description: '원본 파일에 덮어쓰거나(백업 자동) 새 파일로 내려받습니다.',
    icon: <MdSave />,
  },
];

const noticeStyles = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
};

const canOverwrite =
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';

const pad2 = (value) => String(value).padStart(2, '0');

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/** 원본 파일에 덮어쓴다. 권한이 없으면 요청하고, 거부되면 그대로 알린다. */
const overwriteFile = async (handle, blob) => {
  let writable;
  try {
    writable = await handle.createWritable();
  } catch (error) {
    throw new Error(
      `원본 파일을 열 수 없습니다. 엑셀에서 이 파일을 닫고 다시 시도하세요. (${error?.name || error})`,
    );
  }
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // 이미 닫힘
    }
    throw new Error(
      `파일을 쓰는 중 실패했습니다. 원본은 그대로입니다. (${error?.name || error})`,
    );
  }
};

/** 덮어쓰기 전 원본 그대로의 사본을 만든다. */
const backupBlob = async (handle) => {
  const file = await handle.getFile();
  return new Blob([await file.arrayBuffer()], { type: XLSX_MIME });
};

const ensureWritePermission = async (handle) => {
  const options = { mode: 'readwrite' };
  let permission = (await handle.queryPermission?.(options)) ?? 'granted';
  if (permission !== 'granted') {
    permission = (await handle.requestPermission?.(options)) ?? 'denied';
  }
  if (permission !== 'granted') {
    throw new Error(
      '원본 파일에 쓸 권한을 받지 못했습니다. 다시 시도하거나 덮어쓰기를 끄고 새 파일로 내려받으세요.',
    );
  }
};

function EyeCheckLightLog() {
  const [settings, setSettings] = useState(() => loadEyecheckSettings());
  const [doc, setDoc] = useState(null);
  const [fileHandle, setFileHandle] = useState(null);
  const [floorInputs, setFloorInputs] = useState({});
  const [picks, setPicks] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [date, setDate] = useState(() => todayISO());
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(null);
  const [alertText, setAlertText] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    saveEyecheckSettings(settings);
  }, [settings]);

  const updateSettings = (patch) =>
    setSettings((previous) => ({ ...previous, ...patch }));

  const resetDoc = () => {
    setDoc(null);
    setFileHandle(null);
    setSelected(new Set());
    setFloorInputs({});
    setPicks({});
  };

  const openFile = useCallback(async (file, handle = null) => {
    if (!file) return;
    setNotice(null);
    setAlertText('');
    setSelected(new Set());
    try {
      const nextDoc = openEyecheckWorkbook(
        new Uint8Array(await file.arrayBuffer()),
        file.name,
      );
      const inputs = {};
      for (const floor of nextDoc.eye?.floors ?? []) {
        inputs[floor.floor] = { base: floor.zoneText, on: '' };
      }
      setDoc(nextDoc);
      setFileHandle(handle);
      setFloorInputs(inputs);
      setPicks({});
      setSearch('');
      setSettings((previous) => {
        const floors = nextDoc.eye?.floors ?? [];
        const active = floors.some((floor) => floor.floor === previous.active)
          ? previous.active
          : (floors[0]?.floor ?? previous.active);
        return { ...previous, active };
      });

      const check = checkWorkbookConsistency(nextDoc, settingsRef.current.lastSaved);
      if (check) {
        setNotice({
          kind: 'warn',
          text: `${check.headline} ${check.diffs.join(' / ')} ${check.advice}`,
        });
        setAlertText(`${check.headline}\n\n· ${check.diffs.join('\n· ')}\n\n${check.advice}`);
      }
    } catch (error) {
      setDoc(null);
      setFileHandle(null);
      setNotice({ kind: 'error', text: error.message || String(error) });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  /** 크롬 파일 선택창으로 열면 원본 파일에 바로 쓸 수 있는 핸들을 얻는다. */
  const pickFile = async () => {
    if (!canOverwrite) {
      fileInputRef.current?.click();
      return;
    }
    let handle;
    try {
      [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Excel 통합 문서', accept: { [XLSX_MIME]: ['.xlsx'] } }],
      });
    } catch (error) {
      if (error?.name === 'AbortError') return; // 사용자가 취소함
      fileInputRef.current?.click(); // 파일 선택창을 못 쓰면 기본 입력으로
      return;
    }
    await openFile(await handle.getFile(), handle);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragOver(false);
    const item = event.dataTransfer.items?.[0];
    let handle = null;
    if (item?.getAsFileSystemHandle) {
      try {
        const candidate = await item.getAsFileSystemHandle();
        if (candidate?.kind === 'file') handle = candidate;
      } catch {
        // 핸들 없이 진행
      }
    }
    await openFile(handle ? await handle.getFile() : event.dataTransfer.files[0], handle);
  };

  const floors = useMemo(() => doc?.eye?.floors ?? [], [doc]);
  // 입력칸은 즉시 반영하고, 그에 따른 계산·표 갱신은 한 박자 뒤에 한다. 빠르게 칠 때 커서가 튀지 않게.
  const deferredInputs = useDeferredValue(floorInputs);
  const deferredSearch = useDeferredValue(search);
  const activeFloor = floors.find((floor) => floor.floor === settings.active) ?? null;
  const dateSerial = useMemo(() => {
    try {
      return isoToSerial(date);
    } catch {
      return null;
    }
  }, [date]);
  const content = contentText(date);

  const calcs = useMemo(
    () =>
      floors.map((floor) => ({
        floor,
        calc: calculateFloor(floor, {
          base: deferredInputs[floor.floor]?.base ?? '',
          on: deferredInputs[floor.floor]?.on ?? '',
          moveRows: doc?.move?.rows ?? null,
          selectedRows: selected,
          dateSerial,
          content,
          shift: settings.shift,
          finder: settings.finder,
          lightType: settings.lightType,
          lightOther: settings.lightOther,
          picks,
          addDevices: settings.addDevices,
        }),
      })),
    [
      floors,
      deferredInputs,
      doc,
      selected,
      dateSerial,
      content,
      settings.shift,
      settings.finder,
      settings.lightType,
      settings.lightOther,
      settings.addDevices,
      picks,
    ],
  );
  const calcByFloor = Object.fromEntries(calcs.map(({ floor, calc }) => [floor.floor, calc]));
  const activeCalc = activeFloor ? calcByFloor[activeFloor.floor] : null;
  const activeInput = activeFloor
    ? (floorInputs[activeFloor.floor] ?? { base: '', on: '' })
    : null;
  const grandTotal = calcs.reduce((sum, { calc }) => sum + (calc.log?.total ?? 0), 0);

  const pending = doc
    ? collectPendingWork(doc, calcs, selected.size, settings.addDevices)
    : { floors: [], moveCount: 0, devices: [] };
  const hasPending = Boolean(
    pending.floors.length || pending.moveCount || pending.devices.length,
  );

  const visibleRows = useMemo(() => {
    const rows = doc?.move?.rows ?? [];
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      SEARCH_COLS.some((col) => (row.vals[col] || '').toLowerCase().includes(query)),
    );
  }, [doc, deferredSearch]);
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.r));

  const overwrite = Boolean(fileHandle) && settings.overwrite;
  const backup = overwrite && settings.backup;
  const saveLabel = overwrite ? '원본 파일에 덮어쓰기' : '새 파일로 내려받기';

  const setActiveInput = (field, value) => {
    if (!activeFloor) return;
    setFloorInputs((previous) => ({
      ...previous,
      [activeFloor.floor]: { ...(previous[activeFloor.floor] ?? { base: '', on: '' }), [field]: value },
    }));
  };

  const clearActiveEdits = () => {
    if (!activeFloor) return;
    setFloorInputs((previous) => ({
      ...previous,
      [activeFloor.floor]: { base: activeFloor.zoneText, on: '' },
    }));
  };

  const toggleRow = (r) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const toggleVisibleRows = () => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) visibleRows.forEach((row) => next.delete(row.r));
      else visibleRows.forEach((row) => next.add(row.r));
      return next;
    });
  };

  const setPickType = (key, type) => {
    setPicks((previous) => ({
      ...previous,
      [key]: {
        t: type,
        o: previous[key]?.o ?? (settings.lightType === '기타' ? settings.lightOther : ''),
      },
    }));
  };

  const setPickOther = (key, other) => {
    setPicks((previous) => ({ ...previous, [key]: { t: '기타', o: other } }));
  };

  const handleSave = async () => {
    if (!doc || !hasPending || saving) return;
    setNotice(null);
    setSaving(true);
    try {
      // 권한 요청은 버튼을 누른 직후에 해야 한다. 무거운 작업을 먼저 하면 사용자 동작으로 인정되지 않는다.
      if (overwrite) await ensureWritePermission(fileHandle);
      if (dateSerial === null) throw new Error('점검 날짜가 올바르지 않습니다.');

      const result = applyEyecheckChanges(doc, {
        floors: pending.floors,
        calcByFloor,
        selectedRows: [...selected],
        dateSerial,
        devices: pending.devices,
      });
      const blob = new Blob([result.bytes], { type: XLSX_MIME });

      let where;
      if (overwrite) {
        // 백업을 먼저 내려받는다. 덮어쓰기가 실패해도 백업은 남는다.
        if (backup) downloadBlob(await backupBlob(fileHandle), backupName(doc.fileName, date));
        await overwriteFile(fileHandle, blob);
        where = `${doc.fileName}에 덮어썼습니다${backup ? ' (백업도 내려받음)' : ''}`;
      } else {
        const name = outputName(doc.fileName, date);
        downloadBlob(blob, name);
        where = `${name} 내려받음`;
      }

      if (floors.length || result.finalCounts) {
        // 기록한 층뿐 아니라 모든 층의 현재 내용을 남겨야 다음 열기 때 층마다 정확히 비교된다.
        const lastSaved = mergeLastSaved(
          settingsRef.current.lastSaved,
          snapshotFloors(floors, result.saved),
          result.finalCounts,
        );
        settingsRef.current = { ...settingsRef.current, lastSaved };
        updateSettings({ lastSaved });
      }
      setPicks({});
      setFloorInputs({});

      if (overwrite) {
        // 방금 쓴 내용을 다시 읽어 이어서 작업할 수 있게 한다. (openFile이 알림을 지우므로 먼저 실행)
        await openFile(await fileHandle.getFile(), fileHandle);
      } else {
        resetDoc();
      }
      setNotice({
        kind: 'done',
        text: `${where} — ${result.done.join(' / ')}. 층별 개수는 파일을 열 때 다시 계산됩니다.`,
      });
    } catch (error) {
      setNotice({ kind: 'error', text: error.message || String(error) });
    } finally {
      setSaving(false);
    }
  };

  const zoneRange = (floor) =>
    floor.targetCol && floor.zones.length
      ? `${floor.targetCol}${floor.zones[0].row}~${floor.targetCol}${floor.zones[floor.zones.length - 1].row}`
      : null;

  const activeWarnings = [];
  if (activeFloor && activeCalc) {
    const { log } = activeCalc;
    const countsDiffer =
      log && activeCalc.deviceCount !== null && log.total !== activeCalc.deviceCount;
    if (countsDiffer) {
      activeWarnings.push(
        `점검대상 칸 ${log.total}개와 점등장비 시트 ${activeCalc.deviceCount}건이 다릅니다. 자리 하나에 장비 한 줄이 맞는지 확인해 주세요.`,
      );
    }
    if (!log && activeCalc.off) {
      activeWarnings.push(
        '이 층의 점검대상 칸이 비어 있어 소등을 반영할 곳이 없습니다. 소등장비 시트로 옮기기만 합니다.',
      );
    }
    if (log?.unread.length) activeWarnings.push(`읽지 못한 조각: ${log.unread.join(', ')}`);
    if (log?.missing.length) {
      activeWarnings.push(`기존 내역에 없는 자리를 소등: ${log.missing.join(', ')}`);
    }
    if (activeCalc.unmatched.length) {
      activeWarnings.push(
        `${activeFloor.floor}층에 없는 구역 글자: ${activeCalc.unmatched.join(', ')} (구역별 칸에는 쓰지 않음)`,
      );
    }
  }

  // 4번 표는 현재 층만이 아니라 모든 층의 점등 입력을 층별로 모아 보여준다.
  const floorsWithItems = calcs.filter(({ calc }) => calc.items.length > 0);
  const totalDeviceRows = calcs.reduce((sum, { calc }) => sum + calc.devices.length, 0);

  const summaryParts = [];
  if (pending.floors.length) {
    summaryParts.push(`점등내역 기록: ${pending.floors.map((floor) => `${floor.floor}층`).join(', ')}`);
  }
  if (pending.devices.length) summaryParts.push(`${ON_SHEET} 추가: ${pending.devices.length}행`);
  if (pending.moveCount) summaryParts.push(`${OFF_SHEET}로 이동: ${pending.moveCount}건`);

  return (
    <div className="page-shell">
      <PageHeader
        title="아이체크 점등·소등 처리"
        description="Eye Check 파일을 열어 층별 점등내역을 점검대상 칸에 기록하고, 소등된 장비를 소등장비 시트로 옮깁니다."
        icon={<FaFileExcel size={19} />}
        iconClassName="bg-amber-50 text-amber-700"
        helpTitle="아이체크 점등·소등 처리 사용방법"
        helpSummary="엑셀 파일을 직접 고쳐 원본에 덮어쓰거나 새 파일로 내려받습니다."
        helpSteps={howToSteps}
      />

      {alertText && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="eyecheck-alert-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setAlertText('');
          }}
        >
          <div className="panel w-full max-w-md border-t-4 border-t-amber-400 p-6">
            <p id="eyecheck-alert-title" className="text-lg font-extrabold text-amber-900">
              파일이 최신인지 확인해 주세요
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {alertText}
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setAlertText('')}
              className="btn-primary mt-5 w-full"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${noticeStyles[notice.kind]}`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            aria-label="알림 닫기"
            onClick={() => setNotice(null)}
            className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100"
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        hidden
        onChange={(event) => openFile(event.target.files[0])}
      />

      {!doc ? (
        <div
          role="button"
          tabIndex={0}
          onClick={pickFile}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              pickFile();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`grid min-h-64 cursor-pointer place-items-center rounded-3xl border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? 'border-amber-400 bg-amber-50/80'
              : 'border-slate-300 bg-white/70 hover:border-amber-300 hover:bg-amber-50/40'
          }`}
        >
          <div>
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-3xl text-amber-600">
              <MdUploadFile />
            </span>
            <p className="text-base font-bold text-slate-800">
              Eye Check xlsx 파일을 여기에 놓거나 클릭해서 선택
            </p>
            <p className="mt-2 text-xs text-slate-500">
              파일은 이 브라우저 안에서만 처리되며 서버로 보내지 않습니다.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {canOverwrite
                ? '클릭해서 열면 원본 파일에 바로 덮어쓸 수 있습니다.'
                : '이 브라우저는 원본 덮어쓰기를 지원하지 않아 새 파일로 내려받습니다. (크롬 권장)'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="panel px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{doc.fileName}</p>
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

          {doc.eye && activeFloor && activeCalc && activeInput && (
            <section className="panel overflow-hidden">
              <div className="panel-header">
                <h2 className="font-bold text-slate-900">1. 층별 점등내역</h2>
                <span className="status-pill bg-amber-50 text-amber-700">합계 {grandTotal}</span>
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
                            isActive ? 'bg-white/25 text-white' : 'bg-amber-50 text-amber-600'
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
                    <span className="field-label mb-1">기존 내역 ({activeFloor.floor}층)</span>
                    <span
                      className={`mb-1.5 block text-xs ${
                        activeFloor.targetCol ? 'text-slate-500' : 'font-semibold text-amber-800'
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
                      <span className="status-pill bg-emerald-50 text-emerald-700">점등</span>
                      새로 켜진 자리
                    </span>
                    <span className="mb-1.5 block text-xs text-slate-500">
                      쉼표나 줄바꿈으로 구분합니다. <code className="font-mono">A-1,2,3</code>은
                      A-1·A-2·A-3으로 읽고, 같은 자리가 여러 개면{' '}
                      <code className="font-mono">D-24(2)</code>처럼 적습니다. 소등은 아래
                      목록에서 고릅니다.
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
          )}

          {doc.move && (
            <section className="panel overflow-hidden">
              <div className="panel-header">
                <div>
                  <h2 className="font-bold text-slate-900">
                    {doc.eye ? '2. ' : '1. '}소등 — 고른 행이 {OFF_SHEET} 시트로 이동
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    고른 행이 소등 처리됩니다. {OFF_SHEET} 시트로 옮기고, 그 자리를 {EYE_SHEET}의
                    점검대상 칸에서도 뺍니다.
                  </p>
                </div>
                <span
                  className={`status-pill ${
                    selected.size ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
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
                      {doc.move.rows.length === 0 && (
                        <tr>
                          <td colSpan={MOVE_COLUMNS.length + 2} className="p-7 text-center text-slate-500">
                            {ON_SHEET} 시트에 값이 있는 행이 없습니다.
                          </td>
                        </tr>
                      )}
                      {doc.move.rows.length > 0 && visibleRows.length === 0 && (
                        <tr>
                          <td colSpan={MOVE_COLUMNS.length + 2} className="p-7 text-center text-slate-500">
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
                              isSelected ? 'bg-rose-50 text-rose-900' : 'hover:bg-slate-50'
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
                            <td className="px-2 py-2 tabular-nums text-slate-400">{row.r}</td>
                            {MOVE_COLUMNS.map(([col]) => (
                              <td
                                key={col}
                                title={row.vals[col] ?? ''}
                                className={`px-3 py-2 ${
                                  col === 'M' ? 'max-w-[280px] truncate text-slate-500' : ''
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
          )}

          {doc.eye && activeFloor && activeCalc && (
            <section className="panel overflow-hidden">
              <div className="panel-header">
                <div>
                  <h2 className="font-bold text-slate-900">
                    {doc.move ? '3. ' : '2. '}기록할 칸 ({activeFloor.floor}층)
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeFloor.targetCol
                      ? `점검대상 칸 ${zoneRange(activeFloor)} (${activeFloor.zones[0].label}~${activeFloor.zones[activeFloor.zones.length - 1].label} 구역)에 구역 글자별로 기록합니다.`
                      : '이 파일에서는 점검대상 칸의 위치를 찾지 못했습니다.'}
                  </p>
                </div>
                <button type="button" onClick={clearActiveEdits} className="btn-secondary">
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
                                <span className="text-[10px] font-normal text-slate-400">{zone.ref ?? ''}</span>
                              </td>
                              <td className="break-all px-3 py-2 font-mono text-slate-600">
                                {zone.text || <span className="text-slate-400">비어 있음</span>}
                              </td>
                              <td
                                className={`break-all px-3 py-2 font-mono ${
                                  changed ? 'font-bold text-amber-900' : 'text-slate-600'
                                }`}
                              >
                                {zone.next || <span className="font-normal text-slate-400">비어 있음</span>}
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
                        activeCalc.log && activeCalc.log.total !== activeCalc.deviceCount
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
          )}

          {doc.move && floors.length > 0 && (
            <section className="panel overflow-hidden">
              <div className="panel-header">
                <h2 className="font-bold text-slate-900">
                  {doc.eye ? '4. ' : '2. '}
                  {ON_SHEET} 시트 반영
                </h2>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.addDevices}
                    onChange={(event) => updateSettings({ addDevices: event.target.checked })}
                    className="h-4 w-4 accent-amber-600"
                  />
                  점등 입력을 {ON_SHEET} 시트 맨 아래에 행으로 추가
                </label>
              </div>
              <div className={`panel-body ${settings.addDevices ? '' : 'opacity-50'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">점등상태 기본값</span>
                  {LIGHT_TYPES.map((type) => (
                    <label
                      key={type}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                        settings.lightType === type
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="eyecheck-light-type"
                        value={type}
                        checked={settings.lightType === type}
                        onChange={() => updateSettings({ lightType: type })}
                        className="h-3.5 w-3.5 accent-amber-600"
                      />
                      {type}
                    </label>
                  ))}
                  {settings.lightType === '기타' && (
                    <input
                      type="text"
                      value={settings.lightOther}
                      onChange={(event) => updateSettings({ lightOther: event.target.value })}
                      placeholder="(기타 점등/멸 정보)"
                      maxLength={40}
                      aria-label="기타 점등 상태"
                      className="field-input w-56 py-1.5 text-xs"
                    />
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  고른 종류 뒤에 &quot;점등&quot;이 붙습니다. 기타는 적은 그대로 들어갑니다. 아래 표에서
                  자리마다 따로 고를 수도 있습니다. 모든 층의 점등 입력이 아래에 층별로 모입니다.
                  {content && ` 내용 칸에는 "${content}"까지만 채웁니다.`}
                </p>

                {floorsWithItems.length ? (
                  <div className="mt-3 overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2">위치</th>
                          <th className="w-14 px-3 py-2 text-center">개수</th>
                          <th className="px-3 py-2">점등상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {floorsWithItems.map(({ floor, calc }) => (
                          <Fragment key={floor.floor}>
                            <tr className="border-t border-amber-100 bg-amber-50/70">
                              <td colSpan={3} className="px-3 py-1.5 text-[11px] font-extrabold text-amber-800">
                                {floor.floor}층 · {calc.devices.length}행
                                {floor.floor !== settings.active && (
                                  <button
                                    type="button"
                                    onClick={() => updateSettings({ active: floor.floor })}
                                    className="ml-2 rounded-md border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                                  >
                                    입력 보기
                                  </button>
                                )}
                              </td>
                            </tr>
                            {calc.items.map((item) => (
                              <tr
                                key={item.key}
                                className={`border-t border-slate-100 ${item.own ? 'bg-emerald-50/50' : ''}`}
                              >
                                <td className="px-3 py-2 font-mono font-bold text-slate-800">{item.pos}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{item.count}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select
                                      value={item.type}
                                      onChange={(event) => setPickType(item.key, event.target.value)}
                                      aria-label={`${item.pos} 점등상태`}
                                      className="field-select w-auto py-1 text-xs"
                                    >
                                      {LIGHT_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                          {type}
                                        </option>
                                      ))}
                                    </select>
                                    {item.type === '기타' ? (
                                      <input
                                        type="text"
                                        value={item.other}
                                        onChange={(event) => setPickOther(item.key, event.target.value)}
                                        placeholder="(기타 점등/멸 정보)"
                                        maxLength={40}
                                        aria-label={`${item.pos} 기타 점등 상태`}
                                        className="field-input w-48 py-1 text-xs"
                                      />
                                    ) : (
                                      <span className="text-slate-400">{lightValue(item.type, item.other)}</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                    <p className="border-t border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                      추가될 행 {totalDeviceRows}개
                      {floorsWithItems.length > 1 &&
                        ` (${floorsWithItems
                          .map(({ floor, calc }) => `${floor.floor}층 ${calc.devices.length}`)
                          .join(' · ')})`}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    점등 입력이 없어 추가될 행이 없습니다. 층 탭마다 점등을 입력하면 모든 층의 행이 여기에
                    모입니다.
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="panel sticky bottom-4 z-20 px-4 py-3 shadow-xl shadow-slate-900/10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">
                  {summaryParts.length ? summaryParts.join(' · ') : '아직 바뀐 내용이 없습니다.'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <label
                    className={`flex items-center gap-1.5 ${fileHandle ? 'cursor-pointer' : 'cursor-default text-slate-400'}`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(fileHandle) && settings.overwrite}
                      disabled={!fileHandle}
                      onChange={(event) => updateSettings({ overwrite: event.target.checked })}
                      className="h-4 w-4 accent-amber-600"
                    />
                    {fileHandle
                      ? `원본 파일에 덮어쓰기 (${doc.fileName})`
                      : '원본 파일에 덮어쓰기 — 파일을 클릭해서 열어야 가능합니다'}
                  </label>
                  {overwrite && (
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={settings.backup}
                        onChange={(event) => updateSettings({ backup: event.target.checked })}
                        className="h-4 w-4 accent-amber-600"
                      />
                      덮어쓰기 전에 백업 내려받기
                    </label>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasPending || saving}
                className="btn-primary shrink-0"
              >
                <MdSave size={18} />
                {saving ? '저장 중' : saveLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      {!doc && (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <MdOutlineLightbulb size={16} className="text-amber-500" />
          기존 내역의 입력 규칙은 점등 내역 편집과 같습니다. 괄호 숫자는 자리별 개수, 콤마 뒤
          맨숫자는 앞 구역 글자를 이어받습니다.
        </p>
      )}
    </div>
  );
}

export default EyeCheckLightLog;
