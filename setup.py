import os
from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))

test_requires = ['mock']


setup(
    name='mapentity',
    version='0.1.0',
    author='Makina Corpus',
    author_email='geobi@makina-corpus.com',
    url='https://github.com/makinacorpus/django-mapentity',
    download_url="http://pypi.python.org/pypi/mapentity/",
    description="Generic CRUD with maps",
    long_description=open(os.path.join(here, 'README.rst')).read() + '\n\n' +
                     open(os.path.join(here, 'CHANGES')).read(),
    license='BSD, see LICENSE file.',
    install_requires=[
        'Django >= 1.4',
        'GDAL == 1.9.1',
        'gpxpy == 0.7.1',
        'BeautifulSoup4 == 4.1.3',
        'requests == 1.1.0',
        'django-modeltranslation == 0.5.1',
        'django-shapes == 0.2.0',
        'django-floppyforms == 1.1',
        'django-crispy-forms == 1.2.3',
        'django-compressor == 1.3',
        'django-filter == 0.7',
        'django-tinymce',
        # Under development at makinacorpus
        'django-appypod>=0.0.2',
        'django-leaflet',
        'django-geojson',
        'paperclip',
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
