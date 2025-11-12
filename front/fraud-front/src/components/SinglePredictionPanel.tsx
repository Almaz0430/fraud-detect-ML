import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import type {
  PredictResponse,
  SampleTransactionResponse,
  TransactionFeatures,
} from '../api/types'
import { FEATURE_NAMES, type FeatureName, DEFAULT_TRANSACTION } from '../lib/constants'
import { formatNumber, formatTimestamp, getRiskTone } from '../lib/utils'

type TransactionFormState = Record<FeatureName, string>

const ADVANCED_FEATURES = FEATURE_NAMES.filter((feature) => feature !== 'Amount')

const FEATURE_LABELS: Record<FeatureName, string> = FEATURE_NAMES.reduce(
  (acc, feature) => {
    if (feature === 'Amount') {
      acc[feature] = 'Amount — сумма операции'
    } else {
      const index = Number(feature.replace('V', ''))
      acc[feature] = `${feature} — PCA-компонента №${index}`
    }
    return acc
  },
  {} as Record<FeatureName, string>,
)

const PCA_DESCRIPTIONS = [
  'Агрегирует общую активность клиента по операциям.',
  'Дополняет профиль поведения и временных паттернов.',
  'Отражает взаимосвязь суммы и типовых сценариев клиента.',
  'Фиксирует последовательность операций во времени.',
  'Анализирует нехарактерные комбинации признаков.',
  'Корректирует влияние резких изменений поведения.',
  'Учитывает стабильность каналов оплаты.',
  'Отражает взаимосвязь между частотой и объемом платежей.',
  'Сигнализирует о всплесках активности по устройствам.',
  'Показывает отклонения от обычной географии операций.',
  'Улавливает связи между суммой и временем суток.',
  'Фокусируется на цикличности повторяющихся платежей.',
  'Помогает выявить редкие схемы транзакций.',
  'Фильтрует случайные выбросы и шум.',
  'Нормализует влияние сразу нескольких исходных признаков.',
  'Отвечает за баланс «день/ночь» и частоту попыток.',
  'Взвешивает отличие от недавней истории клиента.',
  'Улавливает уточняющие связи между признаками.',
  'Отражает корреляцию с каналами ввода данных.',
  'Соотносит транзакцию с типовой скоростью операций.',
  'Выделяет устойчивые паттерны риска.',
  'Обнаруживает совместные изменения нескольких метрик.',
  'Отражает вероятность последовательных попыток.',
  'Ищет редкие комбинации поведенческих характеристик.',
  'Отвечает за комплексную оценку временных лагов.',
  'Сглаживает разовые всплески активности.',
  'Дополняет модель информации о частоте сценариев.',
  'Финализирует профиль клиента c учётом недавних данных.',
]

const FEATURE_DESCRIPTIONS: Record<FeatureName, string> = FEATURE_NAMES.reduce(
  (acc, feature) => {
    if (feature === 'Amount') {
      acc[feature] =
        'Сумма операции указывается в тысячах долларах.'
    } else {
      const index = Number(feature.replace('V', '')) - 1
      acc[feature] = `${PCA_DESCRIPTIONS[index]} Значение рассчитывается автоматически аналитическим пайплайном; вручную его обычно не изменяют.`
    }
    return acc
  },
  {} as Record<FeatureName, string>,
)

function toStringState(transaction: TransactionFeatures): TransactionFormState {
  return FEATURE_NAMES.reduce<TransactionFormState>(
    (acc, feature) => {
      acc[feature] = transaction[feature]?.toString() ?? ''
      return acc
    },
    {} as TransactionFormState,
  )
}

export function SinglePredictionPanel() {
  const [formState, setFormState] = useState<TransactionFormState>(() =>
    toStringState(DEFAULT_TRANSACTION),
  )
  const [threshold, setThreshold] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<TransactionFeatures | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explanationError, setExplanationError] = useState<string | null>(null)
  const [explanationLoading, setExplanationLoading] = useState(false)
  const [llmEnabled, setLlmEnabled] = useState<boolean | null>(null)

  const formattedExplanation = useMemo(() => {
    if (!explanation) return null
    return explanation
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^\s*\*\s+/gm, '• ')
      .replace(/^\s*-\s+/gm, '• ')
  }, [explanation])

  const handleInputChange = (feature: FeatureName, value: string) => {
    setFormState((prev) => ({ ...prev, [feature]: value }))
  }

  const handleRestoreDefaults = () => {
    setFormState(toStringState(DEFAULT_TRANSACTION))
    setResult(null)
    setError(null)
    setExplanation(null)
    setExplanationError(null)
    setLlmEnabled(null)
    setLastTransaction(null)
  }

  const handleFillSample = async () => {
    setLoading(true)
    setError(null)
    try {
      const sample: SampleTransactionResponse = await apiClient.getSampleTransaction()
      setFormState(toStringState(sample.sample_transaction))
      setResult(null)
      setExplanation(null)
      setExplanationError(null)
      setLlmEnabled(null)
      setLastTransaction(null)
    } catch (err) {
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Не удалось получить пример транзакции',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const transaction = FEATURE_NAMES.reduce<TransactionFeatures>((acc, feature) => {
        const value = formState[feature]
        if (value === undefined || value === null || value === '') {
          throw new Error(
            showAdvanced
              ? `Заполните поле ${feature}`
              : 'Заполните сумму транзакции или используйте «Вернуть рекомендованные значения».',
          )
        }
        const parsed = Number(value)
        if (Number.isNaN(parsed)) {
          throw new Error(`Поле ${feature} должно быть числом`)
        }
        acc[feature] = parsed
        return acc
      }, {} as TransactionFeatures)

      const response = await apiClient.predict({
        ...transaction,
        threshold,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      setResult(response)
      setLastTransaction(transaction)
      setExplanation(null)
      setExplanationError(null)
      setLlmEnabled(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить предсказание')
    } finally {
      setLoading(false)
    }
  }

  const handleExplain = async () => {
    if (!result || !lastTransaction) {
      setExplanationError('Сначала выполните предсказание для транзакции.')
      return
    }
    setExplanationLoading(true)
    setExplanationError(null)
    try {
      const response = await apiClient.explain(lastTransaction, result.threshold ?? threshold)
      if (response.error) {
        throw new Error(response.error)
      }
      setExplanation(response.explanation)
      setLlmEnabled(response.llm_enabled)
    } catch (err) {
      setExplanationError(err instanceof Error ? err.message : 'Не удалось получить объяснение')
    } finally {
      setExplanationLoading(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-100">Проверка отдельной транзакции</h2>
        <p className="text-sm text-slate-400">
          Сервис подставляет скрытые признаки автоматически. Вам нужно изменить только сумму и при
          необходимости порог срабатывания.
        </p>
      </header>

      <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-6 py-4 text-sm text-sky-100">
        Совет: нажмите «Вернуть рекомендованные значения», затем измените сумму транзакции. Для
        теста можно получить пример из API. Полный список признаков доступен в расширенном режиме,
        его не требуется заполнять вручную.
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRestoreDefaults}
          className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-400 hover:text-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
        >
          Вернуть рекомендованные значения
        </button>
        <button
          type="button"
          onClick={handleFillSample}
          disabled={loading}
          className="inline-flex items-center rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-100 transition hover:border-teal-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Загрузка примера…' : 'Получить пример из API'}
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="inline-flex items-center rounded-lg border border-slate-700/80 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
        >
          {showAdvanced ? 'Скрыть расширенный режим' : 'Показать расширенный режим'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
          <h3 className="text-lg font-semibold text-slate-100">Основные параметры</h3>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Сумма транзакции (Amount)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={formState.Amount}
                onChange={(event) => handleInputChange('Amount', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                placeholder="Например, 149.62"
                required
              />
              <p className="text-xs text-slate-400">{FEATURE_DESCRIPTIONS.Amount}</p>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Порог срабатывания</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="accent-emerald-400"
              />
              <p className="text-xs text-slate-400">
                Значения выше {threshold.toFixed(2)} будут отмечены как потенциальное мошенничество.
              </p>
            </label>
          </div>
        </div>

        {showAdvanced ? (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
            <h3 className="text-lg font-semibold text-slate-100">
              Расширенный режим ({ADVANCED_FEATURES.length} признаков)
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Каждый показатель V1–V28 — компонент метода главных компонент (PCA). Это «сжатые»
              признаки, которые формируются в аналитическом пайплайне. Их обычно не вводят вручную —
              изменяйте значения только если точно знаете исходные данные.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ADVANCED_FEATURES.map((feature) => (
                <label key={feature} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {FEATURE_LABELS[feature]}
                  </span>
                  <span className="text-[11px] text-slate-500">{FEATURE_DESCRIPTIONS[feature]}</span>
                  <input
                    type="number"
                    step="any"
                    value={formState[feature]}
                    onChange={(event) => handleInputChange(feature, event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    placeholder="0.0"
                    required
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 px-8 py-3 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 transition hover:from-emerald-400 hover:via-teal-300 hover:to-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Расчёт…' : 'Выполнить предсказание'}
          </button>
          {result ? (
            <span className="text-sm text-slate-400">
              Последний расчёт: {formatTimestamp(result.timestamp)}
            </span>
          ) : null}
        </div>
      </form>

      {result ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/60">
          <h3 className="text-lg font-semibold text-slate-100">Результат</h3>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-5">
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Вероятность мошенничества
              </p>
              <p className="mt-3 text-4xl font-semibold text-white">
                {formatNumber(result.fraud_score, { fractionDigits: 4 })}
              </p>
              <span
                className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getRiskTone(
                  result.fraud_score,
                )}`}
              >
                {result.is_fraud ? 'Проверьте транзакцию' : 'Риск низкий'}
              </span>
              <p className="mt-4 text-xs text-slate-500">
                Уверенность модели: {formatNumber(result.confidence, { fractionDigits: 2 })}. Если показатель выше 0.7 —
                инициируйте дополнительную проверку клиента.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-5 space-y-3 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Уровень риска</span>
                <span className="font-medium">{result.risk_level ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Порог</span>
                <span className="font-medium">{formatNumber(result.threshold, { fractionDigits: 2 })}</span>
              </div>
              {result.model_info ? (
                Object.entries(result.model_info).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <span className="text-slate-400">{key}</span>
                    <span className="font-medium">
                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">
                  Метрики модели недоступны. Это не мешает работе, но помогает объяснять результаты.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-5 shadow-inner shadow-emerald-900/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-emerald-100">
                  Объяснение решения
                </h4>
                <p className="text-xs text-slate-400">
                  AI-аналитик объяснит, почему модель выставила такой риск и какие шаги рекомендованы.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExplain}
                disabled={explanationLoading}
                className="inline-flex items-center rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {explanationLoading
                  ? 'Генерация объяснения…'
                  : explanation
                    ? 'Обновить объяснение'
                    : 'Получить объяснение'}
              </button>
            </div>

            {explanationError ? (
              <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {explanationError}
              </div>
            ) : null}

            {llmEnabled === false ? (
              <p className="mt-4 text-sm text-amber-200">
                Gemini недоступен: проверьте переменную окружения `GEMINI_API_KEY` и перезапустите
                сервер.
              </p>
            ) : null}

            {formattedExplanation ? (
              <div className="mt-4 whitespace-pre-wrap rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-50 shadow-inner shadow-emerald-900/20">
                {formattedExplanation}
              </div>
            ) : (
              !explanationLoading && (
                <p className="mt-4 text-sm text-slate-400">
                  Нажмите «Получить объяснение», чтобы AI детально описал, почему операция признана
                  {' '}
                  {result.is_fraud ? 'подозрительной.' : 'безопасной.'}
                </p>
              )
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
