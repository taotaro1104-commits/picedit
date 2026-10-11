// ブラウザ内背景除去ワーカー（BiRefNet_lite / MIT ライセンス）。
// UI スレッドを止めないよう、モデルの読み込みと推論はすべてここで行う。
import { AutoModel, RawImage, Tensor } from '@huggingface/transformers'

const MODEL_ID = 'onnx-community/BiRefNet_lite-ONNX'
// ONNX モデルの入力は 1024×1024 固定
const INPUT_SIZE = 1024
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

type Model = (inputs: Record<string, unknown>) => Promise<Record<string, any>>

interface Loaded {
  model: Model
}

// 速い順に試す。WASM（CPU）は 1024px 固定入力の fp32 推論でメモリ不足（bad_alloc）になり、
// しかも約180MBのダウンロード後に失敗するため候補に入れない。WebGPU が無ければ即座に簡易版へ切り替える。
const CANDIDATES = [
  { device: 'webgpu', dtype: 'fp16' },
  { device: 'webgpu', dtype: 'fp32' },
] as const

interface GpuSupport {
  webgpu: boolean
  fp16: boolean
}

/** 失敗した WebGPU 初期化はランタイムの状態を汚すため、事前にアダプターを確認する。 */
async function detectGpu(): Promise<GpuSupport> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<any> } }).gpu
  if (!gpu) return { webgpu: false, fp16: false }
  try {
    const adapter = await gpu.requestAdapter()
    if (!adapter) return { webgpu: false, fp16: false }
    return { webgpu: true, fp16: Boolean(adapter.features?.has('shader-f16')) }
  } catch {
    return { webgpu: false, fp16: false }
  }
}

async function loadModel(onProgress: (p: number) => void): Promise<Loaded> {
  const support = await detectGpu()
  if (!support.webgpu) throw new Error('WebGPU が使えないため AI 背景除去を利用できません。')
  const candidates = CANDIDATES.filter((c) => c.dtype !== 'fp16' || support.fp16)
  let lastError: unknown
  for (const { device, dtype } of candidates) {
    try {
      const model = await AutoModel.from_pretrained(MODEL_ID, {
        device,
        dtype,
        progress_callback: (e: { status?: string; progress?: number }) => {
          if (e.status === 'progress' && typeof e.progress === 'number') onProgress(e.progress)
        },
      })
      return { model: model as unknown as Model }
    } catch (err) {
      console.warn(`BiRefNet load failed on ${device}/${dtype}`, err)
      lastError = err
    }
  }
  throw lastError
}

let loading: Promise<Loaded> | null = null

function load(onProgress: (p: number) => void): Promise<Loaded> {
  if (!loading) {
    loading = loadModel(onProgress)
    loading.catch(() => {
      loading = null // 失敗したら次回やり直せるようにする
    })
  }
  return loading
}

/** 正方形にリサイズし、ImageNet 正規化した CHW テンソルを作る（BiRefNet の前処理）。 */
async function toPixelValues(image: RawImage, size: number): Promise<Tensor> {
  const resized = (await image.resize(size, size)).rgb()
  const src = resized.data
  const plane = size * size
  const out = new Float32Array(3 * plane)
  for (let p = 0; p < plane; p++) {
    for (let c = 0; c < 3; c++) {
      out[c * plane + p] = (src[p * 3 + c] / 255 - MEAN[c]) / STD[c]
    }
  }
  return new Tensor('float32', out, [1, 3, size, size])
}

self.onmessage = async (event: MessageEvent<{ id: number; blob: Blob }>) => {
  const { id, blob } = event.data
  try {
    const { model } = await load((progress) =>
      self.postMessage({ id, type: 'progress', progress }),
    )
    const image = await RawImage.fromBlob(blob)
    const pixelValues = await toPixelValues(image, INPUT_SIZE)
    const { output_image } = await model({ input_image: pixelValues })
    const mask = await RawImage.fromTensor(
      output_image[0].sigmoid().mul(255).to('uint8'),
    ).resize(image.width, image.height)
    const data = new Uint8ClampedArray(mask.data)
    self.postMessage({ id, type: 'result', data, width: mask.width, height: mask.height }, {
      transfer: [data.buffer],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ id, type: 'error', message })
  }
}
