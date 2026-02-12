##############################################################################
#
# Copyright (c) 2003, 2018 Zope Foundation and Contributors.
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
"""ZConfig factory datatypes for log handlers."""

import functools
import sys
import urllib.parse
from abc import abstractmethod

import ZConfig.components.logger.formatter
from ZConfig.components.logger.factory import Factory


_log_format_variables = (
    ZConfig.components.logger.formatter._log_format_variables)


def log_format(value):
    value = ZConfig.components.logger.formatter.ctrl_char_insert(value)
    try:
        # Make sure the format string uses only names that will be
        # provided, and has reasonable type flags for each, and does
        # not expect positional args.
        value % _log_format_variables
    except (ValueError, KeyError):
        raise ValueError('Invalid log format string %s' % value)
    return value


# Backward compatibility, because paranoia is our friend:
ctrl_char_insert = ZConfig.components.logger.formatter.ctrl_char_insert
resolve = ZConfig.components.logger.formatter.resolve


class HandlerFactory(Factory):

    def __init__(self, section):
        Factory.__init__(self)
        self.section = section
        factory = ZConfig.components.logger.formatter.FormatterFactory(section)
        self.create_formatter = factory

    @abstractmethod
    def create_loghandler(self):
        "subclasses must override create_loghandler()"

    def create(self):
        logger = self.create_loghandler()
        logger.setFormatter(self.create_formatter())
        logger.setLevel(self.section.level)
        return logger

    def getLevel(self):  # pragma: no cover Is this used?
        return self.section.level


class FileHandlerFactory(HandlerFactory):

    def __init__(self, section):
        HandlerFactory.__init__(self, section)

        from ZConfig.components.logger import loghandler
        path = section.path
        max_bytes = section.max_size
        old_files = section.old_files
        when = section.when
        interval = section.interval
        encoding = section.encoding
        delay = section.delay

        def check_std_stream():
            if max_bytes or old_files or when:
                raise ValueError("cannot rotate " + path)
            if delay:
                raise ValueError("cannot delay opening " + path)
            if encoding:
                raise ValueError("cannot specify encoding for " + path)

        if path == "STDERR":
            check_std_stream()

            def factory():
                return loghandler.StreamHandler(sys.stderr)

        elif path == "STDOUT":
            check_std_stream()

            def factory():
                return loghandler.StreamHandler(sys.stdout)

        elif when or max_bytes or old_files or interval:
            if not old_files:
                raise ValueError("old-files must be set for log rotation")
            if when:
                if max_bytes:
                    raise ValueError("can't set *both* max_bytes and when")
                if not interval:
                    interval = 1
                factory = functools.partial(
                    loghandler.TimedRotatingFileHandler,
                    path, when=when, interval=interval,
                    backupCount=old_files, encoding=encoding, delay=delay)
            elif max_bytes:
                factory = functools.partial(
                    loghandler.RotatingFileHandler,
                    path, maxBytes=max_bytes, backupCount=old_files,
                    encoding=encoding, delay=delay)
            else:
                raise ValueError(
                    "max-bytes or when must be set for log rotation")
        else:
            factory = functools.partial(
                loghandler.FileHandler,
                path, encoding=encoding, delay=delay)

        self._factory = factory

    def create_loghandler(self):
        return self._factory()


_syslog_facilities = {
    "auth": 1,
    "authpriv": 1,
    "cron": 1,
    "daemon": 1,
    "kern": 1,
    "lpr": 1,
    "mail": 1,
    "news": 1,
    "security": 1,
    "syslog": 1,
    "user": 1,
    "uucp": 1,
    "local0": 1,
    "local1": 1,
    "local2": 1,
    "local3": 1,
    "local4": 1,
    "local5": 1,
    "local6": 1,
    "local7": 1,
}


def syslog_facility(value):
    value = value.lower()
    if value not in _syslog_facilities:
        L = sorted(_syslog_facilities.keys())
        raise ValueError("Syslog facility must be one of " + ", ".join(L))
    return value


class SyslogHandlerFactory(HandlerFactory):

    def create_loghandler(self):
        from ZConfig.components.logger import loghandler
        return loghandler.SysLogHandler(self.section.address.address,
                                        self.section.facility)


class Win32EventLogFactory(HandlerFactory):

    def create_loghandler(self):
        from ZConfig.components.logger import loghandler
        return loghandler.Win32EventLogHandler(self.section.appname)


def http_handler_url(value):
    scheme, netloc, path, param, query, fragment = urllib.parse.urlparse(value)
    if scheme != 'http':
        raise ValueError('url must be an http url')
    if not netloc:
        raise ValueError('url must specify a location')
    if not path:
        raise ValueError('url must specify a path')
    q = []
    if param:
        q.append(';')
        q.append(param)
    if query:
        q.append('?')
        q.append(query)
    if fragment:
        q.append('#')
        q.append(fragment)
    return (netloc, path + ''.join(q))


def get_or_post(value):
    value = value.upper()
    if value not in ('GET', 'POST'):
        raise ValueError('method must be "GET" or "POST", instead received: '
                         + repr(value))
    return value


class HTTPHandlerFactory(HandlerFactory):

    def create_loghandler(self):
        from ZConfig.components.logger import loghandler
        host, selector = self.section.url
        return loghandler.HTTPHandler(host, selector, self.section.method)


class SMTPHandlerFactory(HandlerFactory):

    def __init__(self, section):
        HandlerFactory.__init__(self, section)
        username = self.section.smtp_username
        password = self.section.smtp_password
        if (username or password) and not (username and password):
            raise ValueError(
                'Either both smtp-username and smtp-password or none must be '
                'given')

    def create_loghandler(self):
        from ZConfig.components.logger import loghandler
        host, port = self.section.smtp_server
        if not port:
            mailhost = host
        else:
            mailhost = host, port
        kwargs = {}
        if self.section.smtp_username:
            kwargs['credentials'] = (self.section.smtp_username,
                                     self.section.smtp_password)
        return loghandler.SMTPHandler(mailhost,
                                      self.section.fromaddr,
                                      self.section.toaddrs,
                                      self.section.subject,
                                      **kwargs)
