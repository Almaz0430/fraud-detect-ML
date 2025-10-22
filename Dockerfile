FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app
COPY ./model /model

CMD gunicorn --bind 0.0.0.0:${PORT:-8080} app.api:app