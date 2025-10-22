import type {
  ApiError,
  BatchPredictResponse,
  ExplainResponse,
  HealthResponse,
  ModelInfoResponse,
  PredictResponse,
  SampleTransactionResponse,
  TransactionFeatures,
  TransactionPayload,
} from './types'

const API_BASE_URL = ''.replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await response.json() : null

    if (!response.ok) {
      const error: ApiError = {
        message: payload?.error ?? response.statusText ?? 'Неизвестная ошибка',
        status: response.status,
      }
      throw error
    }

    return payload as T
  } catch (error) {
    if ((error as ApiError).message) {
      throw error
    }

    throw {
      message: error instanceof Error ? error.message : 'Ошибка сети',
    } satisfies ApiError
  }
}

export const apiClient = {
  getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health')
  },

  getModelInfo(): Promise<ModelInfoResponse> {
    return request<ModelInfoResponse>('/model-info')
  },

  getSampleTransaction(): Promise<SampleTransactionResponse> {
    return request<SampleTransactionResponse>('/sample-transaction')
  },

  predict(transaction: TransactionPayload): Promise<PredictResponse> {
    return request<PredictResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(transaction),
    })
  },

  predictBatch(
    transactions: TransactionFeatures[],
    threshold?: number,
  ): Promise<BatchPredictResponse> {
    const payload: {
      transactions: TransactionFeatures[]
      threshold?: number
    } = { transactions }

    if (typeof threshold === 'number') {
      payload.threshold = threshold
    }

    return request<BatchPredictResponse>('/predict/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  explain(
    transaction: TransactionFeatures,
    threshold?: number,
  ): Promise<ExplainResponse> {
    const payload: {
      transaction: TransactionFeatures
      threshold?: number
    } = { transaction }

    if (typeof threshold === 'number') {
      payload.threshold = threshold
    }

    return request<ExplainResponse>('/explain', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
