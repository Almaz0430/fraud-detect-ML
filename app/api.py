"""
Flask API для системы детекции мошенничества.

Предоставляет REST API для:
- Предсказания мошенничества (/predict)
- Проверки состояния системы (/health)
- Получения информации о модели (/model-info)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime
import traceback
from app.llm import explain_transaction, llm_available

try:
    from app.inference import get_model, validate_and_predict
    from app.preprocess import DataPreprocessor
except ImportError as e:
    raise ImportError(
        f"Ошибка импорта: {e}. Запускайте сервер как пакет: 'python -m app.api' из корня проекта."
    )

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Создание Flask приложения
app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": os.environ.get("ALLOWED_ORIGINS", "*")}},
)

# Глобальная переменная для модели
fraud_model = None

def initialize_model():
    """Инициализация модели при запуске приложения."""
    global fraud_model
    try:
        model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model")
        fraud_model = get_model(model_dir)
        logger.info("Модель успешно инициализирована")
        return True
    except Exception as e:
        logger.error(f"Ошибка инициализации модели: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """
    Проверка состояния API.
    
    Returns:
        JSON: Статус системы
    """
    try:
        # Проверяем состояние модели
        model_status = fraud_model is not None
        
        # Получаем информацию о модели
        model_info = {}
        if fraud_model:
            try:
                model_info = fraud_model.get_model_info()
            except Exception as e:
                logger.warning(f"Не удалось получить информацию о модели: {e}")
        
        response = {
            "status": "ok" if model_status else "error",
            "timestamp": datetime.now().isoformat(),
            "model_loaded": model_status,
            "model_info": model_info,
            "version": "1.0.0"
        }
        
        status_code = 200 if model_status else 503
        
        return jsonify(response), status_code
        
    except Exception as e:
        logger.error(f"Ошибка в health check: {e}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/predict', methods=['POST'])
def predict_fraud():
    """
    Предсказание мошенничества для транзакции.
    
    Expected JSON format:
    {
        "V1": float, "V2": float, ..., "V28": float,
        "Amount": float,
        "threshold": float (optional, default 0.5)
    }
    
    Returns:
        JSON: Результат предсказания
    """
    try:
        # Проверяем, что модель загружена
        if fraud_model is None:
            return jsonify({
                "error": "Модель не загружена",
                "fraud_score": None,
                "is_fraud": None
            }), 503
        
        # Получаем данные из запроса
        if not request.is_json:
            return jsonify({
                "error": "Ожидается JSON в теле запроса",
                "fraud_score": None,
                "is_fraud": None
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                "error": "Пустое тело запроса",
                "fraud_score": None,
                "is_fraud": None
            }), 400
        
        # Получаем порог (по умолчанию 0.5)
        threshold = data.pop('threshold', 0.5)
        
        # Валидируем порог
        try:
            threshold = float(threshold)
            if not 0 <= threshold <= 1:
                return jsonify({
                    "error": "Порог должен быть между 0 и 1",
                    "fraud_score": None,
                    "is_fraud": None
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                "error": "Порог должен быть числом",
                "fraud_score": None,
                "is_fraud": None
            }), 400
        
        # Выполняем предсказание
        result = validate_and_predict(data, threshold)
        
        # Проверяем результат валидации
        if not result.get("valid", True):
            return jsonify({
                "error": result.get("error", "Ошибка валидации"),
                "fraud_score": None,
                "is_fraud": None
            }), 400
        
        # Формируем ответ
        response = {
            "fraud_score": result.get("fraud_score"),
            "is_fraud": result.get("is_fraud"),
            "confidence": result.get("confidence"),
            "risk_level": result.get("risk_level"),
            "threshold": threshold,
            "timestamp": datetime.now().isoformat()
        }
        
        # Добавляем информацию о модели (опционально)
        if "model_info" in result:
            response["model_info"] = result["model_info"]
        
        logger.info(f"Предсказание выполнено: fraud_score={response['fraud_score']}, is_fraud={response['is_fraud']}")
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Ошибка в predict: {e}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            "error": f"Внутренняя ошибка сервера: {str(e)}",
            "fraud_score": None,
            "is_fraud": None,
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/model-info', methods=['GET'])
def get_model_info():
    """
    Получение информации о модели.
    
    Returns:
        JSON: Информация о модели
    """
    try:
        if fraud_model is None:
            return jsonify({
                "error": "Модель не загружена"
            }), 503
        
        info = fraud_model.get_model_info()
        info["timestamp"] = datetime.now().isoformat()
        
        return jsonify(info), 200
        
    except Exception as e:
        logger.error(f"Ошибка получения информации о модели: {e}")
        return jsonify({
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Пакетное предсказание для нескольких транзакций.
    
    Expected JSON format:
    {
        "transactions": [
            {"V1": float, "V2": float, ..., "Amount": float},
            {"V1": float, "V2": float, ..., "Amount": float}
        ],
        "threshold": float (optional, default 0.5)
    }
    
    Returns:
        JSON: Список результатов предсказаний
    """
    try:
        if fraud_model is None:
            return jsonify({
                "error": "Модель не загружена"
            }), 503
        
        if not request.is_json:
            return jsonify({
                "error": "Ожидается JSON в теле запроса"
            }), 400
        
        data = request.get_json()
        
        if not data or "transactions" not in data:
            return jsonify({
                "error": "Ожидается поле 'transactions' с массивом транзакций"
            }), 400
        
        transactions = data["transactions"]
        threshold = data.get("threshold", 0.5)
        
        # Валидация порога
        try:
            threshold = float(threshold)
            if not 0 <= threshold <= 1:
                return jsonify({
                    "error": "Порог должен быть между 0 и 1"
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                "error": "Порог должен быть числом"
            }), 400
        
        # Ограничение на количество транзакций
        if len(transactions) > 100:
            return jsonify({
                "error": "Максимальное количество транзакций в пакете: 100"
            }), 400
        
        # Выполняем пакетное предсказание
        results = fraud_model.batch_predict(transactions, threshold)
        
        response = {
            "results": results,
            "total_transactions": len(transactions),
            "threshold": threshold,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Пакетное предсказание выполнено для {len(transactions)} транзакций")
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Ошибка в batch predict: {e}")
        return jsonify({
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/sample-transaction', methods=['GET'])
def get_sample_transaction():
    """
    Получение примера транзакции для тестирования.
    
    Returns:
        JSON: Пример транзакции
    """
    try:
        preprocessor = DataPreprocessor()
        sample = preprocessor.create_sample_transaction()
        
        return jsonify({
            "sample_transaction": sample,
            "description": "Пример транзакции для тестирования API",
            "usage": "Отправьте POST запрос на /predict с этими данными"
        }), 200
        
    except Exception as e:
        logger.error(f"Ошибка получения примера транзакции: {e}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/explain', methods=['POST'])
def explain_fraud():
    """
    Объяснение предсказания мошенничества с помощью Gemini.

    Expected JSON:
    {
      "transaction": { V1..V28, Amount, (optional) Time },
      "threshold": float (optional, default 0.5)
    }
    """
    try:
        if fraud_model is None:
            return jsonify({"error": "Модель не загружена"}), 503

        if not request.is_json:
            return jsonify({"error": "Ожидается JSON в теле запроса"}), 400

        payload = request.get_json() or {}
        # Поддерживаем два формата: либо транзакция на верхнем уровне, либо в поле transaction
        transaction = payload.get("transaction") if isinstance(payload, dict) else None
        if transaction is None:
            transaction = payload

        threshold = payload.get("threshold", 0.5)
        try:
            threshold = float(threshold)
            if not 0 <= threshold <= 1:
                return jsonify({"error": "Порог должен быть между 0 и 1"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Порог должен быть числом"}), 400

        # Получаем детальный результат предсказания
        result = fraud_model.predict_with_details(transaction, threshold)
        if result.get("error"):
            return jsonify({"error": result["error"]}), 400

        # Генерируем объяснение через LLM
        explanation = explain_transaction(transaction, result)
        response = {
            "explanation": explanation,
            "fraud_score": result.get("fraud_score"),
            "is_fraud": result.get("is_fraud"),
            "confidence": result.get("confidence"),
            "risk_level": result.get("risk_level"),
            "threshold": result.get("threshold", threshold),
            "model_info": result.get("model_info", {}),
            "llm_enabled": llm_available(),
            "timestamp": datetime.now().isoformat(),
        }
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Ошибка в explain: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Внутренняя ошибка сервера: {str(e)}"}), 500

@app.errorhandler(404)
def not_found(error):
    """Обработчик 404 ошибки."""
    return jsonify({
        "error": "Эндпоинт не найден",
        "available_endpoints": [
            "GET /health - проверка состояния",
            "POST /predict - предсказание мошенничества",
            "GET /model-info - информация о модели",
            "POST /predict/batch - пакетное предсказание",
            "GET /sample-transaction - пример транзакции"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Обработчик 500 ошибки."""
    logger.error(f"Внутренняя ошибка сервера: {error}")
    return jsonify({
        "error": "Внутренняя ошибка сервера",
        "timestamp": datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    # Инициализация модели при запуске
    logger.info("Запуск API сервера...")
    
    model_initialized = initialize_model()
    if not model_initialized:
        logger.warning("Модель не инициализирована. API будет работать в ограниченном режиме.")
        logger.warning("Убедитесь, что модель обучена и сохранена в папке model/")
    
    # Запуск сервера
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Сервер запускается на порту {port}")
    logger.info("Доступные эндпоинты:")
    logger.info("  GET  /health - проверка состояния")
    logger.info("  POST /predict - предсказание мошенничества")
    logger.info("  GET  /model-info - информация о модели")
    logger.info("  POST /predict/batch - пакетное предсказание")
    logger.info("  GET  /sample-transaction - пример транзакции")
    
    app.run(host='0.0.0.0', port=port, debug=debug)