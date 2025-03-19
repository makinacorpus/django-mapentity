import os
from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))


with open(os.path.join(here, 'mapentity', 'VERSION')) as version_file:
    VERSION = version_file.read().strip()


setup(
    name='mapentity',
    version=VERSION,
    author='Makina Corpus',
    author_email='geobi@makina-corpus.com',
    url='https://github.com/makinacorpus/django-mapentity',
    download_url="https://pypi.python.org/pypi/mapentity/",
    description="Generic CRUD with maps",
    long_description=(open(os.path.join(here, 'README.rst')).read()),
    license='BSD, see LICENSE file.',
    install_requires=[
        'BeautifulSoup4',
        'cairocffi',
        'Django',
        'tzdata',
        'django-appypod',
        'django-compressor',
        'django-crispy-forms>=2.0',
        'crispy-bootstrap4',
        'django-embed-video',
        'django-filter',
        'django-leaflet>=0.19,<0.20',  # leaflet 0.7.x
        'django-modeltranslation',
        'django-tinymce>=3',
        'django-weasyprint',
        'djangorestframework',
        'djangorestframework-gis',
        'djangorestframework-datatables',
        'easy-thumbnails',
        'fiona',
        'gpxpy',
        'lxml',
        'paperclip',
        'requests',
        'weasyprint',
    ],
    extras_require={
        'dev': [
            'django-debug-toolbar',
            'flake8',
            'freezegun',
            'factory_boy',
            'coverage',
            'tblib'
        ]
    },
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    python_requires='>=3.9',
    classifiers=['Topic :: Utilities',
                 'Natural Language :: English',
                 'Operating System :: OS Independent',
                 'Intended Audience :: Developers',
                 'Environment :: Web Environment',
                 'Framework :: Django',
                 'Development Status :: 5 - Production/Stable',
                 'Programming Language :: Python :: 3'],
)
