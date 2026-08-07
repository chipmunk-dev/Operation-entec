import { FaArrowsRotate } from 'react-icons/fa6';
import useAppUpdate from '../hooks/useAppUpdate';

function AppUpdateBanner() {
  const { isUpdateAvailable, refreshApp } = useAppUpdate();

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div
      role="alert"
      className="sticky top-3 z-30 mx-4 mt-3 rounded-2xl border border-blue-200/80 bg-white/90 px-4 py-3 shadow-[0_16px_40px_rgba(37,99,235,0.14)] backdrop-blur-xl sm:mx-6 lg:mx-8"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-200">
            <FaArrowsRotate aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-blue-950">
              새 버전이 배포되었습니다.
            </p>
            <p className="mt-0.5 text-xs leading-5 text-blue-700">
              최신 기능을 사용하려면 새로고침해 주세요.
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-rose-600">
              * 주의: 지속 이벤트 재전달 작업 중에는 입력 데이터가 사라질 수
              있으니 작업을 마친 뒤 새로고침하세요.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshApp}
          className="btn shrink-0 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
        >
          <FaArrowsRotate aria-hidden="true" />
          새로고침
        </button>
      </div>
    </div>
  );
}

export default AppUpdateBanner;
