FROM python:3.11-slim

# pyBKT is a source distribution whose setup.py imports numpy and lists the
# deprecated `sklearn` shim as a build requirement, so allow that shim during
# the build and install build tooling up front.
ENV SKLEARN_ALLOW_DEPRECATED_SKLEARN_PACKAGE_INSTALL=True \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

COPY main.py ./
COPY test_service.py ./

# The DKT checkpoint is optional and never baked into the image. Mount it at
# /app/checkpoints/dkt.pt (or point DKT_CHECKPOINT_PATH elsewhere) to enable it.
RUN mkdir -p /app/checkpoints

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
