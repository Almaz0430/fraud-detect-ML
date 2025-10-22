FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app
COPY ./model /model
COPY start.py /start.py

EXPOSE 8080
CMD ["python", "/start.py"]