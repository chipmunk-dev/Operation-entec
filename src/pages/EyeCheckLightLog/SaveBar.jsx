import PropTypes from 'prop-types';
import { MdSave } from 'react-icons/md';

export default function SaveBar({
  summaryParts,
  canWriteOriginal,
  settings,
  updateSettings,
  overwrite,
  fileName,
  handleSave,
  hasPending,
  isPreviewStale,
  saving,
  saveLabel,
}) {
  return (
    <section className="panel sticky bottom-4 z-20 px-4 py-3 shadow-xl shadow-slate-900/10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {summaryParts.length
              ? summaryParts.join(' · ')
              : '아직 바뀐 내용이 없습니다.'}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <label
              className={`flex items-center gap-1.5 ${canWriteOriginal ? 'cursor-pointer' : 'cursor-default text-slate-400'}`}
            >
              <input
                type="checkbox"
                checked={Boolean(canWriteOriginal) && settings.overwrite}
                disabled={!canWriteOriginal}
                onChange={(event) =>
                  updateSettings({ overwrite: event.target.checked })
                }
                className="h-4 w-4 accent-amber-600"
              />
              {canWriteOriginal
                ? `원본 파일에 덮어쓰기 (${fileName})`
                : '원본 파일에 덮어쓰기 — 파일을 클릭해서 열어야 가능합니다'}
            </label>
            {overwrite && (
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={settings.backup}
                  onChange={(event) =>
                    updateSettings({ backup: event.target.checked })
                  }
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
          disabled={(!hasPending && !isPreviewStale) || saving}
          className="btn-primary shrink-0"
        >
          <MdSave size={18} />
          {saving ? '저장 중' : saveLabel}
        </button>
      </div>
    </section>
  );
}

SaveBar.propTypes = {
  summaryParts: PropTypes.array.isRequired,
  canWriteOriginal: PropTypes.bool.isRequired,
  settings: PropTypes.object.isRequired,
  updateSettings: PropTypes.func.isRequired,
  overwrite: PropTypes.bool.isRequired,
  fileName: PropTypes.string.isRequired,
  handleSave: PropTypes.func.isRequired,
  hasPending: PropTypes.bool.isRequired,
  isPreviewStale: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  saveLabel: PropTypes.string.isRequired,
};
