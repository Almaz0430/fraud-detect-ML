import { useEffect, useState } from 'react'
import { apiClient } from './api/client'
import type { HealthResponse, ModelInfoResponse } from './api/types'
import { StatusOverview } from './components/StatusOverview'
import { SinglePredictionPanel } from './components/SinglePredictionPanel'
import { BatchPredictionPanel } from './components/BatchPredictionPanel'
import { CyberBackground } from './components/CyberBackground'

type TabId = 'status' | 'single' | 'batch'

const tabs: Array<{ id: TabId; label: string; description: string }> = [
  {
    id: 'status',
    label: 'Мониторинг',
    description: 'Состояние API и модели',
  },
  {
    id: 'single',
    label: 'Одиночный анализ',
    description: 'Проверка одной транзакции',
  },
  {
    id: 'batch',
    label: 'Пакетный анализ',
    description: 'Анализ массива транзакций',
  },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('status')
  const [health, setHealth] = useState<HealthResponse>()
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const refreshStatus = async () => {
    setLoading(true)
    setError(undefined)
    try {
      const [healthResponse, modelInfoResponse] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getModelInfo(),
      ])
      setHealth(healthResponse)
      setModelInfo(modelInfoResponse)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Не удалось получить данные от API'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshStatus()
  }, [])

  return (
    <div className="relative min-h-screen bg-slate-950/95 text-slate-100">
      <CyberBackground />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10">
        <header className="rounded-3xl border border-slate-800/70 bg-slate-900/60 px-8 py-10 shadow-2xl shadow-slate-950/50 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">
                Fraud Insight
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Детекция мошенничества
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-300">
                Интерфейс для контроля состояния модели, проверки транзакций и пакетного анализа.
              </p>
            </div>
          </div>
          <nav className="mt-8 flex flex-wrap gap-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative overflow-hidden rounded-2xl border px-5 py-3 text-left transition ${
                    isActive
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 shadow-lg shadow-emerald-900/40'
                      : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className="mt-1 block text-xs text-slate-400">{tab.description}</span>
                </button>
              )
            })}
          </nav>
        </header>

        <main className="flex flex-1 flex-col gap-10 pb-12">
          {activeTab === 'status' ? (
            <StatusOverview
              health={health}
              modelInfo={modelInfo}
              loading={loading}
              error={error}
              onRefresh={refreshStatus}
            />
          ) : null}

          {activeTab === 'single' ? <SinglePredictionPanel /> : null}

          {activeTab === 'batch' ? <BatchPredictionPanel /> : null}
        </main>

        <footer className="border-t border-slate-800/60 py-6 text-sm text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Fraud Detection ML</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
