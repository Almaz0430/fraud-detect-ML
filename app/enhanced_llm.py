"""
Расширенная система AI-объяснений с многоязычной поддержкой.

Включает:
- Детальный анализ через Gemini с примерами похожих случаев
- Многоязычная поддержка (русский, английский, казахский)
- Анализ аномальных паттернов
- Рекомендации по снижению рисков
"""

import os
import json
import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except Exception as e:
    genai = None

# Языковые настройки
SUPPORTED_LANGUAGES = {
    'ru': 'русский',
    'en': 'english', 
    'kk': 'қазақша'
}

# Промпты для разных языков
LANGUAGE_PROMPTS = {
    'ru': {
        'system': "Ты эксперт-аналитик по финансовому мошенничеству. Анализируй транзакции и объясняй решения модели машинного обучения на русском языке.",
        'analysis_header': "🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ТРАНЗАКЦИИ",
        'risk_factors': "📊 ФАКТОРЫ РИСКА",
        'similar_cases': "🔄 ПОХОЖИЕ СЛУЧАИ",
        'anomaly_analysis': "⚠️ АНАЛИЗ АНОМАЛИЙ",
        'recommendations': "💡 РЕКОМЕНДАЦИИ",
        'model_interpretation': "🤖 ИНТЕРПРЕТАЦИЯ МОДЕЛИ"
    },
    'en': {
        'system': "You are a financial fraud detection expert analyst. Analyze transactions and explain machine learning model decisions in English.",
        'analysis_header': "🔍 DETAILED TRANSACTION ANALYSIS",
        'risk_factors': "📊 RISK FACTORS",
        'similar_cases': "🔄 SIMILAR CASES",
        'anomaly_analysis': "⚠️ ANOMALY ANALYSIS", 
        'recommendations': "💡 RECOMMENDATIONS",
        'model_interpretation': "🤖 MODEL INTERPRETATION"
    },
    'kk': {
        'system': "Сіз қаржылық алаяқтықты анықтау бойынша сарапшы-талдаушысыз. Транзакцияларды талдаңыз және машиналық оқыту моделінің шешімдерін қазақ тілінде түсіндіріңіз.",
        'analysis_header': "🔍 ТРАНЗАКЦИЯНЫҢ ТОЛЫҚ ТАЛДАУЫ",
        'risk_factors': "📊 ТӘУЕКЕЛ ФАКТОРЛАРЫ",
        'similar_cases': "🔄 ҰҚСАС ЖАҒДАЙЛАР",
        'anomaly_analysis': "⚠️ АНОМАЛИЯ ТАЛДАУЫ",
        'recommendations': "💡 ҰСЫНЫСТАР",
        'model_interpretation': "🤖 МОДЕЛЬ ТҮСІНДІРМЕСІ"
    }
}

class EnhancedFraudExplainer:
    """Расширенная система объяснений мошенничества."""
    
    def __init__(self):
        self.model = None
        self.similar_cases_db = []
        self.anomaly_patterns = {}
        self._init_model()
        self._load_historical_cases()
    
    def _init_model(self):
        """Инициализация Gemini модели."""
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or genai is None:
            logger.warning("Gemini API недоступен")
            return
        
        try:
            genai.configure(api_key=api_key)
            model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-exp")
            self.model = genai.GenerativeModel(model_name)
            logger.info(f"Enhanced Gemini модель инициализирована ({model_name})")
        except Exception as e:
            logger.error(f"Ошибка инициализации Gemini: {e}")
    
    def _load_historical_cases(self):
        """Загрузка исторических случаев для поиска похожих."""
        try:
            cases_file = Path("data/historical_cases.json")
            if cases_file.exists():
                with open(cases_file, 'r', encoding='utf-8') as f:
                    self.similar_cases_db = json.load(f)
                logger.info(f"Загружено {len(self.similar_cases_db)} исторических случаев")
            else:
                # Создаем базовые примеры
                self._create_sample_cases()
        except Exception as e:
            logger.error(f"Ошибка загрузки исторических случаев: {e}")
            self._create_sample_cases()
    
    def _create_sample_cases(self):
        """Создание примеров исторических случаев."""
        self.similar_cases_db = [
            {
                "id": "case_001",
                "transaction": {"Amount": 1500.0, "V1": -2.1, "V2": 1.8, "V3": -1.2},
                "is_fraud": True,
                "description": "Крупная транзакция в нерабочее время с аномальными признаками",
                "pattern_type": "large_amount_anomaly",
                "risk_score": 0.95
            },
            {
                "id": "case_002", 
                "transaction": {"Amount": 50.0, "V1": 0.1, "V2": -0.2, "V3": 0.3},
                "is_fraud": False,
                "description": "Обычная небольшая покупка с нормальными признаками",
                "pattern_type": "normal_purchase",
                "risk_score": 0.05
            }
        ]
    
    def find_similar_cases(self, transaction: Dict[str, Any], top_k: int = 3) -> List[Dict]:
        """Поиск похожих исторических случаев."""
        if not self.similar_cases_db:
            return []
        
        try:
            # Извлекаем числовые признаки для сравнения
            current_features = self._extract_features(transaction)
            similarities = []
            
            for case in self.similar_cases_db:
                case_features = self._extract_features(case["transaction"])
                similarity = self._calculate_similarity(current_features, case_features)
                similarities.append((similarity, case))
            
            # Сортируем по убыванию схожести
            similarities.sort(key=lambda x: x[0], reverse=True)
            
            return [case for _, case in similarities[:top_k]]
            
        except Exception as e:
            logger.error(f"Ошибка поиска похожих случаев: {e}")
            return []
    
    def _extract_features(self, transaction: Dict[str, Any]) -> np.ndarray:
        """Извлечение числовых признаков из транзакции."""
        features = []
        
        # Добавляем Amount
        features.append(transaction.get("Amount", 0))
        
        # Добавляем V1-V28
        for i in range(1, 29):
            features.append(transaction.get(f"V{i}", 0))
        
        return np.array(features).reshape(1, -1)
    
    def _calculate_similarity(self, features1: np.ndarray, features2: np.ndarray) -> float:
        """Расчет косинусного сходства между признаками."""
        try:
            return cosine_similarity(features1, features2)[0][0]
        except:
            return 0.0
    
    def analyze_anomalies(self, transaction: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
        """Детальный анализ аномальных паттернов."""
        anomalies = {
            "detected_anomalies": [],
            "severity_level": "low",
            "anomaly_score": 0.0,
            "pattern_types": []
        }
        
        try:
            amount = transaction.get("Amount", 0)
            fraud_score = result.get("fraud_score", 0)
            
            # Анализ суммы
            if amount > 5000:
                anomalies["detected_anomalies"].append({
                    "type": "high_amount",
                    "description": f"Необычно высокая сумма: {amount}",
                    "severity": "high"
                })
                anomalies["pattern_types"].append("large_transaction")
            
            if amount < 1:
                anomalies["detected_anomalies"].append({
                    "type": "micro_transaction", 
                    "description": f"Микротранзакция: {amount}",
                    "severity": "medium"
                })
                anomalies["pattern_types"].append("micro_payment")
            
            # Анализ PCA признаков
            extreme_features = []
            for i in range(1, 29):
                v_val = transaction.get(f"V{i}", 0)
                if abs(v_val) > 3:  # Значения за пределами 3 стандартных отклонений
                    extreme_features.append(f"V{i}")
            
            if extreme_features:
                anomalies["detected_anomalies"].append({
                    "type": "extreme_features",
                    "description": f"Экстремальные значения признаков: {', '.join(extreme_features)}",
                    "severity": "high" if len(extreme_features) > 5 else "medium"
                })
                anomalies["pattern_types"].append("feature_anomaly")
            
            # Определение общего уровня серьезности
            high_severity_count = sum(1 for a in anomalies["detected_anomalies"] if a["severity"] == "high")
            if high_severity_count > 0:
                anomalies["severity_level"] = "high"
                anomalies["anomaly_score"] = min(0.9, fraud_score + 0.2)
            elif len(anomalies["detected_anomalies"]) > 0:
                anomalies["severity_level"] = "medium"
                anomalies["anomaly_score"] = fraud_score
            
        except Exception as e:
            logger.error(f"Ошибка анализа аномалий: {e}")
        
        return anomalies
    
    def generate_recommendations(self, transaction: Dict[str, Any], result: Dict[str, Any], 
                               anomalies: Dict[str, Any], language: str = 'ru') -> List[Dict[str, str]]:
        """Генерация рекомендаций по снижению рисков."""
        recommendations = []
        
        try:
            fraud_score = result.get("fraud_score", 0)
            is_fraud = result.get("is_fraud", False)
            amount = transaction.get("Amount", 0)
            
            # Рекомендации на основе уровня риска
            if is_fraud:
                if language == 'ru':
                    recommendations.extend([
                        {"type": "immediate", "action": "Немедленно заблокировать транзакцию"},
                        {"type": "investigation", "action": "Провести детальное расследование"},
                        {"type": "contact", "action": "Связаться с клиентом для подтверждения"}
                    ])
                elif language == 'en':
                    recommendations.extend([
                        {"type": "immediate", "action": "Immediately block the transaction"},
                        {"type": "investigation", "action": "Conduct detailed investigation"},
                        {"type": "contact", "action": "Contact customer for verification"}
                    ])
                elif language == 'kk':
                    recommendations.extend([
                        {"type": "immediate", "action": "Транзакцияны дереу блоктау"},
                        {"type": "investigation", "action": "Толық тергеу жүргізу"},
                        {"type": "contact", "action": "Растау үшін клиентпен байланысу"}
                    ])
            
            elif fraud_score > 0.3:
                if language == 'ru':
                    recommendations.extend([
                        {"type": "monitoring", "action": "Усилить мониторинг клиента"},
                        {"type": "verification", "action": "Дополнительная верификация"},
                        {"type": "limits", "action": "Временно снизить лимиты"}
                    ])
                elif language == 'en':
                    recommendations.extend([
                        {"type": "monitoring", "action": "Enhance customer monitoring"},
                        {"type": "verification", "action": "Additional verification required"},
                        {"type": "limits", "action": "Temporarily reduce limits"}
                    ])
                elif language == 'kk':
                    recommendations.extend([
                        {"type": "monitoring", "action": "Клиентті күшейтілген бақылау"},
                        {"type": "verification", "action": "Қосымша растау қажет"},
                        {"type": "limits", "action": "Уақытша лимиттерді төмендету"}
                    ])
            
            # Рекомендации на основе аномалий
            for anomaly in anomalies.get("detected_anomalies", []):
                if anomaly["type"] == "high_amount":
                    if language == 'ru':
                        recommendations.append({
                            "type": "amount_check", 
                            "action": f"Проверить источник крупной суммы ({amount})"
                        })
                    elif language == 'en':
                        recommendations.append({
                            "type": "amount_check",
                            "action": f"Verify source of large amount ({amount})"
                        })
                    elif language == 'kk':
                        recommendations.append({
                            "type": "amount_check",
                            "action": f"Үлкен сомманың көзін тексеру ({amount})"
                        })
            
        except Exception as e:
            logger.error(f"Ошибка генерации рекомендаций: {e}")
        
        return recommendations
    
    def generate_enhanced_explanation(self, transaction: Dict[str, Any], result: Dict[str, Any], 
                                    language: str = 'ru') -> str:
        """Генерация расширенного объяснения с примерами и рекомендациями."""
        if not self.model:
            return "LLM недоступен: установите google-generativeai и задайте GEMINI_API_KEY"
        
        try:
            # Поиск похожих случаев
            similar_cases = self.find_similar_cases(transaction)
            
            # Анализ аномалий
            anomalies = self.analyze_anomalies(transaction, result)
            
            # Генерация рекомендаций
            recommendations = self.generate_recommendations(transaction, result, anomalies, language)
            
            # Подготовка данных для промпта
            score = result.get("fraud_score", 0)
            is_fraud = result.get("is_fraud", False)
            confidence = result.get("confidence", 0)
            risk_level = result.get("risk_level", "unknown")
            threshold = result.get("threshold", 0.5)
            amount = transaction.get("Amount", 0)
            
            # Получение промптов для языка
            prompts = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS['ru'])
            
            # Формирование промпта
            prompt = f"""{prompts['system']}

{prompts['analysis_header']}:
• Сумма транзакции: {amount:.2f}
• Вероятность мошенничества: {score:.4f} ({score*100:.2f}%)
• Порог классификации: {threshold}
• Решение: {'🚨 МОШЕННИЧЕСТВО' if is_fraud else '✅ ЛЕГИТИМНАЯ'}
• Уровень риска: {risk_level}
• Уверенность: {confidence:.4f}

{prompts['risk_factors']}:
{json.dumps({k: round(v, 4) if isinstance(v, (int, float)) else v for k, v in transaction.items()}, ensure_ascii=False, indent=2)}

{prompts['similar_cases']}:
{json.dumps([{
    'описание': case.get('description', ''),
    'тип_паттерна': case.get('pattern_type', ''),
    'риск_скор': case.get('risk_score', 0),
    'мошенничество': case.get('is_fraud', False)
} for case in similar_cases], ensure_ascii=False, indent=2)}

{prompts['anomaly_analysis']}:
Обнаруженные аномалии: {len(anomalies.get('detected_anomalies', []))}
Уровень серьезности: {anomalies.get('severity_level', 'low')}
Типы паттернов: {', '.join(anomalies.get('pattern_types', []))}

{prompts['recommendations']}:
{json.dumps([{'тип': r['type'], 'действие': r['action']} for r in recommendations], ensure_ascii=False, indent=2)}

ЗАДАЧА: Проанализируй эту транзакцию и дай профессиональное объяснение на языке {SUPPORTED_LANGUAGES[language]}. 

Структура ответа:
**{prompts['risk_factors']}**
- Детальный анализ факторов риска
- Объяснение значимых признаков
- Сравнение с нормальными транзакциями

**{prompts['similar_cases']}**
- Анализ найденных похожих случаев
- Выводы на основе исторических данных
- Паттерны поведения

**{prompts['anomaly_analysis']}**
- Детальное объяснение обнаруженных аномалий
- Степень отклонения от нормы
- Потенциальные причины

**{prompts['model_interpretation']}**
- Объяснение решения модели
- Ключевые факторы влияния
- Надежность предсказания

**{prompts['recommendations']}**
- Конкретные действия
- Превентивные меры
- Долгосрочные рекомендации

Пиши профессионально и структурированно. Используй эмодзи для наглядности."""

            # Настройки генерации
            generation_config = genai.types.GenerationConfig(
                temperature=float(os.environ.get("GEMINI_TEMPERATURE", "0.3")),
                max_output_tokens=int(os.environ.get("GEMINI_MAX_TOKENS", "1000")),
            )
            
            response = self.model.generate_content(prompt, generation_config=generation_config)
            return response.text.strip() if response.text else "Не удалось получить ответ от модели"
            
        except Exception as e:
            logger.error(f"Ошибка генерации расширенного объяснения: {e}")
            return f"Ошибка при генерации объяснения: {str(e)}"
    
    def save_case_to_history(self, transaction: Dict[str, Any], result: Dict[str, Any], 
                           feedback: Optional[bool] = None):
        """Сохранение случая в историческую базу для обучения."""
        try:
            case = {
                "id": f"case_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "timestamp": datetime.now().isoformat(),
                "transaction": transaction,
                "prediction": result,
                "feedback": feedback,
                "is_fraud": result.get("is_fraud", False),
                "risk_score": result.get("fraud_score", 0),
                "pattern_type": "auto_detected"
            }
            
            self.similar_cases_db.append(case)
            
            # Ограничиваем размер базы
            if len(self.similar_cases_db) > 1000:
                self.similar_cases_db = self.similar_cases_db[-1000:]
            
            # Сохраняем в файл
            os.makedirs("data", exist_ok=True)
            with open("data/historical_cases.json", 'w', encoding='utf-8') as f:
                json.dump(self.similar_cases_db, f, ensure_ascii=False, indent=2)
                
            logger.info(f"Случай {case['id']} сохранен в историческую базу")
            
        except Exception as e:
            logger.error(f"Ошибка сохранения случая: {e}")

# Глобальный экземпляр
enhanced_explainer = EnhancedFraudExplainer()

def get_enhanced_explanation(transaction: Dict[str, Any], result: Dict[str, Any], 
                           language: str = 'ru') -> str:
    """Получение расширенного объяснения."""
    return enhanced_explainer.generate_enhanced_explanation(transaction, result, language)

def find_similar_transactions(transaction: Dict[str, Any], top_k: int = 3) -> List[Dict]:
    """Поиск похожих транзакций."""
    return enhanced_explainer.find_similar_cases(transaction, top_k)

def analyze_transaction_anomalies(transaction: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
    """Анализ аномалий в транзакции."""
    return enhanced_explainer.analyze_anomalies(transaction, result)

def get_risk_recommendations(transaction: Dict[str, Any], result: Dict[str, Any], 
                           language: str = 'ru') -> List[Dict[str, str]]:
    """Получение рекомендаций по снижению рисков."""
    anomalies = enhanced_explainer.analyze_anomalies(transaction, result)
    return enhanced_explainer.generate_recommendations(transaction, result, anomalies, language)

def save_transaction_feedback(transaction: Dict[str, Any], result: Dict[str, Any], 
                            feedback: bool):
    """Сохранение обратной связи по транзакции."""
    enhanced_explainer.save_case_to_history(transaction, result, feedback)
