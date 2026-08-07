export const APP_VERSION_MANIFEST_PATH = '/version.json';

export const getAppVersion = (manifest) => {
  if (!manifest || typeof manifest !== 'object') {
    return null;
  }

  if (typeof manifest.version !== 'string') {
    return null;
  }

  const version = manifest.version.trim();
  return version || null;
};

export const hasAppVersionChanged = (currentVersion, manifest) => {
  const latestVersion = getAppVersion(manifest);
  const normalizedCurrentVersion =
    typeof currentVersion === 'string' ? currentVersion.trim() : '';

  return Boolean(
    normalizedCurrentVersion &&
      latestVersion &&
      normalizedCurrentVersion !== latestVersion,
  );
};
