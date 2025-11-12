// Определяем типы признаков транзакции
export type FeatureName = 
  | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10'
  | 'V11' | 'V12' | 'V13' | 'V14' | 'V15' | 'V16' | 'V17' | 'V18' | 'V19' | 'V20'
  | 'V21' | 'V22' | 'V23' | 'V24' | 'V25' | 'V26' | 'V27' | 'V28'
  | 'Amount' | 'Time'

export type TransactionFeatures = Record<Exclude<FeatureName, 'Time'>, number> & {
  Time?: number
}

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

// Новые типы для расширенных функций
export interface EnhancedExplainResponse {
  explanation: string
  similar_cases: Array<{
    id: string
    description: string
    pattern_type: string
    risk_score: number
    is_fraud: boolean
  }>
  anomalies: {
    detected_anomalies: Array<{
      type: string
      description: string
      severity: 'low' | 'medium' | 'high'
    }>
    severity_level: 'low' | 'medium' | 'high'
    anomaly_score: number
    pattern_types: string[]
  }
  recommendations: Array<{
    type: string
    action: string
  }>
  fraud_score: number | null
  is_fraud: boolean | null
  confidence: number | null
  risk_level?: string
  threshold: number
  language: string
  timestamp: string
  error?: string
}

export interface SimilarCasesResponse {
  similar_cases: Array<{
    id: string
    description: string
    pattern_type: string
    risk_score: number
    is_fraud: boolean
    transaction: TransactionFeatures
  }>
  total_found: number
  timestamp: string
  error?: string
}

export interface AnomaliesResponse {
  anomalies: {
    detected_anomalies: Array<{
      type: string
      description: string
      severity: 'low' | 'medium' | 'high'
    }>
    severity_level: 'low' | 'medium' | 'high'
    anomaly_score: number
    pattern_types: string[]
  }
  fraud_score: number | null
  is_fraud: boolean | null
  timestamp: string
  error?: string
}

export interface RecommendationsResponse {
  recommendations: Array<{
    type: string
    action: string
  }>
  fraud_score: number | null
  is_fraud: boolean | null
  risk_level?: string
  language: string
  timestamp: string
  error?: string
}

export interface FeedbackResponse {
  message: string
  feedback: boolean
  timestamp: string
  error?: string
}

export interface ChatResponse {
  response: string
  suggestions: string[]
  session_id: string
  timestamp: string
  error?: string
}

export interface ChatStatsResponse {
  total_sessions: number
  active_sessions: number
  languages: string[]
  modes: string[]
}

export type Language = 'ru' | 'en' | 'kk'

export interface ApiError {
  message: string
  status?: number
}
