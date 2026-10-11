// バックエンド API クライアント。エラーはコード付きの ApiError に統一し、表示時に翻訳する。
import { AppError, type ErrorParams } from './errors'

const API_BASE: string = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends AppError {
  readonly status: number

  constructor(code: string, status: number, params: ErrorParams = {}, message?: string) {
    super(code, params, message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface PostImageOptions {
  readonly files: Record<string, Blob | readonly Blob[]>
  readonly fields?: Record<string, string | number | boolean>
  readonly query?: Record<string, string>
}

export interface ImageResult {
  readonly blob: Blob
  readonly headers: Headers
}

function buildForm(options: PostImageOptions): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(options.files)) {
    const blobs = Array.isArray(value) ? value : [value as Blob]
    blobs.forEach((blob, i) => form.append(key, blob, `${key}-${i}.png`))
  }
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    form.append(key, String(value))
  }
  return form
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: unknown; code?: unknown; params?: unknown }
    if (typeof body.code === 'string') {
      const params = typeof body.params === 'object' && body.params ? (body.params as ErrorParams) : {}
      const message = typeof body.error === 'string' ? body.error : undefined
      return new ApiError(body.code, res.status, params, message)
    }
  } catch {
    // JSON でないエラー応答（プロキシのエラーページなど）は HTTP ステータスで表す
  }
  return new ApiError('http', res.status, { status: res.status })
}

export async function postImage(path: string, options: PostImageOptions): Promise<ImageResult> {
  const qs = options.query ? `?${new URLSearchParams(options.query).toString()}` : ''
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}${qs}`, { method: 'POST', body: buildForm(options) })
  } catch {
    throw new ApiError('network', 0)
  }
  if (!res.ok) throw await toApiError(res)
  return { blob: await res.blob(), headers: res.headers }
}

export interface AiStatus {
  readonly available: boolean
  readonly provider: string
}

export async function fetchHealth(): Promise<AiStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    const body = (await res.json()) as { data?: { ai?: AiStatus } }
    return body.data?.ai ?? { available: false, provider: 'none' }
  } catch {
    return { available: false, provider: 'none' }
  }
}
