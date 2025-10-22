import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import type { BatchPredictResponse, TransactionFeatures } from '../api/types'
import { FEATURE_NAMES, DEFAULT_TRANSACTION } from '../lib/constants'
import { formatNumber, formatTimestamp, getRiskTone } from '../lib/utils'

type InputMode = 'file' | 'json'

const DEFAULT_BATCH_PAYLOAD = JSON.stringify([DEFAULT_TRANSACTION], null, 2)

function parseCsv(content: string): TransactionFeatures[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    throw new Error('Файл пустой — добавьте хотя бы одну строку с данными')
  }

  const headers = lines[0].split(',').map((h) => h.trim())
  const missingColumns = FEATURE_NAMES.filter((feature) => !headers.includes(feature))
  if (missingColumns.length) {
    throw new Error(`Не найдены колонки: ${missingColumns.join(', ')}`)
  }

  const indexMap = FEATURE_NAMES.map((feature) => headers.indexOf(feature))
  const transactions: TransactionFeatures[] = []

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex]
    if (!rawLine) continue
    const cells = rawLine.split(',').map((value) => value.trim())
    const transaction = {} as TransactionFeatures

    FEATURE_NAMES.forEach((feature, featureIndex) => {
      const cell = cells[indexMap[featureIndex]]
      const value = Number(cell)
      if (Number.isNaN(value)) {
        throw new Error(
          `Строка ${lineIndex + 1}: значение "${cell}" в колонке ${feature} должно быть числом`,
        )
      }
      transaction[feature] = value
    })

    transactions.push(transaction)
  }

  if (!transactions.length) {
    throw new Error('Данные не найдены: проверьте, что файл содержит строки кроме заголовка')
  }

  if (transactions.length > 100) {
    throw new Error('Максимум 100 транзакций за один запуск анализа')
  }

  return transactions
}

function createCsvTemplate(): string {
  const header = FEATURE_NAMES.join(',')
  const sampleRow = FEATURE_NAMES.map((feature) => DEFAULT_TRANSACTION[feature]).join(',')
  return `${header}\n${sampleRow}\n`
}

export function BatchPredictionPanel() {
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [jsonValue, setJsonValue] = useState<string>(DEFAULT_BATCH_PAYLOAD)
  const [parsedTransactions, setParsedTransactions] = useState<TransactionFeatures[] | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [threshold, setThreshold] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BatchPredictResponse | null>(null)

  const previewCount = parsedTransactions?.length ?? 0

  const templateHref = useMemo(() => {
    const csv = createCsvTemplate()
    return URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  }, [])

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(templateHref)
    }
  }, [templateHref])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFileName(file.name)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const text = await file.text()
      const transactions = parseCsv(text)
      setParsedTransactions(transactions)
    } catch (err) {
      setParsedTransactions(null)
      setError(err instanceof Error ? err.message : 'Не удалось обработать CSV-файл')
    } finally {
      setLoading(false)
    }
  }

  const handleJsonSubmit = () => {
    const parsed = JSON.parse(jsonValue)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Ожидается массив транзакций — добавьте хотя бы один объект')
    }

    if (parsed.length > 100) {
      throw new Error('Максимум 100 транзакций за один запуск анализа')
    }

    return parsed.map((transaction, idx): TransactionFeatures => {
      const missing = FEATURE_NAMES.filter((feature) => !(feature in transaction))
      if (missing.length) {
        throw new Error(`Транзакция #${idx + 1} не содержит признаки: ${missing.join(', ')}`)
      }

      const cleaned = FEATURE_NAMES.reduce<TransactionFeatures>((acc, feature) => {
        const value = Number(transaction[feature])
        if (Number.isNaN(value)) {
          throw new Error(`Признак ${feature} в транзакции #${idx + 1} должен быть числом`)
        }
        acc[feature] = value
        return acc
      }, {} as TransactionFeatures)

      return cleaned
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const transactions =
        inputMode === 'file'
          ? (() => {
              if (!parsedTransactions || !parsedTransactions.length) {
                throw new Error('Загрузите CSV-файл или переключитесь в режим JSON')
              }
              return parsedTransactions
            })()
          : handleJsonSubmit()

      const response = await apiClient.predictBatch(transactions, threshold)

      if (response.error) {
        throw new Error(response.error)
      }

      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка пакетного предсказания')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-100">Пакетная проверка</h2>
        <p className="text-sm text-slate-400">
          Загрузите CSV c выгрузкой транзакций или вставьте JSON вручную. Модель обработает до 100
          строк за один запрос.
        </p>
      </header>

      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-sm text-emerald-100">
        1. Скачайте шаблон с нужными колонками. 2. Подставьте значения из вашей системы (каждая
        строка — отдельная транзакция). 3. Загрузите файл и нажмите «Запустить анализ». Для
        автоматизации можно использовать режим JSON и интегрировать собственный скрипт.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 ${
              inputMode === 'file'
                ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:text-white'
            }`}
          >
            Загрузка CSV
          </button>
          <button
            type="button"
            onClick={() => setInputMode('json')}
            className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 ${
              inputMode === 'json'
                ? 'border-sky-400/60 bg-sky-500/10 text-sky-100'
                : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:text-white'
            }`}
          >
            Вставка JSON
          </button>
          <a
            href={templateHref}
            download="fraud-transactions-template.csv"
            className="inline-flex items-center rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Скачать шаблон CSV
          </a>
        </div>

        {inputMode === 'file' ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/60">
            <h3 className="text-lg font-semibold text-slate-100">Загрузка файла</h3>
            <p className="mt-1 text-sm text-slate-400">
              Используйте CSV в кодировке UTF-8. Заголовок должен содержать: {FEATURE_NAMES.join(', ')}.
            </p>
            <label className="mt-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-100">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-base font-semibold">
                {uploadedFileName ? uploadedFileName : 'Нажмите или перетащите CSV-файл сюда'}
              </span>
              {previewCount ? (
                <span className="mt-2 text-xs text-emerald-300">
                  Загружено транзакций: {previewCount}
                </span>
              ) : (
                <span className="mt-2 text-xs text-slate-500">
                  После загрузки появится количество записей
                </span>
              )}
            </label>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">JSON с транзакциями</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  Каждый объект должен содержать признаки {FEATURE_NAMES.join(', ')}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJsonValue(DEFAULT_BATCH_PAYLOAD)}
                className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-emerald-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                Вставить шаблон
              </button>
            </div>
            <textarea
              value={jsonValue}
              onChange={(event) => setJsonValue(event.target.value)}
              rows={16}
              spellCheck={false}
              className="mt-5 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              placeholder='[\n  {"V1": 0.0, "V2": 0.0, ..., "Amount": 0.0}\n]'
            />
          </div>
        )}

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/50">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Порог классификации</span>
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
          </label>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 px-8 py-3 text-base font-semibold text-cyan-950 shadow-lg shadow-cyan-900/40 transition hover:from-cyan-400 hover:via-sky-400 hover:to-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Анализ…' : 'Запустить пакетный анализ'}
        </button>
      </form>

      {result ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Сводка результатов</h3>
              <p className="text-xs text-slate-500">
                Обработано записей: {result.total_transactions}. Порог —{' '}
                {formatNumber(result.threshold, { fractionDigits: 2 })}. Отчёт от{' '}
                {formatTimestamp(result.timestamp)}.
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Вероятность</th>
                  <th className="px-4 py-3 text-left">Уровень риска</th>
                  <th className="px-4 py-3 text-left">Уверенность</th>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left">Комментарий</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {result.results.map((item) => (
                  <tr key={item.transaction_id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 font-medium text-slate-300">
                      {item.transaction_id + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {formatNumber(item.fraud_score, { fractionDigits: 4 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-xs">
                        {item.risk_level ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(item.confidence, { fractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getRiskTone(item.fraud_score)}`}
                      >
                        {item.is_fraud ? 'Подозрительно' : 'ОК'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.error ? (
                        <span className="text-rose-300">{item.error}</span>
                      ) : item.is_fraud ? (
                        'Рекомендуется ручная проверка'
                      ) : (
                        'Проверка не требует действий'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
