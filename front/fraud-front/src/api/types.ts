import type { FeatureName } from '../lib/constants'

export type TransactionFeatures = Record<FeatureName, number>

export type TransactionPayload = TransactionFeatures & {
  threshold?: number
  Time?: number
}

export interface PredictResponse {
  fraud_score: number | null
  is_fraud: boolean | null
  confidence: number | null
  risk_level?: string
  threshold: number
  timestamp: string
  model_info?: {
    model_name?: string
    model_auc?: number | string
  }
  error?: string
}

export interface BatchPredictResponse {
  results: Array<
    PredictResponse & {
      transaction_id: number
      error?: string
    }
  >
  total_transactions: number
  threshold: number
  timestamp: string
  error?: string
}

export interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  model_loaded: boolean
  model_info: Record<string, unknown>
  version: string
  error?: string
}

export type ModelInfoResponse = Record<string, unknown> & {
  timestamp: string
  model_loaded?: boolean
  scaler_loaded?: boolean
  model_dir?: string
}

export interface SampleTransactionResponse {
  sample_transaction: TransactionFeatures
  description: string
  usage: string
  error?: string
}

export interface ExplainResponse {
  explanation: string
  fraud_score: number | null
  is_fraud: boolean | null
  confidence: number | null
  risk_level?: string
  threshold: number
  model_info?: Record<string, unknown>
  llm_enabled: boolean
  timestamp: string
  error?: string
}

export interface ApiError {
  message: string
  status?: number
}
