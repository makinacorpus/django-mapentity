FROM python:3.9-trixie

RUN apt-get update -qq && apt-get install -y -qq \
    binutils libproj-dev gdal-bin libsqlite3-mod-spatialite \
    libjpeg62 zlib1g-dev libcairo2 libpango-1.0-0 \
    libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libffi-dev shared-mime-info \
    libldap2-dev libsasl2-dev gettext npm && \
    apt-get clean all && rm -rf /var/apt/lists/* && rm -rf /var/cache/apt/*

RUN mkdir -p /code
RUN useradd -ms /bin/bash django
RUN chown -R django:django /code

COPY --chown=django:django . /code/src

USER django
RUN python3.9 -m venv /code/venv

WORKDIR /code/src

RUN  /code/venv/bin/pip install --no-cache-dir pip setuptools wheel -U
# Install dev requirements
RUN /code/venv/bin/pip3 install --no-cache-dir -e .[dev] -U

# Activate venv through entrypoint
COPY --chown=django:django docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["manage.py", "runserver", "0.0.0.0:8000"]
