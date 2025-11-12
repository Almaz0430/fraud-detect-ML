import { useState } from 'react'
import { apiClient } from '../api/client'
import type { 
  TransactionFeatures, 
  EnhancedExplainResponse, 
  Language,
  SimilarCasesResponse,
  AnomaliesResponse,
  RecommendationsResponse
} from '../api/types'

const LANGUAGES: Array<{ code: Language; name: string; flag: string }> = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
]

export function EnhancedAnalysisPanel() {
  const [transaction, setTransaction] = useState<Partial<TransactionFeatures>>({})
  const [threshold, setThreshold] = useState(0.5)
  const [language, setLanguage] = useState<Language>('ru')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  
  // Результаты анализа
  const [enhancedResult, setEnhancedResult] = useState<EnhancedExplainResponse>()
  const [similarCases, setSimilarCases] = useState<SimilarCasesResponse>()
  const [anomalies, setAnomalies] = useState<AnomaliesResponse>()
  const [recommendations, setRecommendations] = useState<RecommendationsResponse>()

  const [activeTab, setActiveTab] = useState<'explanation' | 'similar' | 'anomalies' | 'recommendations'>('explanation')

  const loadSampleTransaction = async () => {
    try {
      const response = await apiClient.getSampleTransaction()
      setTransaction(response.sample_transaction)
    } catch (err) {
      setError('Не удалось загрузить пример транзакции')
    }
  }

  const runEnhancedAnalysis = async () => {
    if (!isTransactionComplete()) {
      setError('Заполните все поля транзакции')
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const fullTransaction = transaction as TransactionFeatures

      // Запускаем все анализы параллельно
      const [enhancedResponse, similarResponse, anomaliesResponse, recommendationsResponse] = await Promise.all([
        apiClient.enhancedExplain(fullTransaction, threshold, language),
        apiClient.getSimilarCases(fullTransaction, 5),
        apiClient.analyzeAnomalies(fullTransaction, threshold),
        apiClient.getRecommendations(fullTransaction, threshold, language),
      ])

      setEnhancedResult(enhancedResponse)
      setSimilarCases(similarResponse)
      setAnomalies(anomaliesResponse)
      setRecommendations(recommendationsResponse)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: string }).message)
        : 'Ошибка при выполнении анализа'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const isTransactionComplete = () => {
    const requiredFields = ['Amount', ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`)]
    return requiredFields.every(field => 
      transaction[field as keyof TransactionFeatures] !== undefined &&
      transaction[field as keyof TransactionFeatures] !== null
    )
  }

  const updateTransactionField = (field: keyof TransactionFeatures, value: string) => {
    const numValue = parseFloat(value)
    setTransaction(prev => ({
      ...prev,
      [field]: isNaN(numValue) ? undefined : numValue
    }))
  }

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20'
    }
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'immediate': return '🚨'
      case 'investigation': return '🔍'
      case 'contact': return '📞'
      case 'monitoring': return '👁️'
      case 'verification': return '✅'
      case 'limits': return '⚠️'
      default: return '💡'
    }
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8 backdrop-blur">
        <h2 className="text-2xl font-bold text-white">Расширенный AI-анализ</h2>
        <p className="mt-2 text-slate-300">
          Детальный анализ транзакций с поиском похожих случаев, анализом аномалий и рекомендациями
        </p>
      </div>

      {/* Настройки */}
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8 backdrop-blur">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Язык анализа
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Порог классификации
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadSampleTransaction}
              className="rounded-xl bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 transition-colors"
            >
              Загрузить пример
            </button>
            <button
              onClick={runEnhancedAnalysis}
              disabled={loading || !isTransactionComplete()}
              className="rounded-xl bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ Анализ...' : 'Запустить анализ'}
            </button>
          </div>
        </div>

        {/* Поля транзакции */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={transaction.Amount || ''}
              onChange={(e) => updateTransactionField('Amount', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          {Array.from({ length: 28 }, (_, i) => {
            const field = `V${i + 1}` as keyof TransactionFeatures
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-300 mb-1">{field}</label>
                <input
                  type="number"
                  step="0.000001"
                  value={transaction[field] || ''}
                  onChange={(e) => updateTransactionField(field, e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          ❌ {error}
        </div>
      )}

      {/* Результаты */}
      {(enhancedResult || similarCases || anomalies || recommendations) && (
        <div className="space-y-6">
          {/* Основные метрики */}
          {enhancedResult && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {enhancedResult.fraud_score !== null 
                    ? `${(enhancedResult.fraud_score * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-slate-300">Вероятность мошенничества</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className={`text-2xl font-bold ${enhancedResult.is_fraud ? 'text-red-400' : 'text-green-400'}`}>
                  {enhancedResult.is_fraud ? '🚨 FRAUD' : '✅ SAFE'}
                </div>
                <div className="text-sm text-slate-300">Классификация</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {enhancedResult.similar_cases.length}
                </div>
                <div className="text-sm text-slate-300">Похожих случаев</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {enhancedResult.anomalies.detected_anomalies.length}
                </div>
                <div className="text-sm text-slate-300">Аномалий обнаружено</div>
              </div>
            </div>
          )}

          {/* Табы */}
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 backdrop-blur">
            <div className="flex flex-wrap gap-2 p-6 border-b border-slate-800">
              {[
                { id: 'explanation' as const, label: '📝 Объяснение', count: enhancedResult ? 1 : 0 },
                { id: 'similar' as const, label: '🔄 Похожие случаи', count: similarCases?.total_found || 0 },
                { id: 'anomalies' as const, label: '⚠️ Аномалии', count: anomalies?.anomalies.detected_anomalies.length || 0 },
                { id: 'recommendations' as const, label: '💡 Рекомендации', count: recommendations?.recommendations.length || 0 },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label} {tab.count > 0 && `(${tab.count})`}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Объяснение */}
              {activeTab === 'explanation' && enhancedResult && (
                <div className="space-y-4">
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-slate-200 leading-relaxed">
                      {enhancedResult.explanation}
                    </div>
                  </div>
                </div>
              )}

              {/* Похожие случаи */}
              {activeTab === 'similar' && similarCases && (
                <div className="space-y-4">
                  {similarCases.similar_cases.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Похожие случаи не найдены</p>
                  ) : (
                    similarCases.similar_cases.map((case_, index) => (
                      <div key={case_.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-300">#{index + 1}</span>
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              case_.is_fraud 
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}>
                              {case_.is_fraud ? 'МОШЕННИЧЕСТВО' : 'ЛЕГИТИМНАЯ'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400">
                            Риск: {(case_.risk_score * 100).toFixed(1)}%
                          </div>
                        </div>
                        <p className="text-slate-200 mb-2">{case_.description}</p>
                        <div className="text-xs text-slate-400">
                          Тип паттерна: {case_.pattern_type}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Аномалии */}
              {activeTab === 'anomalies' && anomalies && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`px-3 py-1 rounded-lg text-sm font-medium border ${getSeverityColor(anomalies.anomalies.severity_level)}`}>
                      Уровень: {anomalies.anomalies.severity_level.toUpperCase()}
                    </div>
                    <div className="text-sm text-slate-300">
                      Скор аномалий: {(anomalies.anomalies.anomaly_score * 100).toFixed(1)}%
                    </div>
                  </div>

                  {anomalies.anomalies.detected_anomalies.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Аномалии не обнаружены</p>
                  ) : (
                    <div className="space-y-3">
                      {anomalies.anomalies.detected_anomalies.map((anomaly, index) => (
                        <div key={index} className={`rounded-xl border p-4 ${getSeverityColor(anomaly.severity)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{anomaly.type}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(anomaly.severity)}`}>
                              {anomaly.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm opacity-90">{anomaly.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {anomalies.anomalies.pattern_types.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Типы паттернов:</h4>
                      <div className="flex flex-wrap gap-2">
                        {anomalies.anomalies.pattern_types.map((pattern, index) => (
                          <span key={index} className="px-3 py-1 rounded-lg bg-slate-700 text-slate-200 text-sm">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Рекомендации */}
              {activeTab === 'recommendations' && recommendations && (
                <div className="space-y-4">
                  {recommendations.recommendations.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Рекомендации не найдены</p>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.recommendations.map((rec, index) => (
                        <div key={index} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getRecommendationIcon(rec.type)}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs font-medium">
                                  {rec.type.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-slate-200">{rec.action}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
