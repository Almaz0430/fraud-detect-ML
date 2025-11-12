"""
Примеры использования расширенных API функций.

Демонстрирует:
- Расширенные объяснения с многоязычностью
- Поиск похожих случаев
- Анализ аномалий
- Рекомендации по рискам
- Чат-бот функциональность
"""

import requests
import json
from datetime import datetime

# Базовый URL API
BASE_URL = "http://localhost:5000"

# Пример транзакции для тестирования
SAMPLE_TRANSACTION = {
    "V1": -1.3598071336738,
    "V2": -0.0727811733098497,
    "V3": 2.53634673796914,
    "V4": 1.37815522427443,
    "V5": -0.338320769942518,
    "V6": 0.462387777762292,
    "V7": 0.239598554061257,
    "V8": 0.0986979012610507,
    "V9": 0.363786969611213,
    "V10": 0.0907941719789316,
    "V11": -0.551599533260813,
    "V12": -0.617800855762348,
    "V13": -0.991389847235408,
    "V14": -0.311169353699879,
    "V15": 1.46817697209427,
    "V16": -0.470400525259478,
    "V17": 0.207971241929242,
    "V18": 0.0257905801985591,
    "V19": 0.403992960255733,
    "V20": 0.251412098239705,
    "V21": -0.018306777944153,
    "V22": 0.277837575558899,
    "V23": -0.110473910188767,
    "V24": 0.0669280749146731,
    "V25": 0.128539358273528,
    "V26": -0.189114843888824,
    "V27": 0.133558376740387,
    "V28": -0.0210530534538215,
    "Amount": 149.62
}

def test_enhanced_explanation():
    """Тестирование расширенного объяснения."""
    print("=== ТЕСТИРОВАНИЕ РАСШИРЕННОГО ОБЪЯСНЕНИЯ ===")
    
    # Тестируем на разных языках
    languages = ['ru', 'en', 'kk']
    
    for lang in languages:
        print(f"\n--- Язык: {lang} ---")
        
        payload = {
            "transaction": SAMPLE_TRANSACTION,
            "threshold": 0.5,
            "language": lang
        }
        
        try:
            response = requests.post(f"{BASE_URL}/explain/enhanced", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Успешно получено объяснение")
                print(f"Fraud Score: {result.get('fraud_score', 'N/A')}")
                print(f"Is Fraud: {result.get('is_fraud', 'N/A')}")
                print(f"Похожих случаев найдено: {len(result.get('similar_cases', []))}")
                print(f"Аномалий обнаружено: {len(result.get('anomalies', {}).get('detected_anomalies', []))}")
                print(f"Рекомендаций: {len(result.get('recommendations', []))}")
                print(f"Объяснение (первые 200 символов): {result.get('explanation', '')[:200]}...")
            else:
                print(f"❌ Ошибка: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Исключение: {e}")

def test_similar_cases():
    """Тестирование поиска похожих случаев."""
    print("\n=== ТЕСТИРОВАНИЕ ПОИСКА ПОХОЖИХ СЛУЧАЕВ ===")
    
    payload = {
        "transaction": SAMPLE_TRANSACTION,
        "top_k": 5
    }
    
    try:
        response = requests.post(f"{BASE_URL}/similar-cases", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Найдено похожих случаев: {result.get('total_found', 0)}")
            
            for i, case in enumerate(result.get('similar_cases', []), 1):
                print(f"  {i}. ID: {case.get('id', 'N/A')}")
                print(f"     Описание: {case.get('description', 'N/A')}")
                print(f"     Тип паттерна: {case.get('pattern_type', 'N/A')}")
                print(f"     Риск скор: {case.get('risk_score', 'N/A')}")
                print(f"     Мошенничество: {case.get('is_fraud', 'N/A')}")
        else:
            print(f"❌ Ошибка: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Исключение: {e}")

def test_anomaly_analysis():
    """Тестирование анализа аномалий."""
    print("\n=== ТЕСТИРОВАНИЕ АНАЛИЗА АНОМАЛИЙ ===")
    
    payload = {
        "transaction": SAMPLE_TRANSACTION,
        "threshold": 0.5
    }
    
    try:
        response = requests.post(f"{BASE_URL}/analyze-anomalies", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            anomalies = result.get('anomalies', {})
            
            print(f"✅ Анализ аномалий завершен")
            print(f"Fraud Score: {result.get('fraud_score', 'N/A')}")
            print(f"Уровень серьезности: {anomalies.get('severity_level', 'N/A')}")
            print(f"Скор аномалий: {anomalies.get('anomaly_score', 'N/A')}")
            print(f"Типы паттернов: {', '.join(anomalies.get('pattern_types', []))}")
            
            detected = anomalies.get('detected_anomalies', [])
            print(f"Обнаруженные аномалии ({len(detected)}):")
            for anomaly in detected:
                print(f"  - {anomaly.get('type', 'N/A')}: {anomaly.get('description', 'N/A')} ({anomaly.get('severity', 'N/A')})")
        else:
            print(f"❌ Ошибка: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Исключение: {e}")

def test_recommendations():
    """Тестирование получения рекомендаций."""
    print("\n=== ТЕСТИРОВАНИЕ РЕКОМЕНДАЦИЙ ===")
    
    languages = ['ru', 'en', 'kk']
    
    for lang in languages:
        print(f"\n--- Рекомендации на языке: {lang} ---")
        
        payload = {
            "transaction": SAMPLE_TRANSACTION,
            "threshold": 0.5,
            "language": lang
        }
        
        try:
            response = requests.post(f"{BASE_URL}/recommendations", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                recommendations = result.get('recommendations', [])
                
                print(f"✅ Получено рекомендаций: {len(recommendations)}")
                print(f"Fraud Score: {result.get('fraud_score', 'N/A')}")
                print(f"Risk Level: {result.get('risk_level', 'N/A')}")
                
                for i, rec in enumerate(recommendations, 1):
                    print(f"  {i}. [{rec.get('type', 'N/A')}] {rec.get('action', 'N/A')}")
            else:
                print(f"❌ Ошибка: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Исключение: {e}")

def test_feedback():
    """Тестирование системы обратной связи."""
    print("\n=== ТЕСТИРОВАНИЕ ОБРАТНОЙ СВЯЗИ ===")
    
    # Сначала получаем предсказание
    try:
        pred_response = requests.post(f"{BASE_URL}/predict", json=SAMPLE_TRANSACTION)
        
        if pred_response.status_code == 200:
            prediction_result = pred_response.json()
            
            # Отправляем положительную обратную связь
            feedback_payload = {
                "transaction": SAMPLE_TRANSACTION,
                "prediction_result": prediction_result,
                "feedback": True  # Правильное предсказание
            }
            
            feedback_response = requests.post(f"{BASE_URL}/feedback", json=feedback_payload)
            
            if feedback_response.status_code == 200:
                result = feedback_response.json()
                print(f"✅ Обратная связь отправлена: {result.get('message', 'N/A')}")
                print(f"Feedback: {result.get('feedback', 'N/A')}")
            else:
                print(f"❌ Ошибка отправки feedback: {feedback_response.status_code}")
        else:
            print(f"❌ Ошибка получения предсказания: {pred_response.status_code}")
            
    except Exception as e:
        print(f"❌ Исключение: {e}")

def test_chatbot():
    """Тестирование чат-бота."""
    print("\n=== ТЕСТИРОВАНИЕ ЧАТ-БОТА ===")
    
    session_id = f"test_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Тестовые сообщения на разных языках
    test_messages = [
        {"message": "Привет! Как работает система детекции мошенничества?", "language": "ru"},
        {"message": "What factors affect fraud detection?", "language": "en"},
        {"message": "Алаяқтықты қалай анықтауға болады?", "language": "kk"},
        {"message": "Можешь проанализировать мою транзакцию?", "language": "ru"}
    ]
    
    for i, test_msg in enumerate(test_messages, 1):
        print(f"\n--- Сообщение {i} ({test_msg['language']}) ---")
        
        payload = {
            "message": test_msg["message"],
            "session_id": session_id,
            "language": test_msg["language"]
        }
        
        # Для последнего сообщения добавляем контекст транзакции
        if i == len(test_messages):
            payload["transaction_context"] = {
                "transaction": SAMPLE_TRANSACTION,
                "result": {"fraud_score": 0.85, "is_fraud": True, "risk_level": "high"}
            }
        
        try:
            response = requests.post(f"{BASE_URL}/chat", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Ответ получен")
                print(f"Сообщение: {test_msg['message']}")
                print(f"Ответ: {result.get('response', 'N/A')[:200]}...")
                print(f"Предложения: {len(result.get('suggestions', []))} шт.")
            else:
                print(f"❌ Ошибка: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Исключение: {e}")
    
    # Получаем статистику чат-бота
    try:
        stats_response = requests.get(f"{BASE_URL}/chat/stats")
        if stats_response.status_code == 200:
            stats = stats_response.json()
            print(f"\n--- Статистика чат-бота ---")
            print(f"Всего сессий: {stats.get('total_sessions', 0)}")
            print(f"Активных сессий: {stats.get('active_sessions', 0)}")
            print(f"Языки: {', '.join(stats.get('languages', []))}")
    except Exception as e:
        print(f"❌ Ошибка получения статистики: {e}")
    
    # Очищаем тестовую сессию
    try:
        clear_response = requests.delete(f"{BASE_URL}/chat/clear/{session_id}")
        if clear_response.status_code == 200:
            print(f"✅ Сессия {session_id} очищена")
    except Exception as e:
        print(f"❌ Ошибка очистки сессии: {e}")

def main():
    """Запуск всех тестов."""
    print("🚀 ТЕСТИРОВАНИЕ РАСШИРЕННЫХ API ФУНКЦИЙ")
    print("=" * 50)
    
    # Проверяем доступность API
    try:
        health_response = requests.get(f"{BASE_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print("❌ API недоступен. Убедитесь, что сервер запущен.")
            return
        print("✅ API доступен")
    except Exception as e:
        print(f"❌ Не удается подключиться к API: {e}")
        return
    
    # Запускаем тесты
    test_enhanced_explanation()
    test_similar_cases()
    test_anomaly_analysis()
    test_recommendations()
    test_feedback()
    test_chatbot()
    
    print("\n" + "=" * 50)
    print("🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")

if __name__ == "__main__":
    main()
