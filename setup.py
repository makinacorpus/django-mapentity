import os
from setuptools import setup, find_packages


here = os.path.abspath(os.path.dirname(__file__))

tests_require = [
    'freezegun',
    'factory_boy',
    'coverage',
]

setup(
    name='mapentity',
    version='6.1.1.dev0',
    author='Makina Corpus',
    author_email='geobi@makina-corpus.com',
    url='https://github.com/makinacorpus/django-mapentity',
    download_url="https://pypi.python.org/pypi/mapentity/",
    description="Generic CRUD with maps",
    long_description=(open(os.path.join(here, 'README.rst')).read() + '\n\n' +
                      open(os.path.join(here, 'CHANGES')).read()),
    license='BSD, see LICENSE file.',
    install_requires=[
        'BeautifulSoup4',
        'cairocffi',
        'Django',
        'django-appypod',
        'django-compressor',
        'django-crispy-forms',
        'django-embed-video',
        'django-filter',
        'django-geojson',
        'django-leaflet',
        'django-modeltranslation',
        'django-tinymce',
        'django-weasyprint',
        'djangorestframework',
        'djangorestframework-gis<=0.16',
        'django-modelcluster',
        'easy-thumbnails',
        'fiona',
        'gpxpy',
        'netifaces',
        'lxml',
        'paperclip',
        'requests',
        'WeasyPrint',
    ],
    tests_require=tests_require,
    extras_require={
        'dev': tests_require + [
            'django-debug-toolbar',
            'flake8'
        ]
    },
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    classifiers=['Topic :: Utilities',
                 'Natural Language :: English',
                 'Operating System :: OS Independent',
                 'Intended Audience :: Developers',
                 'Environment :: Web Environment',
                 'Framework :: Django',
                 'Development Status :: 5 - Production/Stable',
                 'Programming Language :: Python :: 3.5'],
)
