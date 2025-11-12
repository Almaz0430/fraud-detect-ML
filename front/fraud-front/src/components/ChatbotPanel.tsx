import { useState, useRef, useEffect } from 'react'
import { apiClient } from '../api/client'
import type { Language, TransactionFeatures } from '../api/types'

const LANGUAGES: Array<{ code: Language; name: string; flag: string }> = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatbotPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [language, setLanguage] = useState<Language>('ru')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [transactionContext, setTransactionContext] = useState<{
    transaction: TransactionFeatures
    result: any
  } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Приветственное сообщение при загрузке
    const welcomeMessages: Record<Language, string> = {
      ru: 'Привет! Я AI-ассистент по детекции мошенничества. Могу помочь с анализом транзакций, объяснить работу системы или дать советы по безопасности. О чем хотите узнать?',
      en: 'Hello! I\'m an AI assistant for fraud detection. I can help analyze transactions, explain how the system works, or provide security advice. What would you like to know?',
      kk: 'Сәлем! Мен алаяқтықты анықтау бойынша AI-көмекшімін. Транзакцияларды талдауға, жүйенің жұмысын түсіндіруге немесе қауіпсіздік бойынша кеңес беруге көмектесе аламын. Не туралы білгіңіз келеді?'
    }

    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessages[language],
      timestamp: new Date()
    }])

    // Начальные предложения
    const initialSuggestions: Record<Language, string[]> = {
      ru: [
        'Как работает система детекции мошенничества?',
        'Что означают признаки V1-V28?',
        'Как защитить себя от мошенников?',
        'Какие факторы влияют на оценку риска?'
      ],
      en: [
        'How does the fraud detection system work?',
        'What do features V1-V28 mean?',
        'How to protect myself from fraudsters?',
        'What factors affect risk assessment?'
      ],
      kk: [
        'Алаяқтықты анықтау жүйесі қалай жұмыс істейді?',
        'V1-V28 белгілері не дегенді білдіреді?',
        'Алаяқтардан қалай қорғануға болады?',
        'Тәуекелді бағалауға қандай факторлар әсер етеді?'
      ]
    }
    
    setSuggestions(initialSuggestions[language])
  }, [language])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    try {
      const response = await apiClient.chat(
        message.trim(),
        sessionId,
        language,
        transactionContext || undefined
      )

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setSuggestions(response.suggestions)
    } catch (error) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте переформулировать вопрос.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  const loadSampleTransaction = async () => {
    try {
      const sampleResponse = await apiClient.getSampleTransaction()
      const predictResponse = await apiClient.predict({
        ...sampleResponse.sample_transaction,
        threshold: 0.5
      })

      setTransactionContext({
        transaction: sampleResponse.sample_transaction,
        result: predictResponse
      })

      const contextMessage = language === 'ru' 
        ? `Загружен контекст транзакции. Сумма: ${sampleResponse.sample_transaction.Amount}, Риск: ${(predictResponse.fraud_score || 0 * 100).toFixed(1)}%. Теперь можете задавать вопросы об этой транзакции.`
        : language === 'en'
        ? `Transaction context loaded. Amount: ${sampleResponse.sample_transaction.Amount}, Risk: ${(predictResponse.fraud_score || 0 * 100).toFixed(1)}%. You can now ask questions about this transaction.`
        : `Транзакция контексті жүктелді. Сома: ${sampleResponse.sample_transaction.Amount}, Тәуекел: ${(predictResponse.fraud_score || 0 * 100).toFixed(1)}%. Енді осы транзакция туралы сұрақтар қоя аласыз.`

      const contextMsg: Message = {
        id: `context_${Date.now()}`,
        role: 'assistant',
        content: contextMessage,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, contextMsg])
    } catch (error) {
      console.error('Failed to load transaction context:', error)
    }
  }

  const clearChat = async () => {
    try {
      await apiClient.clearChatSession(sessionId)
      setMessages([])
      setTransactionContext(null)
      setSuggestions([])
      
      // Перезапускаем с приветствием
      const welcomeMessages: Record<Language, string> = {
        ru: 'Чат очищен. Как могу помочь?',
        en: 'Chat cleared. How can I help?',
        kk: 'Чат тазартылды. Қалай көмектесе аламын?'
      }

      setMessages([{
        id: 'cleared',
        role: 'assistant',
        content: welcomeMessages[language],
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Failed to clear chat:', error)
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">🤖 AI Чат-бот</h2>
            <p className="mt-2 text-slate-300">
              Задавайте вопросы о системе детекции мошенничества и получайте экспертные ответы
            </p>
          </div>
          <div className="flex items-center gap-4">
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
        </div>
      </div>

      {/* Чат */}
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 backdrop-blur overflow-hidden">
        {/* Панель управления */}
        <div className="border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-slate-300">Онлайн</span>
            {transactionContext && (
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs">
                📊 Контекст транзакции загружен
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadSampleTransaction}
              className="px-3 py-1 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600 transition-colors"
            >
              📋 Загрузить транзакцию
            </button>
            <button
              onClick={clearChat}
              className="px-3 py-1 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600 transition-colors"
            >
              🗑️ Очистить
            </button>
          </div>
        </div>

        {/* Сообщения */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div className={`text-xs mt-2 opacity-70 ${
                  message.role === 'user' ? 'text-emerald-100' : 'text-slate-400'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">Печатает...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Предложения */}
        {suggestions.length > 0 && (
          <div className="border-t border-slate-800 p-4">
            <div className="text-sm text-slate-400 mb-2">💡 Предлагаемые вопросы:</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ввод сообщения */}
        <div className="border-t border-slate-800 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                language === 'ru' ? 'Введите ваш вопрос...' :
                language === 'en' ? 'Enter your question...' :
                'Сұрағыңызды енгізіңіз...'
              }
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="rounded-xl bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳' : '📤'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
