import PropTypes from 'prop-types';
import { Fragment } from 'react';
import {
  ON_SHEET,
  LIGHT_TYPES,
  lightValue,
} from '../../utils/eyecheckWorkbook';

export default function DeviceRows({
  hasEye,
  settings,
  updateSettings,
  content,
  floorsWithItems,
  totalDeviceRows,
  setPickType,
  setPickOther,
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <h2 className="font-bold text-slate-900">
          {hasEye ? '4. ' : '2. '}
          {ON_SHEET} 시트 반영
        </h2>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={settings.addDevices}
            onChange={(event) =>
              updateSettings({ addDevices: event.target.checked })
            }
            className="h-4 w-4 accent-amber-600"
          />
          점등 입력을 {ON_SHEET} 시트 맨 아래에 행으로 추가
        </label>
      </div>
      <div className={`panel-body ${settings.addDevices ? '' : 'opacity-50'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            점등상태 기본값
          </span>
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
              onChange={(event) =>
                updateSettings({ lightOther: event.target.value })
              }
              placeholder="(기타 점등/멸 정보)"
              maxLength={40}
              aria-label="기타 점등 상태"
              className="field-input w-56 py-1.5 text-xs"
            />
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          고른 종류 뒤에 &quot;점등&quot;이 붙습니다. 기타는 적은 그대로
          들어갑니다. 아래 표에서 자리마다 따로 고를 수도 있습니다. 모든 층의
          점등 입력이 아래에 층별로 모입니다.
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
                      <td
                        colSpan={3}
                        className="px-3 py-1.5 text-[11px] font-extrabold text-amber-800"
                      >
                        {floor.floor}층 · {calc.devices.length}행
                        {floor.floor !== settings.active && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSettings({ active: floor.floor })
                            }
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
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">
                          {item.pos}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">
                          {item.count}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={item.type}
                              onChange={(event) =>
                                setPickType(item.key, event.target.value)
                              }
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
                                onChange={(event) =>
                                  setPickOther(item.key, event.target.value)
                                }
                                placeholder="(기타 점등/멸 정보)"
                                maxLength={40}
                                aria-label={`${item.pos} 기타 점등 상태`}
                                className="field-input w-48 py-1 text-xs"
                              />
                            ) : (
                              <span className="text-slate-400">
                                {lightValue(item.type, item.other)}
                              </span>
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
                  .map(
                    ({ floor, calc }) =>
                      `${floor.floor}층 ${calc.devices.length}`
                  )
                  .join(' · ')})`}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            점등 입력이 없어 추가될 행이 없습니다. 층 탭마다 점등을 입력하면
            모든 층의 행이 여기에 모입니다.
          </p>
        )}
      </div>
    </section>
  );
}

DeviceRows.propTypes = {
  hasEye: PropTypes.bool.isRequired,
  settings: PropTypes.object.isRequired,
  updateSettings: PropTypes.func.isRequired,
  content: PropTypes.string.isRequired,
  floorsWithItems: PropTypes.array.isRequired,
  totalDeviceRows: PropTypes.number.isRequired,
  setPickType: PropTypes.func.isRequired,
  setPickOther: PropTypes.func.isRequired,
};
