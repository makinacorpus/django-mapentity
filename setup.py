import os
from setuptools import setup, find_packages


here = os.path.abspath(os.path.dirname(__file__))

setup(
    name='mapentity',
    version='6.1.0',
    author='Makina Corpus',
    author_email='geobi@makina-corpus.com',
    url='https://github.com/makinacorpus/django-mapentity',
    download_url="http://pypi.python.org/pypi/mapentity/",
    description="Generic CRUD with maps",
    long_description=(open(os.path.join(here, 'README.rst')).read() + '\n\n' +
                      open(os.path.join(here, 'CHANGES')).read()),
    license='BSD, see LICENSE file.',
    install_requires=[
        'BeautifulSoup4',
        'Django',
        # 'GDAL',  # Depends on installed libgdal version
        'gpxpy',
        'django-appypod',
        'appy-python-3',
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
        'djangorestframework-gis',
        'easy-thumbnails',
        'lxml',
        'paperclip',
        'requests',
        'WeasyPrint',
    ],
    tests_require=[
        'factory_boy',
        'sphinx',
    ],
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
