import {
  MAX_REQUEST_BYTES,
  validateReportPayload,
} from './validation.js';

const COOLDOWN_MS = 10_000;

const getAllowedOrigins = (env) =>
  (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const json = (body, status, origin, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  });

const checkCooldown = async (env, action) => {
  const row = await env.DB.prepare(
    'SELECT available_at FROM action_cooldowns WHERE action = ?1',
  )
    .bind(action)
    .first();
  const remainingMs = Number(row?.available_at || 0) - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

const cooldownStatement = (env, action, availableAt) =>
  env.DB.prepare(
    `INSERT INTO action_cooldowns (action, available_at)
     VALUES (?1, ?2)
     ON CONFLICT(action) DO UPDATE SET available_at = excluded.available_at`,
  ).bind(action, availableAt);

const rateLimited = (action, retryAfter, origin) =>
  json(
    {
      status: 'rate_limited',
      action,
      retryAfter,
      message: `${retryAfter}초 후 다시 ${
        action === 'save' ? '저장' : '가져오기'
      }할 수 있습니다.`,
    },
    429,
    origin,
    { 'Retry-After': String(retryAfter) },
  );

const loadReport = async (env, origin) => {
  const retryAfter = await checkCooldown(env, 'load');
  if (retryAfter) return rateLimited('load', retryAfter, origin);

  const row = await env.DB.prepare(
    'SELECT payload, saved_at FROM shared_backup_report WHERE id = 1',
  ).first();
  await cooldownStatement(env, 'load', Date.now() + COOLDOWN_MS).run();

  if (!row) {
    return json(
      {
        status: 'empty',
        data: null,
        savedAt: null,
        message: '저장된 공유 데이터가 없습니다.',
      },
      200,
      origin,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(row.payload);
  } catch {
    return json(
      {
        status: 'error',
        message: '저장된 공유 데이터의 형식이 올바르지 않습니다.',
      },
      500,
      origin,
    );
  }

  const validated = validateReportPayload(parsed);
  if (!validated.ok) {
    return json(
      {
        status: 'error',
        message: '저장된 공유 데이터 검증에 실패했습니다.',
      },
      500,
      origin,
    );
  }

  return json(
    {
      status: 'success',
      data: validated.data,
      savedAt: row.saved_at,
    },
    200,
    origin,
  );
};

const saveReport = async (request, env, origin) => {
  const retryAfter = await checkCooldown(env, 'save');
  if (retryAfter) return rateLimited('save', retryAfter, origin);

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json(
      { status: 'error', message: '요청 데이터가 허용 크기를 초과했습니다.' },
      413,
      origin,
    );
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    return json(
      { status: 'error', message: '요청 데이터가 허용 크기를 초과했습니다.' },
      413,
      origin,
    );
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json(
      { status: 'error', message: '요청 본문이 올바른 JSON 형식이 아닙니다.' },
      400,
      origin,
    );
  }

  const validated = validateReportPayload(body);
  if (!validated.ok) {
    return json(
      { status: 'error', message: validated.message },
      400,
      origin,
    );
  }

  const savedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO shared_backup_report (id, payload, saved_at)
       VALUES (1, ?1, ?2)
       ON CONFLICT(id) DO UPDATE SET
         payload = excluded.payload,
         saved_at = excluded.saved_at`,
    ).bind(JSON.stringify(validated.data), savedAt),
    cooldownStatement(env, 'save', Date.now() + COOLDOWN_MS),
  ]);

  return json(
    {
      status: 'success',
      savedAt,
      message: '현재 데이터를 공유 저장했습니다.',
    },
    200,
    origin,
  );
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!getAllowedOrigins(env).includes(origin)) {
      return new Response('Forbidden origin', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ status: 'ok' }, 200, origin);
      }
      if (url.pathname === '/api/backup-report' && request.method === 'GET') {
        return await loadReport(env, origin);
      }
      if (url.pathname === '/api/backup-report' && request.method === 'PUT') {
        return await saveReport(request, env, origin);
      }
      return json(
        { status: 'not_found', message: '요청한 API를 찾을 수 없습니다.' },
        404,
        origin,
      );
    } catch {
      return json(
        {
          status: 'error',
          message: '공유 데이터 처리 중 서버 오류가 발생했습니다.',
        },
        500,
        origin,
      );
    }
  },
};
