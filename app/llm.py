import os
import json
import logging
from typing import Dict, Any
from pathlib import Path

# Загружаем переменные из .env файла
try:
    from dotenv import load_dotenv
    # Ищем .env файл в корне проекта
    env_path = Path(__file__).parent.parent / '.env'
    load_dotenv(dotenv_path=env_path)
    logger = logging.getLogger(__name__)
    logger.info(f"Загружены переменные из {env_path}")
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("python-dotenv не установлен, используем только системные переменные окружения")

try:
    import google.generativeai as genai
except Exception as e:
    genai = None

_API_KEY = os.environ.get("GEMINI_API_KEY")
_MODEL = None

def _init_model() -> None:
    global _MODEL
    if _MODEL is not None:
        return

    if genai is None:
        logger.warning("google-generativeai не установлен; LLM-функции отключены")
        return

    if not _API_KEY:
        logger.warning("Переменная окружения GEMINI_API_KEY не задана; LLM-функции отключены")
        return

    try:
        genai.configure(api_key=_API_KEY)
        # Используем настройки из .env или дефолтные
        model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-exp")
        _MODEL = genai.GenerativeModel(model_name)
        logger.info(f"Gemini модель инициализирована ({model_name})")
    except Exception as e:
        logger.error(f"Ошибка инициализации Gemini: {e}")
        _MODEL = None


def llm_available() -> bool:
    """Проверка доступности LLM."""
    _init_model()
    return _MODEL is not None


def explain_transaction(transaction: Dict[str, Any], result: Dict[str, Any]) -> str:
    """
    Сгенерировать детальное объяснение предсказания для транзакции.

    Args:
        transaction: входные признаки транзакции (V1..V28, Amount, опц. Time)
        result: результат предсказания из модели (fraud_score, is_fraud, confidence, risk_level, threshold, model_info)

    Returns:
        str: детальное текстовое объяснение на русском.
    """
    if not llm_available():
        return "LLM недоступен: установите google-generativeai и задайте GEMINI_API_KEY в .env файле."

    try:
        score = result.get("fraud_score", 0)
        is_fraud = result.get("is_fraud", False)
        confidence = result.get("confidence", 0)
        risk_level = result.get("risk_level", "Неизвестно")
        threshold = result.get("threshold", 0.5)
        model_info = result.get("model_info", {})
        amount = transaction.get("Amount", 0)

        # Получаем настройки генерации из .env
        temperature = float(os.environ.get("GEMINI_TEMPERATURE", "0.3"))
        max_tokens = int(os.environ.get("GEMINI_MAX_TOKENS", "500"))

        prompt = f"""Ты эксперт-аналитик по финансовому мошенничеству. Проанализируй транзакцию и объясни решение модели машинного обучения.

ДАННЫЕ ТРАНЗАКЦИИ:
• Сумма: {amount:.2f}
• Вероятность мошенничества: {score:.4f} ({score*100:.2f}%)
• Порог классификации: {threshold}
• Итоговое решение: {'🚨 МОШЕННИЧЕСТВО' if is_fraud else '✅ ЛЕГИТИМНАЯ ТРАНЗАКЦИЯ'}
• Уровень риска: {risk_level}
• Уверенность модели: {confidence:.4f} ({confidence*100:.2f}%)
• Модель: {model_info.get('model_name', 'Неизвестно')} (AUC: {model_info.get('model_auc', 'N/A')})

ПРИЗНАКИ ТРАНЗАКЦИИ (PCA-преобразованные):
{json.dumps({k: round(v, 4) if isinstance(v, (int, float)) else v for k, v in transaction.items()}, ensure_ascii=False, indent=2)}

ЗАДАЧА:
Проанализируй эту транзакцию и дай профессиональное объяснение в следующем формате:

**🔍 АНАЛИЗ РИСКА:**
- Опиши основные факторы риска на основе признаков V1-V28 и суммы
- Объясни, какие паттерны указывают на мошенничество или их отсутствие
- Укажи наиболее значимые признаки для данного решения

**📊 ИНТЕРПРЕТАЦИЯ МОДЕЛИ:**
- Объясни, почему модель приняла такое решение
- Насколько близко значение к пороговому
- Оцени надежность предсказания

**⚡ РЕКОМЕНДАЦИИ:**
- Конкретные действия для данной транзакции
- Дополнительные проверки при необходимости
- Меры предосторожности

Пиши профессионально, но понятно. Избегай технического жаргона. Фокусируйся на практических выводах."""

        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        resp = _MODEL.generate_content(prompt, generation_config=generation_config)
        return (resp.text or "Не удалось получить ответ от модели.").strip()
        
    except Exception as e:
        logger.error(f"Ошибка генерации объяснения: {e}")
        return f"Ошибка LLM при формировании объяснения: {str(e)}"