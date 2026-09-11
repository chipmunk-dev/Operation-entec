import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ON_SHEET,
  OFF_SHEET,
  SEARCH_COLS,
  XLSX_MIME,
  applyEyecheckChanges,
  calculateFloors,
  checkWorkbookConsistency,
  collectPendingWork,
  contentText,
  openEyecheckWorkbook,
  snapshotFloors,
} from '../../utils/eyecheckWorkbook';
import { isoToSerial } from '../../utils/xlsxSheetXml';
import {
  compareReportRows,
  prepareReportDevices,
} from '../../utils/eyecheckReport';
import {
  loadEyecheckSettings,
  mergeLastSaved,
  saveEyecheckSettings,
} from '../../utils/eyecheckStorage';
import {
  canOverwrite,
  ensureWritePermission,
  pickWorkbookHandle,
  readDroppedFile,
  saveWorkbookFile,
} from './fileAccess';

const pad2 = (value) => String(value).padStart(2, '0');

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

export default function useEyeCheckLightLog() {
  const [settings, setSettings] = useState(() => loadEyecheckSettings());
  const [doc, setDoc] = useState(null);
  const [originalRows, setOriginalRows] = useState([]);
  const [deviceDetails, setDeviceDetails] = useState({});
  const [session, setSession] = useState(0);
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
    setOriginalRows([]);
    setDeviceDetails({});
    setSession((value) => value + 1);
  };

  const openFile = useCallback(async (file, handle = null) => {
    if (!file) return;
    setNotice(null);
    setAlertText('');
    setSelected(new Set());
    try {
      const nextDoc = openEyecheckWorkbook(
        new Uint8Array(await file.arrayBuffer()),
        file.name
      );
      const inputs = {};
      for (const floor of nextDoc.eye?.floors ?? []) {
        inputs[floor.floor] = { base: floor.zoneText, on: '' };
      }
      setDoc(nextDoc);
      setOriginalRows(nextDoc.move?.rows ?? []);
      setDeviceDetails({});
      setSession((value) => value + 1);
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

      const check = checkWorkbookConsistency(
        nextDoc,
        settingsRef.current.lastSaved
      );
      if (check) {
        setNotice({
          kind: 'warn',
          text: `${check.headline} ${check.diffs.join(' / ')} ${check.advice}`,
        });
        setAlertText(
          `${check.headline}\n\n· ${check.diffs.join('\n· ')}\n\n${check.advice}`
        );
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
      handle = await pickWorkbookHandle();
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
    const { file, handle } = await readDroppedFile(event.dataTransfer);
    await openFile(file, handle);
  };

  const floors = useMemo(() => doc?.eye?.floors ?? [], [doc]);
  // 입력칸은 즉시 반영하고, 그에 따른 계산·표 갱신은 한 박자 뒤에 한다. 빠르게 칠 때 커서가 튀지 않게.
  const deferredInputs = useDeferredValue(floorInputs);
  const isPreviewStale = floorInputs !== deferredInputs;
  const deferredSearch = useDeferredValue(search);
  const activeFloor =
    floors.find((floor) => floor.floor === settings.active) ?? null;
  const dateSerial = useMemo(() => {
    try {
      return isoToSerial(date);
    } catch {
      return null;
    }
  }, [date]);
  const content = contentText(date);

  const calculateInputs = useCallback(
    (inputs) =>
      calculateFloors(floors, inputs, {
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
    [
      floors,
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
    ]
  );
  const calcs = useMemo(
    () => calculateInputs(deferredInputs),
    [calculateInputs, deferredInputs]
  );
  const calcByFloor = Object.fromEntries(
    calcs.map(({ floor, calc }) => [floor.floor, calc])
  );
  const activeCalc = activeFloor ? calcByFloor[activeFloor.floor] : null;
  const activeInput = activeFloor
    ? (floorInputs[activeFloor.floor] ?? { base: '', on: '' })
    : null;
  const grandTotal = calcs.reduce(
    (sum, { calc }) => sum + (calc.log?.total ?? 0),
    0
  );

  const pending = doc
    ? collectPendingWork(doc, calcs, selected.size, settings.addDevices)
    : { floors: [], moveCount: 0, devices: [] };
  const hasPending = Boolean(
    pending.floors.length || pending.moveCount || pending.devices.length
  );

  // 보고와 저장은 지연된 미리보기가 아닌 현재 입력을 사용한다.
  const reportPending = doc
    ? collectPendingWork(
        doc,
        calculateInputs(floorInputs),
        selected.size,
        settings.addDevices
      )
    : { devices: [] };
  const reportDevices = prepareReportDevices(
    reportPending.devices,
    deviceDetails
  );
  const detailKeys = JSON.stringify(reportDevices.map((row) => row.key));
  useEffect(() => {
    const valid = new Set(JSON.parse(detailKeys));
    setDeviceDetails((previous) => {
      const entries = Object.entries(previous).filter(([key]) =>
        valid.has(key)
      );
      return entries.length === Object.keys(previous).length
        ? previous
        : Object.fromEntries(entries);
    });
  }, [detailKeys]);
  const currentRows = [
    ...(doc?.move?.rows ?? []).filter((row) => !selected.has(row.r)),
    ...reportDevices.map(({ key, vals }) => ({ vals, detailKey: key })),
  ];
  const reportChanges = compareReportRows(originalRows, currentRows);
  const updateDeviceDetail = (key, col, value) =>
    setDeviceDetails((previous) => ({
      ...previous,
      [key]: { ...previous[key], [col]: value },
    }));

  const visibleRows = useMemo(() => {
    const rows = doc?.move?.rows ?? [];
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      SEARCH_COLS.some((col) =>
        (row.vals[col] || '').toLowerCase().includes(query)
      )
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
      [activeFloor.floor]: {
        ...(previous[activeFloor.floor] ?? { base: '', on: '' }),
        [field]: value,
      },
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
        o:
          previous[key]?.o ??
          (settings.lightType === '기타' ? settings.lightOther : ''),
      },
    }));
  };

  const setPickOther = (key, other) => {
    setPicks((previous) => ({ ...previous, [key]: { t: '기타', o: other } }));
  };

  const handleSave = async () => {
    if (!doc || saving) return;
    setNotice(null);
    setSaving(true);
    try {
      // 권한 요청은 버튼을 누른 직후에 해야 한다. 무거운 작업을 먼저 하면 사용자 동작으로 인정되지 않는다.
      if (overwrite) await ensureWritePermission(fileHandle);
      if (dateSerial === null)
        throw new Error('점검 날짜가 올바르지 않습니다.');

      // 미리보기 갱신 여부와 관계없이 저장 버튼을 누른 시점의 입력으로 다시 계산한다.
      const saveCalcs = calculateInputs(floorInputs);
      const savePending = collectPendingWork(
        doc,
        saveCalcs,
        selected.size,
        settings.addDevices
      );
      if (
        !savePending.floors.length &&
        !savePending.moveCount &&
        !savePending.devices.length
      )
        return;
      const saveCalcByFloor = Object.fromEntries(
        saveCalcs.map(({ floor, calc }) => [floor.floor, calc])
      );
      const result = applyEyecheckChanges(doc, {
        floors: savePending.floors,
        calcByFloor: saveCalcByFloor,
        selectedRows: [...selected],
        dateSerial,
        devices: prepareReportDevices(savePending.devices, deviceDetails).map(
          (row) => row.vals
        ),
      });
      // 저장 전에 재열기를 검증한다. 저장 후에도 최초 비교 기준은 그대로 둔다.
      const savedDoc = openEyecheckWorkbook(result.bytes, doc.fileName);
      const blob = new Blob([result.bytes], { type: XLSX_MIME });

      const where = await saveWorkbookFile({
        fileHandle,
        blob,
        fileName: doc.fileName,
        date,
        overwrite,
        backup,
      });

      if (floors.length || result.finalCounts) {
        // 기록한 층뿐 아니라 모든 층의 현재 내용을 남겨야 다음 열기 때 층마다 정확히 비교된다.
        const lastSaved = mergeLastSaved(
          settingsRef.current.lastSaved,
          snapshotFloors(floors, result.saved),
          result.finalCounts
        );
        settingsRef.current = { ...settingsRef.current, lastSaved };
        updateSettings({ lastSaved });
      }
      setPicks({});
      setSelected(new Set());
      setDeviceDetails({});
      setDoc(savedDoc);
      setFloorInputs(
        Object.fromEntries(
          (savedDoc.eye?.floors ?? []).map((floor) => [
            floor.floor,
            { base: floor.zoneText, on: '' },
          ])
        )
      );
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

  const activeWarnings = [];
  if (activeFloor && activeCalc) {
    const { log } = activeCalc;
    const countsDiffer =
      log &&
      activeCalc.deviceCount !== null &&
      log.total !== activeCalc.deviceCount;
    if (countsDiffer) {
      activeWarnings.push(
        `점검대상 칸 ${log.total}개와 점등장비 시트 ${activeCalc.deviceCount}건이 다릅니다. 자리 하나에 장비 한 줄이 맞는지 확인해 주세요.`
      );
    }
    if (!log && activeCalc.off) {
      activeWarnings.push(
        '이 층의 점검대상 칸이 비어 있어 소등을 반영할 곳이 없습니다. 소등장비 시트로 옮기기만 합니다.'
      );
    }
    if (log?.unread.length)
      activeWarnings.push(`읽지 못한 조각: ${log.unread.join(', ')}`);
    if (log?.missing.length) {
      activeWarnings.push(
        `기존 내역에 없는 자리를 소등: ${log.missing.join(', ')}`
      );
    }
    if (activeCalc.unmatched.length) {
      activeWarnings.push(
        `${activeFloor.floor}층에 없는 구역 글자: ${activeCalc.unmatched.join(', ')} (구역별 칸에는 쓰지 않음)`
      );
    }
  }

  // 4번 표는 현재 층만이 아니라 모든 층의 점등 입력을 층별로 모아 보여준다.
  const floorsWithItems = calcs.filter(({ calc }) => calc.items.length > 0);
  const totalDeviceRows = calcs.reduce(
    (sum, { calc }) => sum + calc.devices.length,
    0
  );

  const summaryParts = [];
  if (pending.floors.length) {
    summaryParts.push(
      `점등내역 기록: ${pending.floors.map((floor) => `${floor.floor}층`).join(', ')}`
    );
  }
  if (pending.devices.length)
    summaryParts.push(`${ON_SHEET} 추가: ${pending.devices.length}행`);
  if (pending.moveCount)
    summaryParts.push(`${OFF_SHEET}로 이동: ${pending.moveCount}건`);

  return {
    session,
    reportChanges,
    currentRows,
    updateDeviceDetail,
    settings,
    doc,
    fileHandle,
    date,
    setDate,
    search,
    setSearch,
    notice,
    setNotice,
    alertText,
    setAlertText,
    saving,
    dragOver,
    setDragOver,
    fileInputRef,
    updateSettings,
    resetDoc,
    openFile,
    pickFile,
    handleDrop,
    floors,
    calcs,
    activeFloor,
    activeCalc,
    activeInput,
    grandTotal,
    visibleRows,
    selected,
    allVisibleSelected,
    overwrite,
    saveLabel,
    setActiveInput,
    clearActiveEdits,
    toggleRow,
    toggleVisibleRows,
    setPickType,
    setPickOther,
    handleSave,
    activeWarnings,
    floorsWithItems,
    totalDeviceRows,
    summaryParts,
    hasPending,
    isPreviewStale,
    content,
  };
}
