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
Tests for ZConfig.pygments.ZConfigLexer.

"""


import unittest


try:
    import pygments.lexer
    import pygments.token
except ModuleNotFoundError:
    pygments = None
else:
    import ZConfig.pygments


class ZConfigLexerTestCase(unittest.TestCase):

    def setUp(self):
        if pygments is None:
            self.skipTest('pygments is not available')

    def test_comment(self):
        expected = [
            (pygments.token.Text, '  '),
            (pygments.token.Comment, '# some crazy text'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            '  # some crazy text\n'))
        self.assertEqual(t, expected)

    def test_option_without_substitutions(self):
        expected = [
            (pygments.token.Name, 'logdir'),
            (pygments.token.Whitespace, ' \t'),
            (pygments.token.String, '/var/log/myapp'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            'logdir \t/var/log/myapp\n'))
        self.assertEqual(t, expected)

    def test_option_with_substitutions(self):
        expected = [
            (pygments.token.Name, 'logdir'),
            (pygments.token.Whitespace, ' \t'),
            (pygments.token.String, '/var/log/'),
            (pygments.token.String.Escape, '$$'),
            (pygments.token.String, '-'),
            (pygments.token.String.Interpol, '$'),
            (pygments.token.Name, 'conf'),
            (pygments.token.String, '-'),
            (pygments.token.String.Interpol, '${'),
            (pygments.token.Name, 'fnoc'),
            (pygments.token.String.Interpol, '}'),
            (pygments.token.String, '-monthly'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            'logdir \t/var/log/$$-$conf-${fnoc}-monthly\n'))
        self.assertEqual(t, expected)

    def test_named_section(self):
        expected = [
            (pygments.token.Name.Tag, '<sect'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.Name, 'name'),
            (pygments.token.Name.Tag, '>'),
            (pygments.token.Text, '\n  '),
            (pygments.token.Name, 'option'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.String, 'value'),
            (pygments.token.Text, '\n'),
            (pygments.token.Name.Tag, '</sect'),
            (pygments.token.Name.Tag, '>'),
            (pygments.token.Text, '\n'),
        ]
        text = ('<sect name>\n'
                '  option value\n'
                '</sect>\n')
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(text))
        self.assertEqual(t, expected)

    def test_unnamed_section(self):
        expected = [
            (pygments.token.Name.Tag, '<sect'),
            (pygments.token.Name.Tag, '>'),
            (pygments.token.Text, '\n  '),
            (pygments.token.Name, 'option'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.String, 'value'),
            (pygments.token.Text, '\n'),
            (pygments.token.Name.Tag, '</sect'),
            (pygments.token.Name.Tag, '>'),
            (pygments.token.Text, '\n'),
        ]
        text = ('<sect>\n'
                '  option value\n'
                '</sect>\n')
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(text))
        self.assertEqual(t, expected)

    def test_empty_named_section(self):
        expected = [
            (pygments.token.Name.Tag, '<sect'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.Name, 'name'),
            (pygments.token.Name.Tag, '/>'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens('<sect name/>'))
        self.assertEqual(t, expected)

    def test_empty_unnamed_section(self):
        expected = [
            (pygments.token.Name.Tag, '<sect/'),
            (pygments.token.Name.Tag, '>'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens('<sect/>'))
        self.assertEqual(t, expected)

    def test_define_without_substitutions(self):
        expected = [
            (pygments.token.Keyword, '%define'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.Name, 'logdir'),
            (pygments.token.Whitespace, ' \t'),
            (pygments.token.String, '/var/log/myapp'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            '%define logdir \t/var/log/myapp\n'))
        self.assertEqual(t, expected)

    def test_define_with_substitutions(self):
        expected = [
            (pygments.token.Keyword, '%define'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.Name, 'logdir'),
            (pygments.token.Whitespace, ' \t'),
            (pygments.token.String, '/var/log/'),
            (pygments.token.String.Escape, '$$'),
            (pygments.token.String, '-'),
            (pygments.token.String.Interpol, '$'),
            (pygments.token.Name, 'conf'),
            (pygments.token.String, '-'),
            (pygments.token.String.Interpol, '${'),
            (pygments.token.Name, 'fnoc'),
            (pygments.token.String.Interpol, '}'),
            (pygments.token.String, '-monthly'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            '%define logdir \t/var/log/$$-$conf-${fnoc}-monthly\n'))
        self.assertEqual(t, expected)

    def test_import_without_substitutions(self):
        expected = [
            (pygments.token.Keyword, '%import'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.String, 'ZConfig.components.logger'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            '%import ZConfig.components.logger\n'))
        self.assertEqual(t, expected)

    def test_import_with_substitutions(self):
        expected = [
            (pygments.token.Keyword, '%import'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.String, 'ZConfig.components.'),
            (pygments.token.String.Interpol, '${'),
            (pygments.token.Name, 'module'),
            (pygments.token.String.Interpol, '}'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            '%import ZConfig.components.${module}\n'))
        self.assertEqual(t, expected)

    def test_include_without_substitutions(self):
        expected = [
            (pygments.token.Keyword, '%include'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.String, 'somefile.conf'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            '%include somefile.conf\n'))
        self.assertEqual(t, expected)

    def test_include_with_substitutions(self):
        expected = [
            (pygments.token.Keyword, '%include'),
            (pygments.token.Whitespace, ' '),
            (pygments.token.String.Interpol, '$'),
            (pygments.token.Name, 'basename'),
            (pygments.token.String, '.conf'),
            (pygments.token.Text, '\n'),
        ]
        t = list(ZConfig.pygments.ZConfigLexer().get_tokens(
            '%include $basename.conf\n'))
        self.assertEqual(t, expected)
