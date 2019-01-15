import os
from setuptools import setup, find_packages


here = os.path.abspath(os.path.dirname(__file__))

test_requires = [
    'mock',
    'factory_boy',
]

setup(
    name='mapentity',
    version='4.4.6',
    author='Makina Corpus',
    author_email='geobi@makina-corpus.com',
    url='https://github.com/makinacorpus/django-mapentity',
    download_url="http://pypi.python.org/pypi/mapentity/",
    description="Generic CRUD with maps",
    long_description=(open(os.path.join(here, 'README.rst')).read() + '\n\n' +
                      open(os.path.join(here, 'CHANGES')).read()),
    license='BSD, see LICENSE file.',
    install_requires=[
        'appy>=0.9.10',
        'BeautifulSoup4>=4.6.0',
        'Django>=1.11,<2',
        'GDAL>=1.10',
        'gpxpy>=1.1.2',
        'django-appypod>=1.0.0',
        'django-compressor>=2.2',
        'django-crispy-forms>=1.6.1',
        'django-embed-video>=1.1.2',
        'django-filter>=1.1.0',
        'django-geojson>=2.11.0',
        'django-leaflet>=0.19.0',
        'django-modeltranslation>=0.12.2',
        'django-shapes>=0.2.0',
        'django-tinymce>=2.6.0',
        'django-weasyprint==0.1',  # 0.5.x API changed
        'djangorestframework>=3.6.4,<3.9',  # 3.9 is not compatible with drf gis 0.13
        'djangorestframework-gis>=0.13',
        'easy-thumbnails>=2.5.0',
        'lxml>=4.2.1',
        'paperclip>=2.2.1',
        'requests>=2.20.0',
        'WeasyPrint<0.42',  # 0.42 drops support of python 2.7,
    ] + test_requires,
    tests_requires=test_requires,
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
                 'Programming Language :: Python :: 2.7'],
)
