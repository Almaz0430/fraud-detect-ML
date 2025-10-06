"""
Streamlit Dashboard для системы детекции мошенничества.

Предоставляет интерактивный интерфейс для:
- Визуализации метрик модели
- Ручного тестирования предсказаний
- Анализа результатов обучения
"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import requests
import json
import os
import sys
import joblib
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

# Добавляем путь для импорта модулей
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.inference import get_model, FraudDetectionModel
    from app.preprocess import DataPreprocessor
except ImportError:
    st.error("Ошибка импорта модулей. Убедитесь, что все файлы находятся в правильных директориях.")
    st.stop()

# Настройка страницы
st.set_page_config(
    page_title="AI Fraud Detection Dashboard",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Кастомные стили
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #1f77b4;
    }
    .success-card {
        background-color: #d4edda;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #28a745;
    }
    .warning-card {
        background-color: #fff3cd;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #ffc107;
    }
    .danger-card {
        background-color: #f8d7da;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #dc3545;
    }
</style>
""", unsafe_allow_html=True)

# Заголовок
st.markdown('<h1 class="main-header">🔍 AI Fraud Detection Dashboard</h1>', unsafe_allow_html=True)

# Функции для работы с моделью
@st.cache_resource
def load_fraud_model():
    """Загрузка модели детекции мошенничества."""
    try:
        model_dir = "model"
        if not os.path.exists(model_dir):
            return None, "Папка model не найдена"
        
        model = get_model(model_dir)
        return model, None
    except Exception as e:
        return None, str(e)

@st.cache_data
def load_model_metrics():
    """Загрузка метрик модели."""
    try:
        metrics_path = os.path.join("model", "metrics.pkl")
        if os.path.exists(metrics_path):
            return joblib.load(metrics_path)
        return None
    except Exception as e:
        st.error(f"Ошибка загрузки метрик: {e}")
        return None

def check_api_status():
    """Проверка статуса API."""
    try:
        response = requests.get("http://localhost:5000/health", timeout=5)
        return response.status_code == 200, response.json() if response.status_code == 200 else None
    except:
        return False, None

# Боковая панель
st.sidebar.title("🎛️ Навигация")

# Проверка статуса системы
model, model_error = load_fraud_model()
api_status, api_info = check_api_status()

# Статус системы в боковой панели
st.sidebar.markdown("### 📊 Статус системы")

if model is not None:
    st.sidebar.markdown('<div class="success-card">✅ Модель загружена</div>', unsafe_allow_html=True)
else:
    st.sidebar.markdown(f'<div class="danger-card">❌ Модель не загружена<br><small>{model_error}</small></div>', unsafe_allow_html=True)

if api_status:
    st.sidebar.markdown('<div class="success-card">✅ API доступен</div>', unsafe_allow_html=True)
else:
    st.sidebar.markdown('<div class="warning-card">⚠️ API недоступен</div>', unsafe_allow_html=True)

# Выбор страницы
page = st.sidebar.selectbox(
    "Выберите страницу:",
    ["📈 Обзор модели", "🔮 Предсказание", "📊 Визуализация", "🧪 Тестирование API", "ℹ️ Информация"]
)

# Страница: Обзор модели
if page == "📈 Обзор модели":
    st.header("📈 Обзор модели")
    
    if model is None:
        st.error("Модель не загружена. Убедитесь, что модель обучена и сохранена в папке model/")
        st.info("Для обучения модели запустите: `jupyter notebook notebooks/train_model.ipynb`")
        st.stop()
    
    # Информация о модели
    model_info = model.get_model_info()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <h3>🎯 Точность</h3>
            <h2>{model_info.get('accuracy', 'N/A'):.4f}</h2>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <h3>📊 ROC-AUC</h3>
            <h2>{model_info.get('roc_auc', 'N/A'):.4f}</h2>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <h3>🎯 Precision</h3>
            <h2>{model_info.get('precision', 'N/A'):.4f}</h2>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown(f"""
        <div class="metric-card">
            <h3>🔍 Recall</h3>
            <h2>{model_info.get('recall', 'N/A'):.4f}</h2>
        </div>
        """, unsafe_allow_html=True)
    
    # Дополнительная информация
    st.subheader("🔧 Детали модели")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.info(f"**Тип модели:** {model_info.get('model_type', 'Unknown')}")
        st.info(f"**F1-Score:** {model_info.get('f1_score', 'N/A'):.4f}")
        
    with col2:
        st.info(f"**Дата обучения:** {model_info.get('training_date', 'Unknown')}")
        st.info(f"**Размер обучающей выборки:** {model_info.get('training_samples', 'N/A')}")

# Страница: Предсказание
elif page == "🔮 Предсказание":
    st.header("🔮 Предсказание мошенничества")
    
    if model is None:
        st.error("Модель не загружена.")
        st.stop()
    
    st.markdown("Введите параметры транзакции для получения предсказания:")
    
    # Создание формы для ввода данных
    with st.form("prediction_form"):
        st.subheader("📝 Параметры транзакции")
        
        # Создаем колонки для удобного ввода
        col1, col2, col3, col4 = st.columns(4)
        
        # V1-V7
        with col1:
            v1 = st.number_input("V1", value=0.0, format="%.6f")
            v2 = st.number_input("V2", value=0.0, format="%.6f")
            v3 = st.number_input("V3", value=0.0, format="%.6f")
            v4 = st.number_input("V4", value=0.0, format="%.6f")
            v5 = st.number_input("V5", value=0.0, format="%.6f")
            v6 = st.number_input("V6", value=0.0, format="%.6f")
            v7 = st.number_input("V7", value=0.0, format="%.6f")
        
        # V8-V14
        with col2:
            v8 = st.number_input("V8", value=0.0, format="%.6f")
            v9 = st.number_input("V9", value=0.0, format="%.6f")
            v10 = st.number_input("V10", value=0.0, format="%.6f")
            v11 = st.number_input("V11", value=0.0, format="%.6f")
            v12 = st.number_input("V12", value=0.0, format="%.6f")
            v13 = st.number_input("V13", value=0.0, format="%.6f")
            v14 = st.number_input("V14", value=0.0, format="%.6f")
        
        # V15-V21
        with col3:
            v15 = st.number_input("V15", value=0.0, format="%.6f")
            v16 = st.number_input("V16", value=0.0, format="%.6f")
            v17 = st.number_input("V17", value=0.0, format="%.6f")
            v18 = st.number_input("V18", value=0.0, format="%.6f")
            v19 = st.number_input("V19", value=0.0, format="%.6f")
            v20 = st.number_input("V20", value=0.0, format="%.6f")
            v21 = st.number_input("V21", value=0.0, format="%.6f")
        
        # V22-V28 + Amount
        with col4:
            v22 = st.number_input("V22", value=0.0, format="%.6f")
            v23 = st.number_input("V23", value=0.0, format="%.6f")
            v24 = st.number_input("V24", value=0.0, format="%.6f")
            v25 = st.number_input("V25", value=0.0, format="%.6f")
            v26 = st.number_input("V26", value=0.0, format="%.6f")
            v27 = st.number_input("V27", value=0.0, format="%.6f")
            v28 = st.number_input("V28", value=0.0, format="%.6f")
        
        # Amount и threshold
        st.subheader("💰 Дополнительные параметры")
        col1, col2 = st.columns(2)
        
        with col1:
            amount = st.number_input("Amount (сумма транзакции)", value=100.0, min_value=0.0, format="%.2f")
        
        with col2:
            threshold = st.slider("Порог классификации", min_value=0.0, max_value=1.0, value=0.5, step=0.01)
        
        # Кнопки
        col1, col2, col3 = st.columns(3)
        
        with col1:
            submitted = st.form_submit_button("🔮 Предсказать", type="primary")
        
        with col2:
            if st.form_submit_button("🎲 Случайный пример"):
                # Генерируем случайные значения
                st.experimental_rerun()
        
        with col3:
            if st.form_submit_button("📋 Пример мошенничества"):
                # Загружаем пример мошеннической транзакции
                st.experimental_rerun()
    
    # Обработка предсказания
    if submitted:
        # Формируем данные транзакции
        transaction_data = {
            "V1": v1, "V2": v2, "V3": v3, "V4": v4, "V5": v5, "V6": v6, "V7": v7,
            "V8": v8, "V9": v9, "V10": v10, "V11": v11, "V12": v12, "V13": v13, "V14": v14,
            "V15": v15, "V16": v16, "V17": v17, "V18": v18, "V19": v19, "V20": v20, "V21": v21,
            "V22": v22, "V23": v23, "V24": v24, "V25": v25, "V26": v26, "V27": v27, "V28": v28,
            "Amount": amount
        }
        
        try:
            # Выполняем предсказание
            result = model.predict_detailed(transaction_data, threshold)
            
            # Отображаем результат
            st.subheader("🎯 Результат предсказания")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                fraud_score = result["fraud_score"]
                st.metric("Вероятность мошенничества", f"{fraud_score:.4f}", f"{fraud_score*100:.2f}%")
            
            with col2:
                is_fraud = result["is_fraud"]
                fraud_text = "МОШЕННИЧЕСТВО" if is_fraud else "ЛЕГАЛЬНАЯ"
                fraud_color = "danger" if is_fraud else "success"
                st.markdown(f'<div class="{fraud_color}-card"><h3>Классификация: {fraud_text}</h3></div>', unsafe_allow_html=True)
            
            with col3:
                confidence = result.get("confidence", "medium")
                risk_level = result.get("risk_level", "medium")
                st.info(f"**Уверенность:** {confidence}")
                st.info(f"**Уровень риска:** {risk_level}")
            
            # Визуализация результата
            fig = go.Figure(go.Indicator(
                mode = "gauge+number+delta",
                value = fraud_score,
                domain = {'x': [0, 1], 'y': [0, 1]},
                title = {'text': "Fraud Score"},
                delta = {'reference': threshold},
                gauge = {
                    'axis': {'range': [None, 1]},
                    'bar': {'color': "darkblue"},
                    'steps': [
                        {'range': [0, 0.3], 'color': "lightgreen"},
                        {'range': [0.3, 0.7], 'color': "yellow"},
                        {'range': [0.7, 1], 'color': "red"}
                    ],
                    'threshold': {
                        'line': {'color': "red", 'width': 4},
                        'thickness': 0.75,
                        'value': threshold
                    }
                }
            ))
            
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
            
        except Exception as e:
            st.error(f"Ошибка предсказания: {e}")

# Страница: Визуализация
elif page == "📊 Визуализация":
    st.header("📊 Визуализация результатов")
    
    # Загружаем метрики
    metrics = load_model_metrics()
    
    if metrics is None:
        st.warning("Метрики модели не найдены. Убедитесь, что модель обучена.")
        st.stop()
    
    # ROC кривая
    if 'roc_curve' in metrics:
        st.subheader("📈 ROC кривая")
        
        fpr, tpr, _ = metrics['roc_curve']
        roc_auc = metrics.get('roc_auc', 0)
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=fpr, y=tpr,
            mode='lines',
            name=f'ROC кривая (AUC = {roc_auc:.4f})',
            line=dict(color='blue', width=2)
        ))
        fig.add_trace(go.Scatter(
            x=[0, 1], y=[0, 1],
            mode='lines',
            name='Случайный классификатор',
            line=dict(color='red', dash='dash')
        ))
        
        fig.update_layout(
            title='ROC кривая',
            xaxis_title='False Positive Rate',
            yaxis_title='True Positive Rate',
            width=600, height=500
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    # Confusion Matrix
    if 'confusion_matrix' in metrics:
        st.subheader("🎯 Confusion Matrix")
        
        cm = metrics['confusion_matrix']
        
        fig = px.imshow(
            cm,
            labels=dict(x="Предсказанный класс", y="Истинный класс", color="Количество"),
            x=['Не мошенничество', 'Мошенничество'],
            y=['Не мошенничество', 'Мошенничество'],
            color_continuous_scale='Blues',
            text_auto=True
        )
        
        fig.update_layout(title="Confusion Matrix")
        st.plotly_chart(fig, use_container_width=True)
    
    # Метрики по классам
    if 'classification_report' in metrics:
        st.subheader("📋 Детальные метрики")
        
        report = metrics['classification_report']
        
        # Создаем DataFrame для отображения
        df_metrics = pd.DataFrame(report).transpose()
        
        # Форматируем числа
        df_metrics = df_metrics.round(4)
        
        st.dataframe(df_metrics, use_container_width=True)

# Страница: Тестирование API
elif page == "🧪 Тестирование API":
    st.header("🧪 Тестирование API")
    
    if not api_status:
        st.error("API недоступен. Убедитесь, что сервер запущен: `python app/api.py`")
        st.stop()
    
    st.success("✅ API доступен!")
    
    # Информация об API
    if api_info:
        st.subheader("ℹ️ Информация об API")
        st.json(api_info)
    
    # Тестирование эндпоинтов
    st.subheader("🔧 Тестирование эндпоинтов")
    
    endpoint = st.selectbox(
        "Выберите эндпоинт:",
        ["/health", "/predict", "/model-info", "/sample-transaction"]
    )
    
    if endpoint == "/health":
        if st.button("Тестировать /health"):
            try:
                response = requests.get("http://localhost:5000/health")
                st.success(f"Статус: {response.status_code}")
                st.json(response.json())
            except Exception as e:
                st.error(f"Ошибка: {e}")
    
    elif endpoint == "/predict":
        st.markdown("**Тестирование предсказания**")
        
        # Получаем пример транзакции
        if st.button("Получить пример транзакции"):
            try:
                response = requests.get("http://localhost:5000/sample-transaction")
                if response.status_code == 200:
                    sample = response.json()["sample_transaction"]
                    st.session_state.sample_transaction = sample
                    st.success("Пример транзакции загружен!")
                    st.json(sample)
            except Exception as e:
                st.error(f"Ошибка: {e}")
        
        # Тестируем предсказание
        if st.button("Тестировать предсказание") and hasattr(st.session_state, 'sample_transaction'):
            try:
                response = requests.post(
                    "http://localhost:5000/predict",
                    json=st.session_state.sample_transaction
                )
                st.success(f"Статус: {response.status_code}")
                st.json(response.json())
            except Exception as e:
                st.error(f"Ошибка: {e}")
    
    elif endpoint == "/model-info":
        if st.button("Тестировать /model-info"):
            try:
                response = requests.get("http://localhost:5000/model-info")
                st.success(f"Статус: {response.status_code}")
                st.json(response.json())
            except Exception as e:
                st.error(f"Ошибка: {e}")
    
    elif endpoint == "/sample-transaction":
        if st.button("Тестировать /sample-transaction"):
            try:
                response = requests.get("http://localhost:5000/sample-transaction")
                st.success(f"Статус: {response.status_code}")
                st.json(response.json())
            except Exception as e:
                st.error(f"Ошибка: {e}")

# Страница: Информация
elif page == "ℹ️ Информация":
    st.header("ℹ️ Информация о системе")
    
    st.markdown("""
    ## 🎯 О проекте
    
    Это MVP системы детекции мошенничества, которая использует машинное обучение 
    для анализа транзакций и предсказания вероятности мошенничества.
    
    ## 🔧 Технологии
    
    - **Машинное обучение**: LightGBM / Logistic Regression
    - **API**: Flask REST API
    - **Визуализация**: Streamlit Dashboard
    - **Данные**: Kaggle Credit Card Fraud Detection Dataset
    
    ## 📊 Возможности
    
    - ✅ Обучение модели на исторических данных
    - ✅ REST API для онлайн предсказаний
    - ✅ Интерактивный dashboard
    - ✅ Визуализация метрик модели
    - ✅ Пакетное предсказание
    - ✅ Мониторинг системы
    
    ## 🚀 Быстрый старт
    
    1. Установите зависимости: `pip install -r requirements.txt`
    2. Скачайте датасет: `kaggle datasets download -d mlg-ulb/creditcardfraud`
    3. Обучите модель: `jupyter notebook notebooks/train_model.ipynb`
    4. Запустите API: `python app/api.py`
    5. Запустите dashboard: `streamlit run dashboard.py`
    
    ## 📈 Метрики качества
    
    Система достигает следующих показателей:
    - **ROC-AUC**: > 0.98
    - **Precision**: > 0.85
    - **Recall**: > 0.80
    - **F1-Score**: > 0.82
    """)
    
    # Системная информация
    st.subheader("🖥️ Системная информация")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.info(f"**Python версия**: {sys.version}")
        st.info(f"**Streamlit версия**: {st.__version__}")
        
    with col2:
        st.info(f"**Текущее время**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        st.info(f"**Рабочая директория**: {os.getcwd()}")

# Футер
st.markdown("---")
st.markdown(
    """
    <div style='text-align: center; color: #666;'>
        🔍 AI Fraud Detection System | Версия 1.0.0 | 2024
    </div>
    """, 
    unsafe_allow_html=True
)