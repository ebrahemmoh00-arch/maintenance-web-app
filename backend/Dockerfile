FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    BACKEND_CONTAINER_HOST=0.0.0.0 \
    BACKEND_CONTAINER_PORT=8000

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

COPY backend/app ./app

EXPOSE ${BACKEND_CONTAINER_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; port=os.getenv('BACKEND_CONTAINER_PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=3).read()" || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD sh -c 'uvicorn app.main:app --host "${BACKEND_CONTAINER_HOST:-0.0.0.0}" --port "${BACKEND_CONTAINER_PORT:-8000}"'
