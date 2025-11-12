"""
Conversational AI чат-бот для вопросов о транзакциях и мошенничестве.

Функции:
- Ответы на вопросы о конкретных транзакциях
- Объяснение работы системы детекции
- Консультации по безопасности
- Многоязычная поддержка
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except Exception as e:
    genai = None

class ChatbotMode(Enum):
    """Режимы работы чат-бота."""
    GENERAL = "general"  # Общие вопросы
    TRANSACTION_ANALYSIS = "transaction"  # Анализ транзакций
    SECURITY_ADVICE = "security"  # Советы по безопасности
    SYSTEM_HELP = "help"  # Помощь по системе

class ConversationContext:
    """Контекст разговора для поддержания истории."""
    
    def __init__(self, session_id: str, language: str = 'ru'):
        self.session_id = session_id
        self.language = language
        self.history: List[Dict[str, str]] = []
        self.current_transaction: Optional[Dict[str, Any]] = None
        self.mode = ChatbotMode.GENERAL
        self.created_at = datetime.now()
    
    def add_message(self, role: str, content: str):
        """Добавление сообщения в историю."""
        self.history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        
        # Ограничиваем историю последними 20 сообщениями
        if len(self.history) > 20:
            self.history = self.history[-20:]
    
    def set_transaction_context(self, transaction: Dict[str, Any], result: Dict[str, Any]):
        """Установка контекста транзакции."""
        self.current_transaction = {
            "data": transaction,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
        self.mode = ChatbotMode.TRANSACTION_ANALYSIS
    
    def get_context_summary(self) -> str:
        """Получение краткого описания контекста."""
        summary = f"Сессия: {self.session_id}, Язык: {self.language}, Режим: {self.mode.value}"
        if self.current_transaction:
            result = self.current_transaction["result"]
            summary += f", Транзакция: {result.get('fraud_score', 0):.2f} риск"
        return summary

class FraudChatbot:
    """Чат-бот для консультаций по мошенничеству."""
    
    def __init__(self):
        self.model = None
        self.sessions: Dict[str, ConversationContext] = {}
        self._init_model()
        self._load_knowledge_base()
    
    def _init_model(self):
        """Инициализация Gemini модели."""
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or genai is None:
            logger.warning("Gemini API недоступен для чат-бота")
            return
        
        try:
            genai.configure(api_key=api_key)
            model_name = os.environ.get("GEMINI_CHATBOT_MODEL", "gemini-2.0-flash-exp")
            self.model = genai.GenerativeModel(model_name)
            logger.info(f"Чат-бот модель инициализирована ({model_name})")
        except Exception as e:
            logger.error(f"Ошибка инициализации чат-бота: {e}")
    
    def _load_knowledge_base(self):
        """Загрузка базы знаний для чат-бота."""
        self.knowledge_base = {
            'ru': {
                'greeting': "Привет! Я AI-ассистент по детекции мошенничества. Могу помочь с анализом транзакций, объяснить работу системы или дать советы по безопасности.",
                'transaction_help': "Для анализа транзакции предоставьте данные в формате JSON с полями V1-V28 и Amount.",
                'security_tips': [
                    "Никогда не сообщайте PIN-код или пароли третьим лицам",
                    "Проверяйте выписки по счетам регулярно",
                    "Используйте только защищенные сети для онлайн-платежей",
                    "Будьте осторожны с подозрительными ссылками и письмами"
                ],
                'system_features': [
                    "Анализ транзакций в реальном времени",
                    "Многоязычная поддержка (русский, английский, казахский)",
                    "Поиск похожих случаев мошенничества",
                    "Детальные рекомендации по безопасности"
                ]
            },
            'en': {
                'greeting': "Hello! I'm an AI assistant for fraud detection. I can help analyze transactions, explain how the system works, or provide security advice.",
                'transaction_help': "To analyze a transaction, provide data in JSON format with fields V1-V28 and Amount.",
                'security_tips': [
                    "Never share your PIN or passwords with third parties",
                    "Check your account statements regularly",
                    "Use only secure networks for online payments",
                    "Be cautious with suspicious links and emails"
                ],
                'system_features': [
                    "Real-time transaction analysis",
                    "Multi-language support (Russian, English, Kazakh)",
                    "Similar fraud cases search",
                    "Detailed security recommendations"
                ]
            },
            'kk': {
                'greeting': "Сәлем! Мен алаяқтықты анықтау бойынша AI-көмекшімін. Транзакцияларды талдауға, жүйенің жұмысын түсіндіруге немесе қауіпсіздік бойынша кеңес беруге көмектесе аламын.",
                'transaction_help': "Транзакцияны талдау үшін V1-V28 және Amount өрістері бар JSON форматында деректер беріңіз.",
                'security_tips': [
                    "PIN-кодыңызды немесе құпия сөздеріңізді үшінші тұлғаларға ешқашан бермеңіз",
                    "Шот бойынша есептерді үнемі тексеріңіз",
                    "Онлайн төлемдер үшін тек қорғалған желілерді пайдаланыңыз",
                    "Күдікті сілтемелер мен хаттарға сақ болыңыз"
                ],
                'system_features': [
                    "Нақты уақыттағы транзакция талдауы",
                    "Көптілді қолдау (орыс, ағылшын, қазақ)",
                    "Ұқсас алаяқтық жағдайларын іздеу",
                    "Қауіпсіздік бойынша толық ұсыныстар"
                ]
            }
        }
    
    def create_session(self, session_id: str, language: str = 'ru') -> ConversationContext:
        """Создание новой сессии чата."""
        context = ConversationContext(session_id, language)
        self.sessions[session_id] = context
        
        # Приветственное сообщение
        greeting = self.knowledge_base[language]['greeting']
        context.add_message("assistant", greeting)
        
        logger.info(f"Создана новая сессия чата: {session_id}")
        return context
    
    def get_session(self, session_id: str) -> Optional[ConversationContext]:
        """Получение существующей сессии."""
        return self.sessions.get(session_id)
    
    def process_message(self, session_id: str, message: str, 
                       transaction_context: Optional[Dict[str, Any]] = None) -> str:
        """Обработка сообщения пользователя."""
        if not self.model:
            return "Чат-бот недоступен. Проверьте настройки Gemini API."
        
        # Получаем или создаем сессию
        context = self.get_session(session_id)
        if not context:
            context = self.create_session(session_id)
        
        # Добавляем сообщение пользователя
        context.add_message("user", message)
        
        # Устанавливаем контекст транзакции если предоставлен
        if transaction_context:
            context.set_transaction_context(
                transaction_context.get("transaction", {}),
                transaction_context.get("result", {})
            )
        
        try:
            # Определяем тип запроса и режим
            self._detect_intent(context, message)
            
            # Генерируем ответ
            response = self._generate_response(context, message)
            
            # Добавляем ответ в историю
            context.add_message("assistant", response)
            
            return response
            
        except Exception as e:
            logger.error(f"Ошибка обработки сообщения: {e}")
            error_msg = "Извините, произошла ошибка. Попробуйте переформулировать вопрос."
            context.add_message("assistant", error_msg)
            return error_msg
    
    def _detect_intent(self, context: ConversationContext, message: str):
        """Определение намерения пользователя."""
        message_lower = message.lower()
        
        # Ключевые слова для разных режимов
        transaction_keywords = ['транзакция', 'платеж', 'перевод', 'transaction', 'payment', 'transfer']
        security_keywords = ['безопасность', 'защита', 'мошенник', 'security', 'fraud', 'scam']
        help_keywords = ['помощь', 'как работает', 'что умеет', 'help', 'how', 'what can']
        
        if any(keyword in message_lower for keyword in transaction_keywords):
            context.mode = ChatbotMode.TRANSACTION_ANALYSIS
        elif any(keyword in message_lower for keyword in security_keywords):
            context.mode = ChatbotMode.SECURITY_ADVICE
        elif any(keyword in message_lower for keyword in help_keywords):
            context.mode = ChatbotMode.SYSTEM_HELP
        else:
            context.mode = ChatbotMode.GENERAL
    
    def _generate_response(self, context: ConversationContext, message: str) -> str:
        """Генерация ответа на основе контекста."""
        # Подготавливаем системный промпт
        system_prompt = self._build_system_prompt(context)
        
        # Подготавливаем историю разговора
        conversation_history = self._build_conversation_history(context)
        
        # Формируем полный промпт
        full_prompt = f"""{system_prompt}

История разговора:
{conversation_history}

Текущий вопрос пользователя: {message}

Ответь на вопрос пользователя, учитывая контекст разговора и режим работы. 
Будь полезным, точным и дружелюбным. Используй язык: {context.language}"""
        
        # Настройки генерации
        generation_config = genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=800,
        )
        
        response = self.model.generate_content(full_prompt, generation_config=generation_config)
        return response.text.strip() if response.text else "Не удалось сгенерировать ответ."
    
    def _build_system_prompt(self, context: ConversationContext) -> str:
        """Построение системного промпта."""
        lang = context.language
        kb = self.knowledge_base[lang]
        
        base_prompt = f"""Ты AI-ассистент системы детекции мошенничества. 
Язык общения: {lang}
Режим работы: {context.mode.value}

Твои возможности:
{chr(10).join('- ' + feature for feature in kb['system_features'])}

Контекст сессии: {context.get_context_summary()}"""
        
        # Добавляем специфичную информацию в зависимости от режима
        if context.mode == ChatbotMode.TRANSACTION_ANALYSIS:
            if context.current_transaction:
                result = context.current_transaction["result"]
                base_prompt += f"""

КОНТЕКСТ ТРАНЗАКЦИИ:
- Вероятность мошенничества: {result.get('fraud_score', 0):.4f}
- Классификация: {'МОШЕННИЧЕСТВО' if result.get('is_fraud') else 'ЛЕГИТИМНАЯ'}
- Уровень риска: {result.get('risk_level', 'unknown')}
- Сумма: {context.current_transaction['data'].get('Amount', 0)}"""
        
        elif context.mode == ChatbotMode.SECURITY_ADVICE:
            base_prompt += f"""

СОВЕТЫ ПО БЕЗОПАСНОСТИ:
{chr(10).join('- ' + tip for tip in kb['security_tips'])}"""
        
        return base_prompt
    
    def _build_conversation_history(self, context: ConversationContext) -> str:
        """Построение истории разговора."""
        history_lines = []
        for msg in context.history[-10:]:  # Последние 10 сообщений
            role = "Пользователь" if msg["role"] == "user" else "Ассистент"
            history_lines.append(f"{role}: {msg['content']}")
        
        return "\n".join(history_lines)
    
    def get_suggested_questions(self, session_id: str) -> List[str]:
        """Получение предлагаемых вопросов."""
        context = self.get_session(session_id)
        if not context:
            return []
        
        lang = context.language
        
        suggestions = {
            'ru': [
                "Как работает система детекции мошенничества?",
                "Что означают признаки V1-V28?",
                "Как защитить себя от мошенников?",
                "Почему моя транзакция была помечена как подозрительная?",
                "Какие факторы влияют на оценку риска?"
            ],
            'en': [
                "How does the fraud detection system work?",
                "What do features V1-V28 mean?",
                "How to protect myself from fraudsters?",
                "Why was my transaction flagged as suspicious?",
                "What factors affect risk assessment?"
            ],
            'kk': [
                "Алаяқтықты анықтау жүйесі қалай жұмыс істейді?",
                "V1-V28 белгілері не дегенді білдіреді?",
                "Алаяқтардан қалай қорғануға болады?",
                "Менің транзакциям неліктен күдікті деп белгіленді?",
                "Тәуекелді бағалауға қандай факторлар әсер етеді?"
            ]
        }
        
        return suggestions.get(lang, suggestions['ru'])
    
    def clear_session(self, session_id: str):
        """Очистка сессии."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Сессия {session_id} очищена")
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Получение статистики сессий."""
        return {
            "total_sessions": len(self.sessions),
            "active_sessions": len([s for s in self.sessions.values() 
                                  if (datetime.now() - s.created_at).seconds < 3600]),
            "languages": list(set(s.language for s in self.sessions.values())),
            "modes": list(set(s.mode.value for s in self.sessions.values()))
        }

# Глобальный экземпляр чат-бота
fraud_chatbot = FraudChatbot()

def chat_with_bot(session_id: str, message: str, language: str = 'ru',
                  transaction_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Основная функция для общения с чат-ботом."""
    try:
        # Создаем сессию если не существует
        if not fraud_chatbot.get_session(session_id):
            fraud_chatbot.create_session(session_id, language)
        
        # Обрабатываем сообщение
        response = fraud_chatbot.process_message(session_id, message, transaction_context)
        
        # Получаем предлагаемые вопросы
        suggestions = fraud_chatbot.get_suggested_questions(session_id)
        
        return {
            "response": response,
            "suggestions": suggestions,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Ошибка в чат-боте: {e}")
        return {
            "response": "Извините, произошла ошибка. Попробуйте позже.",
            "suggestions": [],
            "session_id": session_id,
            "error": str(e)
        }

def get_chatbot_stats() -> Dict[str, Any]:
    """Получение статистики чат-бота."""
    return fraud_chatbot.get_session_stats()

def clear_chatbot_session(session_id: str):
    """Очистка сессии чат-бота."""
    fraud_chatbot.clear_session(session_id)
