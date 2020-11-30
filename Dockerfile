ARG BASE_IMAGE_TAG=focal-3.8
FROM makinacorpus/geodjango:${BASE_IMAGE_TAG}

ENV ENV=prod
ENV SERVER_NAME="localhost"
# If POSTGRES_HOST is empty, entrypoint will set it to the IP of the docker host in the container
ENV POSTGRES_HOST=""
ENV POSTGRES_PORT="5432"
ENV POSTGRES_USER="dbuser"
ENV POSTGRES_PASSWORD="mapentity"
ENV POSTGRES_DB="mapentitydb"
ENV REDIS_HOST="redis"
ENV CONVERSION_HOST="convertit"
ENV CAPTURE_HOST="screamshotter"

ARG CPLUS_INCLUDE_PATH=/usr/include/gdal
ARG C_INCLUDE_PATH=/usr/include/gdal

WORKDIR /app/src

# Install postgis because raster2pgsl is required by manage.py loaddem
RUN apt-get update && apt-get install -y \
    unzip \
    sudo \
    less \
    nano \
    curl \
    git \
    iproute2 \
    software-properties-common \
    shared-mime-info \
    fonts-liberation \
    libssl-dev \
    libfreetype6-dev \
    libxml2-dev \
    libxslt-dev \
    libcairo2 \
    libpango1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-dev \
    libffi-dev && \
    apt-get install -y --no-install-recommends postgis && \
    apt-get clean all && rm -rf /var/lib/apt/lists/* && rm -rf /var/cache/apt/*

COPY requirements.txt requirements.txt
COPY dev-requirements.txt dev-requirements.txt
RUN python3 -m venv env
RUN env/bin/pip install -U setuptools==45.2.0
RUN env/bin/pip install --no-cache-dir -r requirements.txt
RUN env/bin/pip install --no-cache-dir -r dev-requirements.txt

COPY mapentity/ mapentity/
COPY manage.py manage.py
COPY docker/* /usr/local/bin/

RUN cd test_app; ENV=dev CONVERSION_HOST=localhost CAPTURE_HOST=localhost CUSTOM_SETTINGS_FILE= SECRET_KEY=tmp ../env/bin/python ../manage.py compilemessages; cd ..
RUN cd mapentity; ENV=dev CONVERSION_HOST=localhost CAPTURE_HOST=localhost CUSTOM_SETTINGS_FILE= SECRET_KEY=tmp ../env/bin/python ../manage.py compilemessages; cd ..

EXPOSE 8000
ENTRYPOINT ["/bin/sh", "-e", "/usr/local/bin/entrypoint.sh"]
CMD ["gunicorn", "geotrek.wsgi:application", "--bind=0.0.0.0:8000"]
