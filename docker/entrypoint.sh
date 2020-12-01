#!/usr/bin/env bash

set -e

cd /app/src

# Activate venv
. /app/env/bin/activate

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

# exec
exec "$@"
