from appy.pod.renderer import Renderer
from appy.pod import PodError
import logging
import os
from tempfile import NamedTemporaryFile

from django.template import engines, TemplateDoesNotExist
from django.template.backends.base import BaseEngine
from django.template.context import make_context


logger = logging.getLogger(__name__)


class OdtTemplateError(Exception):
    pass


class OdtTemplates(BaseEngine):
    def __init__(self, params):
        params = params.copy()
        options = params.pop('OPTIONS').copy()
        super(OdtTemplates, self).__init__(params)

    def get_template_loaders(self):
        loaders = []

        for loader_name in engines['django'].engine.loaders:
            loader = engines['django'].engine.find_template_loader(loader_name)
            if loader is not None and hasattr(loader, 'get_template_sources'):
                loaders.append(loader)
        return tuple(loaders)


    def get_template(self, template_name, *args, **kwargs):
        if not template_name.endswith('.odt'):
            raise TemplateDoesNotExist(template_name)
        for loader in self.get_template_loaders():
            for origin in loader.get_template_sources(template_name):
                path = getattr(origin, 'name', origin)  # Django <1.9 compatibility
                if os.path.exists(path):
                    return Template(path)
        raise TemplateDoesNotExist(template_name)


class Template(object):
    def __init__(self, path):
        self.path = path

    def render(self, context=None, request=None):
        context_dict = make_context(context, request).flatten()
        output = None
        try:
            with NamedTemporaryFile('wb', suffix='.odt', delete=False) as f:
                output = f.name
                logger.debug("Render template '%s' to '%s'" % (self.path, output))
                renderer = Renderer(self.path, context_dict, output, overwriteExisting=True)
                renderer.run()
            result = open(output, 'rb').read()
        except (OSError, PodError) as e:
            logger.error("Cannot render '%s' : %s" % (self.path, e))
            raise OdtTemplateError(e)
        finally:
            if output and os.path.exists(output):
                os.unlink(output)
        return result
