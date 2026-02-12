##############################################################################
#
# Copyright (c) 2018 Zope Foundation and Contributors.
# All Rights Reserved.
#
# This software is subject to the provisions of the Zope Public License,
# Version 2.1 (ZPL).  A copy of the ZPL should accompany this distribution.
# THIS SOFTWARE IS PROVIDED "AS IS" AND ANY AND ALL EXPRESS OR IMPLIED
# WARRANTIES ARE DISCLAIMED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF TITLE, MERCHANTABILITY, AGAINST INFRINGEMENT, AND FITNESS
# FOR A PARTICULAR PURPOSE.
#
##############################################################################
"""\
ZConfig log message formatting support.

"""

import inspect
import logging
import string


class PercentStyle:

    logging_style = '%'
    default_format = '%(message)s'
    asctime_format = '%(asctime)s'
    asctime_search = '%(asctime)'

    def __init__(self, fmt):
        self._fmt = fmt or self.default_format

    def usesTime(self):
        return self._fmt.find(self.asctime_search) >= 0

    def format(self, record):
        return self._fmt % record.__dict__


class StrFormatStyle(PercentStyle):

    logging_style = '{'
    default_format = '{message}'
    asctime_format = '{asctime}'
    asctime_search = '{asctime'

    __formatter = string.Formatter()

    def format(self, record):
        return self.__formatter.vformat(self._fmt, (), record.__dict__)


class StringTemplateStyle(PercentStyle):

    logging_style = '$'
    default_format = '${message}'
    asctime_format = '${asctime}'
    asctime_search = '${asctime}'

    def __init__(self, fmt):
        self._fmt = fmt or self.default_format
        self._tpl = string.Template(self._fmt)

    def usesTime(self):
        fmt = self._fmt
        return fmt.find('$asctime') >= 0 or fmt.find(self.asctime_format) >= 0

    def format(self, record):
        return self._tpl.substitute(record.__dict__)


class SafeStringTemplateStyle(StringTemplateStyle):

    logging_style = None

    def format(self, record):
        return self._tpl.safe_substitute(record.__dict__)


_control_char_rewrites = {r'\n': '\n', r'\t': '\t', r'\b': '\b',
                          r'\f': '\f', r'\r': '\r'}.items()

_log_format_styles = {
    'classic': PercentStyle,
    'format': StrFormatStyle,
    'template': StringTemplateStyle,
    'safe-template': SafeStringTemplateStyle,
}

_log_format_variables = {
    'name': __name__,
    'levelno': 3,
    'levelname': 'DEBUG',
    'pathname': 'apath',
    'filename': 'afile',
    'module': 'amodule',
    'lineno': 1,
    'created': 1.1,
    'asctime': 'atime',
    'msecs': 1.1,
    'relativeCreated': 1.1,
    'thread': 1,
    'message': 'amessage',
    'process': 1,
    'funcName': 'fname',
}


def ctrl_char_insert(value):
    for pattern, replacement in _control_char_rewrites:
        value = value.replace(pattern, replacement)
    return value


def escaped_string(value):
    return ctrl_char_insert(value)


def log_format_style(value):
    if value.lower() in _log_format_styles:
        return value.lower()
    raise ValueError(
        'log_format_style must be one of %s; found %r'
        % ((', '.join(repr(v) for v in sorted(_log_format_styles))),
           value)
    )


def resolve(name):
    """Given a dotted name, returns an object imported from a Python module."""
    name = name.split('.')
    used = name.pop(0)
    found = __import__(used)
    for n in name:
        used += '.' + n
        try:
            found = getattr(found, n)
        except AttributeError:
            __import__(used)
            found = getattr(found, n)
    return found


class AnyFieldDict(dict):
    # Only used for format string validation.

    def __getitem__(self, key):
        if key in self:
            # Avoid magic for known keys; better to provide a sample
            # value of an appropriate type when there is such a thing.
            return dict.__getitem__(self, key)
        else:
            # Using an int as the default works with "reasonable" values
            # that might be formatted in a logging configuration:
            #
            # - str/repr are safe
            # - numeric formatting is safe, allowing for casting to float
            #
            return 42


class FormatterFactory:

    def __init__(self, section):
        self.format = section.format
        self.dateformat = section.dateformat
        self.style = section.style
        self.stylist = _log_format_styles[self.style](self.format)
        self.formatter = section.formatter or 'logging.Formatter'
        if section.formatter:
            self.factory = resolve(section.formatter)
        else:
            self.factory = logging.Formatter

        if inspect.isclass(self.factory):
            func = self.factory.__init__
        else:
            func = self.factory
        params = inspect.signature(func).parameters
        self._has_style_param = 'style' in params

        # Check that the format specified complies with the style; we
        # just want the format call to not fall over.  If it does, the
        # exception will propagate and generate a (hopefully)
        # informative error.
        #
        record = logging.LogRecord(__name__, logging.INFO, __file__,
                                   42, 'some message', (), None)
        record.__dict__.update(_log_format_variables)
        if section.arbitrary_fields:
            fields = AnyFieldDict()
            fields.update(record.__dict__)
            record.__dict__ = fields
        try:
            self.stylist.format(record)
        except IndexError:
            #
            # We're checking this exception to catch & report
            # format-style templates that used {} or {#} placeholders,
            # since those aren't allowed when formatting with a mapping.
            #
            raise ValueError('%s formats cannot use positional placeholders')

    def __call__(self):
        #
        # Need to determine if we should pass
        # style=self.message_formatter.logging_style, or if we need to
        # clobber usesTime and formatMessage directly.
        #
        stylist = self.stylist
        if self._has_style_param:
            if stylist.logging_style:
                formatter = self.factory(self.format, self.dateformat,
                                         style=stylist.logging_style)
            else:
                # A formatter class that supports style, but our style is
                # non-standard, so we reach under the covers a bit.
                #
                # Python has a validate option, defaulting to True,
                # which causes the format string to be checked.  Since
                # safe-template is not a standard style, we want to
                # suppress this.
                #
                kwargs = dict()
                kwargs['validate'] = False
                formatter = self.factory(self.format, self.dateformat,
                                         style='$', **kwargs)
                assert formatter._style._fmt == self.format
                formatter._style = stylist
        else:
            formatter = self.factory(self.format, self.dateformat)
            if self.style != 'classic':
                #
                # Should verify that these are defined by
                # logging.Formatter; if not, we risk losing
                # functionality, and should scream so as to avoid
                # surprises.
                #
                formatter.usesTime = stylist.usesTime
                formatter.formatMessage = stylist.format
        return formatter
