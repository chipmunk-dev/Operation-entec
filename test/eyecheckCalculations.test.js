import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFloorState } from '../src/utils/eyecheckCalculations.js';
import {
  calculateFloor,
  calculateFloors,
} from '../src/utils/eyecheckWorkbook.js';

const floor = {
  floor: '3',
  zoneText: 'A-15/B-2',
  zones: [
    { letter: 'A', ref: 'O27', text: 'A-15' },
    { letter: 'B', ref: 'O30', text: 'B-2' },
  ],
};

const options = {
  selectedRows: new Set([4]),
  dateSerial: 46268,
  lightType: '빨강',
  picks: {
    '3|A-15|0': { t: '디스크' },
    '3|A-15|1': { t: '기타', o: ' 팬 점멸 ' },
  },
  addDevices: false,
};

const input = { ...options, base: floor.zoneText, on: 'B-2,A-15(2),15' };
const positions = [
  { r: 3, position: 'SA3A-15' },
  { r: 4, position: 'SA3B-2' },
];
const rows = positions.map(({ r, position }) => ({ r, vals: { D: position } }));

test('층 계산은 셀 열 없이 위치를 읽고 장비 데이터와 소등 결과를 만든다', () => {
  const calc = calculateFloorState(floor, { ...input, moveRows: positions });

  assert.equal(calc.off, 'B-2');
  assert.equal(calc.output, 'A-15(4)/B-2');
  assert.equal(
    calc.deviceCount,
    1,
    '행 추가를 꺼도 계산한 추가 장비는 보존한다'
  );
  assert.deepEqual(calc.devices, [
    {
      dateSerial: 46268,
      position: 'SA3A-15',
      lightType: '디스크',
      lightOther: '',
      shift: '',
      finder: '',
      content: '',
    },
    {
      dateSerial: 46268,
      position: 'SA3A-15',
      lightType: '디스크',
      lightOther: '',
      shift: '',
      finder: '',
      content: '',
    },
    {
      dateSerial: 46268,
      position: 'SA3A-15',
      lightType: '기타',
      lightOther: ' 팬 점멸 ',
      shift: '',
      finder: '',
      content: '',
    },
    {
      dateSerial: 46268,
      position: 'SA3B-2',
      lightType: '빨강',
      lightOther: '',
      shift: '',
      finder: '',
      content: '',
    },
  ]);
});

test('문서 계산 진입점은 중복 자리 키와 개별 선택, 엑셀 행 계약을 유지한다', () => {
  const calc = calculateFloor(floor, { ...input, moveRows: rows });

  assert.deepEqual(calc.items, [
    {
      key: '3|A-15|0',
      pos: 'SA3A-15',
      count: 2,
      type: '디스크',
      other: '',
      own: true,
    },
    {
      key: '3|A-15|1',
      pos: 'SA3A-15',
      count: 1,
      type: '기타',
      other: ' 팬 점멸 ',
      own: true,
    },
    {
      key: '3|B-2|0',
      pos: 'SA3B-2',
      count: 1,
      type: '빨강',
      other: '',
      own: false,
    },
  ]);
  assert.deepEqual(calc.devices, [
    { A: 46268, D: 'SA3A-15', I: '디스크 점등', J: '', K: '', M: '' },
    { A: 46268, D: 'SA3A-15', I: '디스크 점등', J: '', K: '', M: '' },
    { A: 46268, D: 'SA3A-15', I: '팬 점멸', J: '', K: '', M: '' },
    { A: 46268, D: 'SA3B-2', I: '빨강 점등', J: '', K: '', M: '' },
  ]);
  assert.deepEqual(
    calculateFloors(
      [floor],
      { 3: { base: input.base, on: input.on } },
      { ...options, moveRows: rows }
    ),
    [{ floor, calc }]
  );
});
