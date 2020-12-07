import os
from setuptools import setup, find_packages

HERE = os.path.abspath(os.path.dirname(__file__))

README = open(os.path.join(HERE, 'README.rst')).read()
CHANGES = open(os.path.join(HERE, 'CHANGES')).read()

test_require=[
    'factory-boy',
    'freezegun',
    'sphinx',
    'flake8',
]

setup(
    name='mapentity',
    version='7.0.0.dev0',
    author='Makina Corpus',
    author_email='geobi@makina-corpus.com',
    url='https://github.com/makinacorpus/django-mapentity',
    download_url="http://pypi.python.org/pypi/mapentity/",
    description="Generic CRUD with maps",
    long_description=README + '\n\n' + CHANGES,
    license='BSD, see LICENSE file.',
    classifiers=[
        'Topic :: Utilities',
        'Natural Language :: English',
        'Operating System :: OS Independent',
        'Intended Audience :: Developers',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Development Status :: 5 - Production/Stable',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
    ],
    install_requires=[
        'Django>=2.2',
        'djangorestframework',
        'djangorestframework-gis',
        'BeautifulSoup4',
        'gpxpy',
        'django-appypod',
        'appy-python-3',
        'django-compressor',
        'django-crispy-forms',
        'django-embed-video',
        'django-filter',
        'django-geojson',
        'django-leaflet@https://github.com/GeotrekCE/django-leaflet/archive/0.19+geotrek8.tar.gz',
        'django-modeltranslation',
        'django-tinymce',
        'django-weasyprint',
        'easy-thumbnails',
        'Fiona',
        'lxml',
        'netifaces',
        'paperclip',
        'requests[security]',
        'WeasyPrint',
    ],
    tests_require=test_require,
    extras_require={
        'dev': test_require + [
            'django-debug-toolbar',
            'ipython',
        ]
    },
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
)
