#!/bin/bash

echo "--- Install Ubuntu packages:"
sudo apt -y install python-virtualenv build-essential python3-dev libgdal-dev
if [ "`lsb_release -rs`" = "14.04" ]; then
    sudo apt -y install spatialite-bin
else
    sudo apt -y install libsqlite3-mod-spatialite
fi
sudo apt -y install libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info

echo "--- Create virtualenv:"
[ -f env/bin/python3 ] || virtualenv -p python3 env

echo "--- Install python requirements:"
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal
./env/bin/pip install -U setuptools pip wheel
if [ "`lsb_release -rs`" = "14.04" ]; then
    ./env/bin/pip install gdal==1.10.0
elif [ "`lsb_release -rs`" = "16.04" ]; then
    ./env/bin/pip install gdal==1.11.2
elif [ "`lsb_release -rs`" = "18.04" ]; then
    ./env/bin/pip install gdal==2.2.4
else
    echo "WARNING! Failed to compute GDAL version. Use latest."
    ./env/bin/pip install gdal
fi
./env/bin/pip install -r requirements.txt
./env/bin/pip install -r dev-requirements.txt

echo "--- Setup:"
./env/bin/python3 setup.py develop

echo "--- Done"
