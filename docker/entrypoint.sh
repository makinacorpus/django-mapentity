#!/usr/bin/env bash

set -e

cd /app/src

mkdir -p etc/conf

# When a volume is mounted to /app/src and venv are hidden
if [ "$ENV" = "dev" ]; then
    if [ ! -d env ]; then
        export ARG CPLUS_INCLUDE_PATH=/usr/include/gdal
        export ARG C_INCLUDE_PATH=/usr/include/gdal
        python3 -m venv env
        env/bin/pip install -U setuptools==45.2.0
        env/bin/pip install --no-cache-dir -r requirements.txt
    fi
fi

# Activate venv
. env/bin/activate

# Defaults POSTGRES_HOST to Docker host IP
export POSTGRES_HOST=${POSTGRES_HOST:-`ip route | grep default | sed 's/.* \([0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+\) .*/\1/'`}

# Defaults SECRET_KEY to a random value
SECRET_KEY_FILE=etc/conf/secret_key
if [ -z $SECRET_KEY ]; then
    if [ ! -f $SECRET_KEY_FILE ]; then
        echo "Generate a secret key"
        dd bs=48 count=1 if=/dev/urandom 2>/dev/null | base64 > $SECRET_KEY_FILE
        chmod go-r $SECRET_KEY_FILE
    fi
    export SECRET_KEY=`cat $SECRET_KEY_FILE`
fi

# wait for postgres
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -c '\q'; do
    >&2 echo "Postgres is unavailable - sleeping"
    sleep 1
done

>&2 echo "Postgres is up - executing command"

# exec
exec "$@"
