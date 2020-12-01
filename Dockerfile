ARG BASE_IMAGE_TAG=bionic-3.6
FROM makinacorpus/geodjango:${BASE_IMAGE_TAG}

ENV ENV=prod
ENV SERVER_NAME="localhost"
ENV CONVERSION_HOST="convertit"
ENV CAPTURE_HOST="screamshotter"

ARG CPLUS_INCLUDE_PATH=/usr/include/gdal
ARG C_INCLUDE_PATH=/usr/include/gdal

RUN apt-get update && apt-get install -y \
    # spatialite
    libsqlite3-mod-spatialite \
    iproute2 \
    fonts-liberation \
    libcairo2 \
    libffi-dev  \
    libfreetype6-dev \
    libgdk-pixbuf2.0-dev \
    libpango1.0-0 \
    libpangocairo-1.0-0 \
    libssl-dev \
    libxml2-dev \
    libxslt-dev \
    software-properties-common \
    libffi-dev && \
    apt-get clean all && rm -rf /var/lib/apt/lists/* && rm -rf /var/cache/apt/*

RUN python3 -m venv /app/env
RUN /app/env/bin/pip install --no-cache-dir pip setuptools wheel -U
RUN . /app/env/bin/activate

COPY . /app/src
WORKDIR /app/src

# Install dev requirements
RUN /app/env/bin/pip3 install --no-cache-dir -e . -U
RUN . /app/env/bin/activate

ENTRYPOINT ["/bin/sh", "-e", "/app/src/docker/entrypoint.sh"]
