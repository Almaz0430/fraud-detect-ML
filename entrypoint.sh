#!/bin/bash

# Устанавливаем порт по умолчанию, если PORT не задан
PORT=${PORT:-8080}

# Запускаем gunicorn с правильным портом
exec gunicorn --bind 0.0.0.0:$PORT app.api:app