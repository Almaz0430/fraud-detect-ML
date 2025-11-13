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
  EnhancedExplainResponse,
  SimilarCasesResponse,
  AnomaliesResponse,
  RecommendationsResponse,
  FeedbackResponse,
  ChatResponse,
  ChatStatsResponse,
  Language,
} from './types'

const API_BASE_URL = ''.replace(/\/$/, '')
// const API_BASE_URL = 'http://127.0.0.1:5000'

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

  // Новые методы для расширенных функций
  enhancedExplain(
    transaction: TransactionFeatures,
    threshold?: number,
    language: Language = 'ru',
  ): Promise<EnhancedExplainResponse> {
    const payload: {
      transaction: TransactionFeatures
      threshold?: number
      language: Language
    } = { transaction, language }

    if (typeof threshold === 'number') {
      payload.threshold = threshold
    }

    return request<EnhancedExplainResponse>('/explain/enhanced', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getSimilarCases(
    transaction: TransactionFeatures,
    topK: number = 5,
  ): Promise<SimilarCasesResponse> {
    const payload = {
      transaction,
      top_k: topK,
    }

    return request<SimilarCasesResponse>('/similar-cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  analyzeAnomalies(
    transaction: TransactionFeatures,
    threshold?: number,
  ): Promise<AnomaliesResponse> {
    const payload: {
      transaction: TransactionFeatures
      threshold?: number
    } = { transaction }

    if (typeof threshold === 'number') {
      payload.threshold = threshold
    }

    return request<AnomaliesResponse>('/analyze-anomalies', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getRecommendations(
    transaction: TransactionFeatures,
    threshold?: number,
    language: Language = 'ru',
  ): Promise<RecommendationsResponse> {
    const payload: {
      transaction: TransactionFeatures
      threshold?: number
      language: Language
    } = { transaction, language }

    if (typeof threshold === 'number') {
      payload.threshold = threshold
    }

    return request<RecommendationsResponse>('/recommendations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  submitFeedback(
    transaction: TransactionFeatures,
    predictionResult: any,
    feedback: boolean,
  ): Promise<FeedbackResponse> {
    const payload = {
      transaction,
      prediction_result: predictionResult,
      feedback,
    }

    return request<FeedbackResponse>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  chat(
    message: string,
    sessionId: string,
    language: Language = 'ru',
    transactionContext?: {
      transaction: TransactionFeatures
      result: any
    },
  ): Promise<ChatResponse> {
    const payload: {
      message: string
      session_id: string
      language: Language
      transaction_context?: any
    } = {
      message,
      session_id: sessionId,
      language,
    }

    if (transactionContext) {
      payload.transaction_context = transactionContext
    }

    return request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getChatStats(): Promise<ChatStatsResponse> {
    return request<ChatStatsResponse>('/chat/stats')
  },

  clearChatSession(sessionId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/chat/clear/${sessionId}`, {
      method: 'DELETE',
    })
  },
}
