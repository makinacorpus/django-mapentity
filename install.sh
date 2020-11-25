#!/bin/bash

echo "--- Install Ubuntu packages:"
sudo apt -y install python-virtualenv build-essential python3-dev libgdal-dev
sudo apt -y install libsqlite3-mod-spatialite
sudo apt -y install libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info

echo "--- Create virtualenv:"
[ -f env/bin/python3 ] || virtualenv -p python3 env

echo "--- Install python requirements:"
./env/bin/pip install -U setuptools pip wheel
./env/bin/pip install Django==${DJANGO_VERSION:-2.2.*}
./env/bin/pip install -r requirements.txt
./env/bin/pip install -r dev-requirements.txt

echo "--- Install GDAL binding:"
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal
if [ "`lsb_release -rs`" = "16.04" ]; then
    ./env/bin/pip install gdal==1.11.2
elif [ "`lsb_release -rs`" = "18.04" ]; then
    ./env/bin/pip install gdal==2.2.4
elif [ "`lsb_release -rs`" = "19.10" ]; then
    ./env/bin/pip install gdal==2.4.3
elif [ "`lsb_release -rs`" = "20.04" ]; then
    ./env/bin/pip install gdal==3.0.4
else
    echo "WARNING! Failed to compute GDAL version."
fi

echo "--- Done"
