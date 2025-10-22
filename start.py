#!/usr/bin/env python3
import os
import subprocess
import sys

# Получаем порт из переменной окружения или используем 8080 по умолчанию
port = os.environ.get('PORT', '8080')

# Формируем команду для запуска gunicorn
cmd = [
    'gunicorn',
    '--bind', f'0.0.0.0:{port}',
    'app.api:app'
]

print(f"Starting gunicorn on port {port}")
print(f"Command: {' '.join(cmd)}")

# Запускаем gunicorn
try:
    subprocess.run(cmd, check=True)
except subprocess.CalledProcessError as e:
    print(f"Error starting gunicorn: {e}")
    sys.exit(1)