/** Shape of the API's unified error body: {"error": {code, message, fields}}. */
interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string>
  }
}

/** An error returned by the API, carrying its status and field messages. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isConflict(): boolean {
    return this.status === 409
  }

  get isValidation(): boolean {
    return this.status === 400
  }
}

const API_BASE = '/api/v1'

async function toApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {}
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    // Non-JSON error body (proxy error page, empty 502, ...) — fall through
    // to the generic message below.
  }

  return new ApiError(
    response.status,
    body.error?.code ?? 'unknown_error',
    body.error?.message ?? response.statusText,
    body.error?.fields ?? {},
  )
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
  })

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> => jsonRequest<T>('POST', path, body),
  put: <T>(path: string, body?: unknown): Promise<T> => jsonRequest<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => jsonRequest<T>('PATCH', path, body),
  delete: <T>(path: string): Promise<T> => jsonRequest<T>('DELETE', path),

  /** Multipart upload — used for prize photos. */
  upload: <T>(path: string, field: string, file: File): Promise<T> => {
    const form = new FormData()
    form.append(field, file)
    return request<T>(path, { method: 'POST', body: form })
  },
}

/** Builds a query string from defined, non-empty params. */
export function query(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const queryString = search.toString()
  return queryString ? `?${queryString}` : ''
}
