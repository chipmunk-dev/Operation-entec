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
      className="sticky top-0 z-30 border-b border-blue-200 bg-blue-50/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
            <FaArrowsRotate aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-blue-950">
              새 버전이 배포되었습니다.
            </p>
            <p className="mt-0.5 text-xs leading-5 text-blue-700">
              최신 기능을 사용하려면 새로고침해 주세요. 작성 중인 내용은 먼저
              확인해 주세요.
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
