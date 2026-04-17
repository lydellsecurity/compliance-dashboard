/**
 * Helpers that build AWS Lambda / Netlify Functions-compatible event payloads.
 *
 * Every integration function under netlify/functions/ has the signature
 * `(event, context) => { statusCode, headers, body }`. These helpers let us
 * craft deterministic events without copy-pasting the boilerplate per test.
 */

export interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters: Record<string, string> | null;
  rawQuery: string;
  path: string;
  isBase64Encoded?: boolean;
}

export function jsonEvent(
  method: string,
  body: unknown,
  overrides: Partial<NetlifyEvent> = {}
): NetlifyEvent {
  return {
    httpMethod: method,
    headers: { 'content-type': 'application/json', ...(overrides.headers ?? {}) },
    body: body === undefined ? null : JSON.stringify(body),
    queryStringParameters: overrides.queryStringParameters ?? null,
    rawQuery: overrides.rawQuery ?? '',
    path: overrides.path ?? '/.netlify/functions/test',
    isBase64Encoded: false,
  };
}

export function optionsEvent(origin = 'http://localhost:5173'): NetlifyEvent {
  return {
    httpMethod: 'OPTIONS',
    headers: { origin, 'access-control-request-method': 'POST' },
    body: null,
    queryStringParameters: null,
    rawQuery: '',
    path: '/.netlify/functions/test',
  };
}

export function parseBody<T = unknown>(response: { body: string }): T {
  return JSON.parse(response.body) as T;
}
