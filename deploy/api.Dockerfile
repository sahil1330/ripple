FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY graph ./graph
COPY ingest ./ingest
COPY agents ./agents
COPY api ./api
COPY ripple_mcp ./ripple_mcp
COPY contracts ./contracts
COPY fixtures ./fixtures
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
