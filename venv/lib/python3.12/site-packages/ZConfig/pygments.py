##############################################################################
#
# Copyright (c) 2019 Zope Corporation and Contributors.
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
pygments-compatible lexer.

"""


import pygments.lexer
import pygments.token

import ZConfig.substitution


class ZConfigLexer(pygments.lexer.RegexLexer):
    """pygments lexer for ZConfig configuration syntax."""

    name = 'ZConfig'
    aliases = ['zconfig']

    tokens = {
        'root': [
            (r'\s+', pygments.token.Text),
            (r'(%%define)(\s+)(%s)(\s+)?'
             % ZConfig.substitution._name_re,
             pygments.lexer.bygroups(
                 pygments.token.Keyword, pygments.token.Whitespace,
                 pygments.token.Name, pygments.token.Whitespace),
             'value'),
            (r'(%import)(\s+)',
             pygments.lexer.bygroups(
                 pygments.token.Keyword, pygments.token.Whitespace),
             'value'),
            (r'(%include)(\s+)',
             pygments.lexer.bygroups(
                 pygments.token.Keyword, pygments.token.Whitespace),
             'value'),
            (r'(#.*?)$', pygments.token.Comment),
            (r'(<[^\s>]+)(\s*)(/?>)',
             pygments.lexer.bygroups(
                 pygments.token.Name.Tag, pygments.token.Whitespace,
                 pygments.token.Name.Tag)),
            (r'(<[^\s>]+)(?:(\s+)([^/>]*))?(\s*)(/?>)',
             pygments.lexer.bygroups(
                 pygments.token.Name.Tag, pygments.token.Whitespace,
                 pygments.token.Name, pygments.token.Whitespace,
                 pygments.token.Name.Tag)),
            (r'([a-z]\w*)(\s+)',
             pygments.lexer.bygroups(
                 pygments.token.Name, pygments.token.Whitespace),
             'value'),
            (r'[^\n]+', pygments.token.Text),
        ],
        'value': [
            (r'\$\$', pygments.token.String.Escape),
            (r'(\${)(%s)(})' % ZConfig.substitution._name_re,
             pygments.lexer.bygroups(
                 pygments.token.String.Interpol, pygments.token.Name,
                 pygments.token.String.Interpol)),
            (r'(\$)(%s)' % ZConfig.substitution._name_re,
             pygments.lexer.bygroups(
                 pygments.token.String.Interpol, pygments.token.Name)),
            (r'\n', pygments.token.Text, '#pop'),
            (r'.[^\n$]*', pygments.token.String),
        ],
    }
