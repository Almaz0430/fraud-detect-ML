"""
Модуль инференса для системы детекции мошенничества.

Содержит функции для:
- Загрузки обученной модели
- Выполнения предсказаний
- Интерпретации результатов
"""

import joblib
import numpy as np
import os
import logging
from typing import Dict, Tuple, Optional
from .preprocess import DataPreprocessor

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FraudDetectionModel:
    """Класс для загрузки модели и выполнения предсказаний."""
    
    def __init__(self, model_dir: str = None):
        """
        Инициализация модели.
        
        Args:
            model_dir: Путь к директории с моделью
        """
        if model_dir is None:
            # Путь по умолчанию относительно текущего файла
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_dir = os.path.join(base_dir, '..', '..', 'model')
        else:
            self.model_dir = model_dir
        
        self.model = None
        self.scaler = None
        self.metrics = None
        self.preprocessor = None
        
        # Автоматическая загрузка модели при инициализации
        self.load_model()
    
    def load_model(self) -> None:
        """Загрузка модели, скейлера и метрик."""
        try:
            # Пути к файлам
            model_path = os.path.join(self.model_dir, "model.pkl")
            scaler_path = os.path.join(self.model_dir, "scaler.pkl")
            metrics_path = os.path.join(self.model_dir, "metrics.pkl")
            
            # Проверка существования файлов
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Модель не найдена: {model_path}")
            if not os.path.exists(scaler_path):
                raise FileNotFoundError(f"Скейлер не найден: {scaler_path}")
            
            # Загрузка модели
            self.model = joblib.load(model_path)
            logger.info(f"Модель загружена из {model_path}")
            
            # Загрузка скейлера
            self.scaler = joblib.load(scaler_path)
            logger.info(f"Скейлер загружен из {scaler_path}")
            
            # Загрузка метрик (опционально)
            if os.path.exists(metrics_path):
                self.metrics = joblib.load(metrics_path)
                logger.info(f"Метрики загружены из {metrics_path}")
            
            # Инициализация препроцессора
            self.preprocessor = DataPreprocessor(scaler_path)
            
            logger.info("Модель успешно инициализирована")
            
        except Exception as e:
            logger.error(f"Ошибка загрузки модели: {e}")
            raise
    
    def predict_fraud_probability(self, transaction_data: Dict) -> float:
        """
        Предсказание вероятности мошенничества.
        
        Args:
            transaction_data: Данные транзакции
            
        Returns:
            float: Вероятность мошенничества (0-1)
        """
        if self.model is None:
            raise ValueError("Модель не загружена")
        
        try:
            # Предобработка данных
            features = self.preprocessor.prepare_features(transaction_data)
            
            # Предсказание вероятности
            probability = self.model.predict_proba(features)[0, 1]
            
            logger.info(f"Предсказание выполнено. Вероятность мошенничества: {probability:.4f}")
            
            return float(probability)
            
        except Exception as e:
            logger.error(f"Ошибка предсказания: {e}")
            raise
    
    def predict_fraud_class(self, transaction_data: Dict, threshold: float = 0.5) -> bool:
        """
        Предсказание класса (мошенничество/норма).
        
        Args:
            transaction_data: Данные транзакции
            threshold: Порог для классификации
            
        Returns:
            bool: True если мошенничество, False если норма
        """
        probability = self.predict_fraud_probability(transaction_data)
        return probability >= threshold
    
    def predict_with_details(self, transaction_data: Dict, threshold: float = 0.5) -> Dict:
        """
        Полное предсказание с деталями.
        
        Args:
            transaction_data: Данные транзакции
            threshold: Порог для классификации
            
        Returns:
            Dict: Детальный результат предсказания
        """
        try:
            # Валидация входных данных
            is_valid, error_msg = self.preprocessor.validate_transaction_data(transaction_data)
            if not is_valid:
                return {
                    "error": error_msg,
                    "fraud_score": None,
                    "is_fraud": None,
                    "confidence": None
                }
            
            # Предсказание
            probability = self.predict_fraud_probability(transaction_data)
            is_fraud = probability >= threshold
            
            # Расчет уверенности
            confidence = max(probability, 1 - probability)
            
            # Интерпретация риска
            if probability < 0.1:
                risk_level = "Очень низкий"
            elif probability < 0.3:
                risk_level = "Низкий"
            elif probability < 0.7:
                risk_level = "Средний"
            elif probability < 0.9:
                risk_level = "Высокий"
            else:
                risk_level = "Очень высокий"
            
            result = {
                "fraud_score": round(probability, 4),
                "is_fraud": is_fraud,
                "confidence": round(confidence, 4),
                "risk_level": risk_level,
                "threshold": threshold,
                "model_info": {
                    "model_name": self.metrics.get("model_name", "Unknown") if self.metrics else "Unknown",
                    "model_auc": self.metrics.get("roc_auc", "Unknown") if self.metrics else "Unknown"
                }
            }
            
            logger.info(f"Детальное предсказание: {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка детального предсказания: {e}")
            return {
                "error": str(e),
                "fraud_score": None,
                "is_fraud": None,
                "confidence": None
            }
    
    def batch_predict(self, transactions: list, threshold: float = 0.5) -> list:
        """
        Пакетное предсказание для нескольких транзакций.
        
        Args:
            transactions: Список транзакций
            threshold: Порог для классификации
            
        Returns:
            list: Список результатов предсказаний
        """
        results = []
        
        for i, transaction in enumerate(transactions):
            try:
                result = self.predict_with_details(transaction, threshold)
                result["transaction_id"] = i
                results.append(result)
            except Exception as e:
                logger.error(f"Ошибка предсказания для транзакции {i}: {e}")
                results.append({
                    "transaction_id": i,
                    "error": str(e),
                    "fraud_score": None,
                    "is_fraud": None
                })
        
        return results
    
    def get_model_info(self) -> Dict:
        """
        Получение информации о модели.
        
        Returns:
            Dict: Информация о модели
        """
        info = {
            "model_loaded": self.model is not None,
            "scaler_loaded": self.scaler is not None,
            "model_dir": self.model_dir
        }
        
        if self.metrics:
            info.update({
                "model_name": self.metrics.get("model_name", "Unknown"),
                "model_auc": self.metrics.get("roc_auc", "Unknown"),
                "feature_count": len(self.metrics.get("feature_names", []))
            })
        
        return info


# Глобальная переменная для хранения модели (синглтон)
_global_model = None

def get_model(model_dir: str = "../model") -> FraudDetectionModel:
    """
    Получение глобального экземпляра модели (синглтон).
    
    Args:
        model_dir: Путь к директории с моделью
        
    Returns:
        FraudDetectionModel: Экземпляр модели
    """
    global _global_model
    
    if _global_model is None:
        _global_model = FraudDetectionModel(model_dir)
    
    return _global_model

def predict_fraud(transaction_data: Dict, threshold: float = 0.5) -> Dict:
    """
    Быстрая функция для предсказания мошенничества.
    
    Args:
        transaction_data: Данные транзакции
        threshold: Порог для классификации
        
    Returns:
        Dict: Результат предсказания
    """
    model = get_model()
    return model.predict_with_details(transaction_data, threshold)

def validate_and_predict(transaction_data: Dict, threshold: float = 0.5) -> Dict:
    """
    Валидация и предсказание в одной функции.
    
    Args:
        transaction_data: Данные транзакции
        threshold: Порог для классификации
        
    Returns:
        Dict: Результат с валидацией и предсказанием
    """
    try:
        # Создаем временный препроцессор для валидации
        preprocessor = DataPreprocessor()
        is_valid, error_msg = preprocessor.validate_transaction_data(transaction_data)
        
        if not is_valid:
            return {
                "valid": False,
                "error": error_msg,
                "fraud_score": None,
                "is_fraud": None
            }
        
        # Если данные валидны, делаем предсказание
        result = predict_fraud(transaction_data, threshold)
        result["valid"] = True
        
        return result
        
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "fraud_score": None,
            "is_fraud": None
        }


if __name__ == "__main__":
    # Пример использования
    try:
        # Инициализация модели
        model = FraudDetectionModel()
        
        # Получение информации о модели
        info = model.get_model_info()
        print("Информация о модели:")
        for key, value in info.items():
            print(f"  {key}: {value}")
        
        # Создание примера транзакции
        from .preprocess import DataPreprocessor
        preprocessor = DataPreprocessor()
        sample_transaction = preprocessor.create_sample_transaction()
        
        print("\nПример транзакции:")
        print(sample_transaction)
        
        # Предсказание
        result = model.predict_with_details(sample_transaction)
        print("\nРезультат предсказания:")
        for key, value in result.items():
            print(f"  {key}: {value}")
            
    except Exception as e:
        print(f"Ошибка: {e}")
        print("Убедитесь, что модель обучена и сохранена в папке model/")