const baseUrl = (import.meta.env.VITE_SHARED_API_URL || '').replace(/\/+$/, '');

export const isSharedApiConfigured = Boolean(baseUrl);

export class SharedApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'SharedApiError';
    this.status = options.status || 0;
    this.retryAfter = options.retryAfter || 0;
  }
}

const request = async (options = {}) => {
  if (!baseUrl) {
    throw new SharedApiError('공유 저장 API가 아직 연결되지 않았습니다.');
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/api/backup-report`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new SharedApiError(
      '공유 저장 서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new SharedApiError('공유 저장 서버의 응답 형식이 올바르지 않습니다.', {
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new SharedApiError(body.message || '공유 데이터 요청에 실패했습니다.', {
      status: response.status,
      retryAfter: Number(body.retryAfter || response.headers.get('Retry-After') || 0),
    });
  }

  return body;
};

export const loadSharedBackup = () => request();

export const saveSharedBackup = (data) =>
  request({
    method: 'PUT',
    body: JSON.stringify(data),
  });
