#!/bin/bash

echo "--- Install Ubuntu packages:"
sudo apt -y install python-virtualenv build-essential python3-dev gdal-bin binutils libproj-dev
sudo apt -y install libsqlite3-mod-spatialite
sudo apt -y install libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info

echo "--- Create virtualenv:"
[ -f env/bin/python3 ] || virtualenv -p python3 env

echo "--- Install python requirements:"
./env/bin/pip install -U setuptools pip wheel
./env/bin/pip install Django==${DJANGO_VERSION:-2.0.*}
./env/bin/pip install .[dev]

echo "--- Done"
