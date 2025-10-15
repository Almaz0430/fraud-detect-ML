import type { HealthResponse, ModelInfoResponse } from '../api/types'
import { formatTimestamp, getStatusTone } from '../lib/utils'

const FRIENDLY_MODEL_KEYS = new Map<string, string>([
  ['model_name', 'Название модели'],
  ['model_auc', 'ROC-AUC'],
  ['feature_count', 'Количество признаков'],
])

interface StatusOverviewProps {
  health?: HealthResponse
  modelInfo?: ModelInfoResponse
  loading: boolean
  error?: string
  onRefresh: () => void
}

export function StatusOverview({
  health,
  modelInfo,
  loading,
  error,
  onRefresh,
}: StatusOverviewProps) {
  const friendlyInfo = modelInfo
    ? Object.entries(modelInfo).filter(([key]) => FRIENDLY_MODEL_KEYS.has(key))
    : []

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Состояние сервиса</h2>
          <p className="mt-1 text-sm text-slate-400">
            Проверьте доступность API и статус модели перед началом работы.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-emerald-950/40"
        >
          {loading ? 'Обновление…' : 'Обновить данные'}
        </button>
      </header>

      <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-4 text-sm text-amber-100">
        Если видите статус «Недоступно», обновите страницу.
        При повторяющейся ошибке обратитесь к администратору или разработчику.
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Статус сервиса</h3>
              <p className="mt-1 text-xs text-slate-400">
                Последняя проверка: {formatTimestamp(health?.timestamp)}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(
                health?.status === 'ok',
              )}`}
            >
              {health?.status === 'ok' ? 'Работает' : 'Недоступно'}
            </span>
          </div>
          <dl className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Модель загружена</dt>
              <dd className="font-medium">
                {health?.model_loaded ? 'Да' : 'Нет'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Версия сервиса</dt>
              <dd className="font-medium">{health?.version ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
          <h3 className="text-lg font-semibold text-slate-100">Качество модели</h3>
          <p className="mt-1 text-xs text-slate-400">
            Ключевые метрики помогают понять, насколько уверенно работает алгоритм.
          </p>
          <dl className="mt-6 space-y-4">
            {friendlyInfo.length
              ? friendlyInfo.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/80 px-4 py-3"
                  >
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      {FRIENDLY_MODEL_KEYS.get(key)}
                    </dt>
                    <dd className="mt-1 text-sm text-slate-200">
                      {typeof value === 'number'
                        ? value.toLocaleString('ru-RU', {
                            maximumFractionDigits: 4,
                          })
                        : String(value)}
                    </dd>
                  </div>
                ))
              : !loading && (
                  <p className="text-sm text-slate-400">
                    Метрики пока не загружены. Это не мешает работе, но позволит лучше оценить
                    точность модели.
                  </p>
                )}
          </dl>
        </div>
      </div>
    </section>
  )
}
