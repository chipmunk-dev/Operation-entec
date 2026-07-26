export const ZONES = ['P-EUBKMST', 'NBUMASTER', 'EXTMASTER'];
export const MAX_REQUEST_BYTES = 3 * 1024 * 1024;
const MAX_ZONE_LENGTH = 900_000;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isColumnPosition = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 40;

export const validateReportPayload = (candidate) => {
  if (!isPlainObject(candidate)) {
    return { ok: false, message: '요청 데이터가 객체 형식이 아닙니다.' };
  }

  const allowedKeys = ['inputs', 'columnPositions', 'activeZone'];
  if (Object.keys(candidate).some((key) => !allowedKeys.includes(key))) {
    return { ok: false, message: '허용되지 않은 데이터 필드가 포함되어 있습니다.' };
  }

  if (!isPlainObject(candidate.inputs)) {
    return { ok: false, message: '백업존 입력 데이터가 올바르지 않습니다.' };
  }
  if (Object.keys(candidate.inputs).some((zone) => !ZONES.includes(zone))) {
    return { ok: false, message: '알 수 없는 백업존이 포함되어 있습니다.' };
  }

  const inputs = {};
  for (const zone of ZONES) {
    const value = candidate.inputs[zone];
    if (typeof value !== 'string') {
      return { ok: false, message: `${zone} 입력 데이터가 문자열이 아닙니다.` };
    }
    if (value.length > MAX_ZONE_LENGTH) {
      return { ok: false, message: `${zone} 입력 데이터가 허용 크기를 초과했습니다.` };
    }
    inputs[zone] = value;
  }

  if (!ZONES.some((zone) => inputs[zone].trim())) {
    return { ok: false, message: '공유 저장할 백업 데이터가 없습니다.' };
  }

  const positions = candidate.columnPositions;
  if (
    !isPlainObject(positions) ||
    !isColumnPosition(positions.status) ||
    !isColumnPosition(positions.policyName) ||
    !isColumnPosition(positions.startTime)
  ) {
    return { ok: false, message: '열 위치 설정이 올바르지 않습니다.' };
  }

  if (new Set(Object.values(positions)).size !== 3) {
    return { ok: false, message: '각 필드는 서로 다른 열을 사용해야 합니다.' };
  }

  return {
    ok: true,
    data: {
      inputs,
      columnPositions: {
        status: positions.status,
        policyName: positions.policyName,
        startTime: positions.startTime,
      },
      activeZone: ZONES.includes(candidate.activeZone)
        ? candidate.activeZone
        : ZONES[0],
    },
  };
};
