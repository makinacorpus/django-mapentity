import os
from distutils.command.build import build

from setuptools import setup, find_packages


here = os.path.abspath(os.path.dirname(__file__))

tests_require = [
    'freezegun',
    'factory_boy',
    'coverage',
]

here = os.path.abspath(os.path.dirname(__file__))


class BuildCommand(build):
    def run(self):
        """ Compile translation when install or build project. gettext should be installed """
        super().run()
        from django.core.management import call_command
        call_command('compilemessages')


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
    long_description=(open(os.path.join(here, 'README.rst')).read() + '\n\n' +
                      open(os.path.join(here, 'CHANGES')).read()),
    license='BSD, see LICENSE file.',
    setup_requires=['django'],  # allow compilemessages to work in setup.py
    cmdclass={"build": BuildCommand},
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
        'django-leaflet==0.19.post9',
        'django-modeltranslation',
        'django-tinymce<3.0',
        'django-weasyprint',
        'djangorestframework',
        'djangorestframework-gis',
        'django-modelcluster',
        'easy-thumbnails',
        'fiona',
        'gpxpy',
        'netifaces',
        'lxml',
        'paperclip',
        'requests',
        'WeasyPrint<53',  # 53 required pango 1.44+ not available on old ubuntu
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
    python_requires='>=3.6',
    classifiers=['Topic :: Utilities',
                 'Natural Language :: English',
                 'Operating System :: OS Independent',
                 'Intended Audience :: Developers',
                 'Environment :: Web Environment',
                 'Framework :: Django',
                 'Development Status :: 5 - Production/Stable',
                 'Programming Language :: Python :: 3'],
)
