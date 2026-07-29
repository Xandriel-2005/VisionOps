# docker/Dockerfile.ml
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV/Ultralytics
RUN apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0 && apt-get clean

# Pre-install heavy ML dependencies
RUN pip install --no-cache-dir ultralytics mlflow psycopg2-binary
