import { useState } from 'react'
import { apiClient } from '../api/client'
import type { TransactionFeatures, PredictResponse } from '../api/types'

interface FeedbackEntry {
  id: string
  transaction: TransactionFeatures
  prediction: PredictResponse
  feedback: boolean | null
  timestamp: Date
  submitted: boolean
}

export function FeedbackPanel() {
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()

  const addPredictionForFeedback = async () => {
    try {
      setLoading(true)
      setError(undefined)

      // Получаем пример транзакции
      const sampleResponse = await apiClient.getSampleTransaction()
      
      // Делаем предсказание
      const prediction = await apiClient.predict({
        ...sampleResponse.sample_transaction,
        threshold: 0.5
      })

      const newEntry: FeedbackEntry = {
        id: `feedback_${Date.now()}`,
        transaction: sampleResponse.sample_transaction,
        prediction,
        feedback: null,
        timestamp: new Date(),
        submitted: false
      }

      setFeedbackEntries(prev => [newEntry, ...prev])
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: string }).message)
        : 'Ошибка при получении предсказания'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const submitFeedback = async (entryId: string, feedback: boolean) => {
    const entry = feedbackEntries.find(e => e.id === entryId)
    if (!entry) return

    try {
      setLoading(true)
      setError(undefined)

      await apiClient.submitFeedback(
        entry.transaction,
        entry.prediction,
        feedback
      )

      // Обновляем запись
      setFeedbackEntries(prev => prev.map(e => 
        e.id === entryId 
          ? { ...e, feedback, submitted: true }
          : e
      ))

      setSuccess('Обратная связь отправлена! Спасибо за помощь в улучшении модели.')
      setTimeout(() => setSuccess(undefined), 3000)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: string }).message)
        : 'Ошибка при отправке обратной связи'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const removeFeedbackEntry = (entryId: string) => {
    setFeedbackEntries(prev => prev.filter(e => e.id !== entryId))
  }

  const getFraudScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400'
    if (score < 0.3) return 'text-green-400'
    if (score < 0.7) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getFraudScoreBg = (score: number | null) => {
    if (score === null) return 'bg-slate-500/10 border-slate-500/20'
    if (score < 0.3) return 'bg-green-500/10 border-green-500/20'
    if (score < 0.7) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">📝 Обратная связь</h2>
            <p className="mt-2 text-slate-300">
              Помогите улучшить модель, оценив правильность предсказаний
            </p>
          </div>
          <button
            onClick={addPredictionForFeedback}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ Загрузка...' : '➕ Добавить предсказание'}
          </button>
        </div>
      </div>

      {/* Уведомления */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-400">
          ✅ {success}
        </div>
      )}

      {/* Статистика */}
      {feedbackEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {feedbackEntries.length}
            </div>
            <div className="text-sm text-slate-300">Всего предсказаний</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {feedbackEntries.filter(e => e.feedback === true).length}
            </div>
            <div className="text-sm text-slate-300">Правильных</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {feedbackEntries.filter(e => e.feedback === false).length}
            </div>
            <div className="text-sm text-slate-300">Неправильных</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {feedbackEntries.filter(e => e.feedback === null).length}
            </div>
            <div className="text-sm text-slate-300">Ожидают оценки</div>
          </div>
        </div>
      )}

      {/* Список предсказаний */}
      <div className="space-y-4">
        {feedbackEntries.length === 0 ? (
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-12 text-center backdrop-blur">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Нет предсказаний для оценки
            </h3>
            <p className="text-slate-300 mb-6">
              Добавьте предсказание, чтобы начать оценивать работу модели
            </p>
            <button
              onClick={addPredictionForFeedback}
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              ➕ Добавить первое предсказание
            </button>
          </div>
        ) : (
          feedbackEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 backdrop-blur"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl border ${getFraudScoreBg(entry.prediction.fraud_score)}`}>
                    <div className={`text-lg font-bold ${getFraudScoreColor(entry.prediction.fraud_score)}`}>
                      {entry.prediction.fraud_score !== null 
                        ? `${(entry.prediction.fraud_score * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </div>
                    <div className="text-xs text-slate-400">Риск мошенничества</div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    entry.prediction.is_fraud
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {entry.prediction.is_fraud ? '🚨 МОШЕННИЧЕСТВО' : '✅ БЕЗОПАСНО'}
                  </div>

                  {entry.submitted && (
                    <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      entry.feedback === true
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {entry.feedback === true ? '👍 ПРАВИЛЬНО' : '👎 НЕПРАВИЛЬНО'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    {entry.timestamp.toLocaleString('ru-RU')}
                  </span>
                  <button
                    onClick={() => removeFeedbackEntry(entry.id)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Детали транзакции */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-sm text-slate-400">Сумма</div>
                  <div className="text-lg font-semibold text-white">
                    {entry.transaction.Amount?.toFixed(2)} ₽
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-sm text-slate-400">Уверенность</div>
                  <div className="text-lg font-semibold text-white">
                    {entry.prediction.confidence !== null 
                      ? `${(entry.prediction.confidence * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-sm text-slate-400">Уровень риска</div>
                  <div className="text-lg font-semibold text-white capitalize">
                    {entry.prediction.risk_level || 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-sm text-slate-400">Порог</div>
                  <div className="text-lg font-semibold text-white">
                    {entry.prediction.threshold}
                  </div>
                </div>
              </div>

              {/* Кнопки обратной связи */}
              {!entry.submitted && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-white mb-2">
                      Правильно ли модель определила мошенничество?
                    </h4>
                    <p className="text-sm text-slate-300 mb-4">
                      Ваша оценка поможет улучшить точность модели
                    </p>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => submitFeedback(entry.id, true)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <span className="text-xl">👍</span>
                      <span>Правильно</span>
                    </button>
                    
                    <button
                      onClick={() => submitFeedback(entry.id, false)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <span className="text-xl">👎</span>
                      <span>Неправильно</span>
                    </button>
                  </div>
                </div>
              )}

              {entry.submitted && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-slate-200">
                    <span>✅</span>
                    <span>Спасибо за обратную связь!</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Информация */}
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-3">ℹ️ Как это работает</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• Система генерирует предсказания для случайных транзакций</p>
          <p>• Вы оцениваете правильность каждого предсказания</p>
          <p>• Обратная связь используется для улучшения модели</p>
          <p>• Чем больше оценок, тем точнее становится система</p>
        </div>
      </div>
    </div>
  )
}
