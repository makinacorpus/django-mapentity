import json
from HTMLParser import HTMLParser

from django.core.serializers.json import DateTimeAwareJSONEncoder
from django.core.serializers import serialize
from django.db.models.query import QuerySet
from django.utils.functional import Promise, curry
from django.utils.encoding import force_unicode
from django.utils.encoding import smart_str
from django.utils.html import strip_tags


__all__ = ['plain_text',
           'smart_plain_text',
           'field_as_string',
           'CSVSerializer',
           'GPXSerializer',
           'DatatablesSerializer',
           'ZipShapeSerializer',
           'DjangoJSONEncoder',
           'json_django_dumps']


def plain_text(html):
    h = HTMLParser()
    return h.unescape(strip_tags(html))


def smart_plain_text(s, ascii=False):
    if s is None:
        return ''
    try:
        # Converts to unicode, remove HTML tags, convert HTML entities
        us = plain_text(unicode(s))
        if ascii:
            return smart_str(us)
        return us
    except UnicodeDecodeError:
        return smart_str(s)


from .commasv import field_as_string, CSVSerializer
from .gpx import GPXSerializer
from .datatables import DatatablesSerializer
from .shapefile import ZipShapeSerializer


class DjangoJSONEncoder(DateTimeAwareJSONEncoder):
    """
    Taken (slightly modified) from:
    http://stackoverflow.com/questions/2249792/json-serializing-django-models-with-simplejson
    """
    def default(self, obj):
        # https://docs.djangoproject.com/en/dev/topics/serialization/#id2
        if isinstance(obj, Promise):
            return force_unicode(obj)
        if isinstance(obj, QuerySet):
            # `default` must return a python serializable
            # structure, the easiest way is to load the JSON
            # string produced by `serialize` and return it
            return json.loads(serialize('json', obj))
        return super(DjangoJSONEncoder, self).default(obj)

# partial function, we can now use dumps(my_dict) instead
# of dumps(my_dict, cls=DjangoJSONEncoder)
json_django_dumps = curry(json.dumps, cls=DjangoJSONEncoder)
