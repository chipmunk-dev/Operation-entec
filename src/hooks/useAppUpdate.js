import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APP_VERSION_MANIFEST_PATH,
  hasAppVersionChanged,
} from '../utils/appVersion';

const APP_VERSION_CHECK_INTERVAL_MS = 60 * 1000;
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION;

function useAppUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const isCheckingRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      const response = await fetch(
        `${APP_VERSION_MANIFEST_PATH}?t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        return;
      }

      const manifest = await response.json();

      if (hasAppVersionChanged(CURRENT_APP_VERSION, manifest)) {
        setIsUpdateAvailable(true);
      }
    } catch {
      // 네트워크가 끊겼거나 배포 중인 경우에는 다음 확인 주기에 다시 시도합니다.
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return undefined;
    }

    checkForUpdate();
    const intervalId = window.setInterval(
      checkForUpdate,
      APP_VERSION_CHECK_INTERVAL_MS,
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', checkForUpdate);
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdate]);

  return {
    isUpdateAvailable,
    refreshApp: () => window.location.reload(),
  };
}

export default useAppUpdate;
