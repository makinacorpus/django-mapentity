import os
import subprocess
from setuptools import setup, find_packages
from setuptools.command.build_py import build_py

here = os.path.abspath(os.path.dirname(__file__))


class BuildPyWithCompileMessages(build_py):
    """Custom build_py command that compiles Django translation files (.po -> .mo)."""

    def run(self):
        # First, run the standard build_py
        build_py.run(self)

        # Then compile messages in the build directory
        self.compile_messages()

    def compile_messages(self):
        """Compile .po files to .mo files using msgfmt in the build directory."""
        # Compile in the build directory where files have been copied
        build_locale_dir = os.path.join(self.build_lib, 'mapentity', 'locale')
        if not os.path.exists(build_locale_dir):
            return

        for lang in os.listdir(build_locale_dir):
            lang_dir = os.path.join(build_locale_dir, lang, 'LC_MESSAGES')
            if not os.path.isdir(lang_dir):
                continue

            for po_file in os.listdir(lang_dir):
                if po_file.endswith('.po'):
                    po_path = os.path.join(lang_dir, po_file)
                    mo_path = po_path[:-3] + '.mo'
                    try:
                        subprocess.run(
                            ['msgfmt', '-o', mo_path, po_path],
                            check=True,
                            capture_output=True
                        )
                        print(f"Compiled {po_path} -> {mo_path}")
                    except subprocess.CalledProcessError as e:
                        print(f"Warning: Failed to compile {po_path}: {e}")
                    except FileNotFoundError:
                        print("Warning: msgfmt not found. Install gettext to compile translations.")
                        return


with open(os.path.join(here, 'mapentity', 'VERSION')) as version_file:
    VERSION = version_file.read().strip()


setup(
    name='mapentity',
    version=VERSION,
    author='Makina Corpus',
    author_email='geobi@makina-corpus.com',
    url='https://github.com/makinacorpus/django-mapentity',
    download_url="https://pypi.python.org/pypi/mapentity/",
    description="Generic CRUD with maps for django",
    long_description="Mapentity is a django Framework to manage geographic entities through CRUD interface. Built with Maplibre, Bootstrap, Python and Django. Requires a spatial database backend.",
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
            'ruff',
            'freezegun',
            'factory_boy',
            'coverage',
            'tblib',
        ]
    },
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    #cmdclass={'build_py': BuildPyWithCompileMessages},
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
