"""
Модуль предобработки данных для системы детекции мошенничества.

Содержит функции для:
- Валидации входных данных
- Нормализации признаков
- Подготовки данных для модели
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib
import os
from typing import Dict, List, Union, Tuple
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataPreprocessor:
    """Класс для предобработки данных транзакций."""
    
    def __init__(self, scaler_path: str = None):
        """
        Инициализация препроцессора.
        
        Args:
            scaler_path: Путь к сохраненному скейлеру
        """
        self.scaler = None
        self.feature_names = None
        
        if scaler_path and os.path.exists(scaler_path):
            self.load_scaler(scaler_path)
    
    def load_scaler(self, scaler_path: str) -> None:
        """
        Загрузка сохраненного скейлера.
        
        Args:
            scaler_path: Путь к файлу скейлера
        """
        try:
            self.scaler = joblib.load(scaler_path)
            logger.info(f"Скейлер загружен из {scaler_path}")
        except Exception as e:
            logger.error(f"Ошибка загрузки скейлера: {e}")
            raise
    
    def validate_transaction_data(self, data: Dict) -> Tuple[bool, str]:
        """
        Валидация данных транзакции.
        
        Args:
            data: Словарь с данными транзакции
            
        Returns:
            Tuple[bool, str]: (валидность, сообщение об ошибке)
        """
        required_features = [
            'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
            'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20',
            'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28', 'Amount'
        ]
        
        # Проверка наличия всех необходимых признаков
        missing_features = [f for f in required_features if f not in data]
        if missing_features:
            return False, f"Отсутствуют признаки: {missing_features}"
        
        # Проверка типов данных
        for feature in required_features:
            try:
                float(data[feature])
            except (ValueError, TypeError):
                return False, f"Признак {feature} должен быть числом"
        
        # Проверка разумных диапазонов для Amount
        amount = float(data['Amount'])
        if amount < 0:
            return False, "Сумма транзакции не может быть отрицательной"
        
        if amount > 100000:  # Разумный верхний предел
            logger.warning(f"Очень большая сумма транзакции: {amount}")
        
        return True, "OK"
    
    def prepare_features(self, data: Dict) -> np.ndarray:
        """
        Подготовка признаков для модели.
        
        Args:
            data: Словарь с данными транзакции
            
        Returns:
            np.ndarray: Подготовленные признаки
        """
        # Валидация данных
        is_valid, error_msg = self.validate_transaction_data(data)
        if not is_valid:
            raise ValueError(f"Ошибка валидации: {error_msg}")
        
        # Создание DataFrame
        feature_names = [
            'Time', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
            'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20',
            'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28', 'Amount'
        ]
        
        # Добавляем Time = 0 если не указано (для совместимости с обученной моделью)
        if 'Time' not in data:
            data['Time'] = 0
        
        # Создаем массив признаков в правильном порядке
        features = []
        for feature in feature_names:
            features.append(float(data[feature]))
        
        features_array = np.array(features).reshape(1, -1)
        
        # Нормализация с помощью загруженного скейлера
        if self.scaler is None:
            raise ValueError("Скейлер не загружен. Используйте load_scaler()")
        
        normalized_features = self.scaler.transform(features_array)
        
        return normalized_features
    
    def create_sample_transaction(self) -> Dict:
        """
        Создание примера транзакции для тестирования.
        
        Returns:
            Dict: Пример данных транзакции
        """
        return {
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


def load_and_preprocess_data(csv_path: str) -> Tuple[np.ndarray, np.ndarray]:
    """
    Загрузка и предобработка данных из CSV файла.
    
    Args:
        csv_path: Путь к CSV файлу с данными
        
    Returns:
        Tuple[np.ndarray, np.ndarray]: (признаки, целевая переменная)
    """
    try:
        # Загрузка данных
        df = pd.read_csv(csv_path)
        logger.info(f"Данные загружены из {csv_path}. Размер: {df.shape}")
        
        # Проверка наличия необходимых колонок
        required_columns = ['Class'] + [f'V{i}' for i in range(1, 29)] + ['Amount', 'Time']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise ValueError(f"Отсутствуют колонки: {missing_columns}")
        
        # Разделение на признаки и целевую переменную
        X = df.drop(['Class'], axis=1)
        y = df['Class']
        
        # Проверка на пропущенные значения
        if X.isnull().sum().sum() > 0:
            logger.warning("Обнаружены пропущенные значения. Заполняем медианой.")
            X = X.fillna(X.median())
        
        logger.info(f"Предобработка завершена. Признаки: {X.shape}, Целевая переменная: {y.shape}")
        
        return X.values, y.values
        
    except Exception as e:
        logger.error(f"Ошибка при загрузке и предобработке данных: {e}")
        raise


def create_scaler_from_data(X: np.ndarray, save_path: str = None) -> StandardScaler:
    """
    Создание и обучение скейлера на данных.
    
    Args:
        X: Массив признаков
        save_path: Путь для сохранения скейлера
        
    Returns:
        StandardScaler: Обученный скейлер
    """
    scaler = StandardScaler()
    scaler.fit(X)
    
    if save_path:
        joblib.dump(scaler, save_path)
        logger.info(f"Скейлер сохранен в {save_path}")
    
    return scaler


# Функции для быстрого использования
def validate_api_input(data: Dict) -> Tuple[bool, str]:
    """
    Быстрая валидация входных данных для API.
    
    Args:
        data: Данные транзакции
        
    Returns:
        Tuple[bool, str]: (валидность, сообщение)
    """
    preprocessor = DataPreprocessor()
    return preprocessor.validate_transaction_data(data)


def preprocess_for_prediction(data: Dict, scaler_path: str) -> np.ndarray:
    """
    Предобработка данных для предсказания.
    
    Args:
        data: Данные транзакции
        scaler_path: Путь к скейлеру
        
    Returns:
        np.ndarray: Подготовленные признаки
    """
    preprocessor = DataPreprocessor(scaler_path)
    return preprocessor.prepare_features(data)


if __name__ == "__main__":
    # Пример использования
    preprocessor = DataPreprocessor()
    
    # Создание примера транзакции
    sample_data = preprocessor.create_sample_transaction()
    print("Пример транзакции:")
    print(sample_data)
    
    # Валидация
    is_valid, message = preprocessor.validate_transaction_data(sample_data)
    print(f"\nВалидация: {is_valid}, Сообщение: {message}")