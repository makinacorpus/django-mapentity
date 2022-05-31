FROM makinacorpus/geodjango:bionic-3.6

RUN apt-get update -qq && apt-get install -y -qq \
    libsqlite3-mod-spatialite \
    libjpeg62 libjpeg62-dev zlib1g-dev libcairo2 libpango-1.0-0 \
    libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info && \
    apt-get clean all && rm -rf /var/apt/lists/* && rm -rf /var/cache/apt/*
RUN mkdir -p /code
RUN useradd -ms /bin/bash django
COPY . /code/src
RUN chown -R django:django /code

USER django
RUN python3.6 -m venv /code/venv

WORKDIR /code/src

RUN  /code/venv/bin/pip install --no-cache-dir pip setuptools wheel -U
# Install dev requirements
RUN /code/venv/bin/pip3 install --no-cache-dir -e .[dev] -U

CMD ["/code/venv/bin/python3.6", "manage.py", "runserver", "0.0.0.0:8000"]
