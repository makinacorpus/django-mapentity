##############################################################################
#
# Copyright (c) 2003, 2018 Zope Corporation and Contributors.
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

import argparse
import html
import sys
from contextlib import contextmanager

from ZConfig._schema_utils import MARKER
from ZConfig._schema_utils import AbstractSchemaFormatter
from ZConfig._schema_utils import AbstractSchemaPrinter
from ZConfig._schema_utils import load_schema
from ZConfig.sphinx import RstSchemaPrinter


class HtmlSchemaFormatter(AbstractSchemaFormatter):

    def esc(self, x):
        return html.escape(str(x))

    @contextmanager
    def _simple_tag(self, tag):
        self.write("<%s>" % tag)
        yield
        self.write("</%s>" % tag)

    def item_list(self):
        return self._simple_tag("dl")

    @contextmanager
    def describing(self, description=MARKER, after=None):
        with self._simple_tag("dt"):
            yield
        self._describing(description, after)

    def described_as(self):
        return self._simple_tag("dd")

    def abstract_name(self, name):
        self.write("<b><i>", name, "</b></i>")

    def concrete_name(self, *name):
        self.write("<b>", *name)
        self.write("</b>")

    def concrete_section_name(self, *name):
        name = ' '.join(name)
        self.write("<b>", self.esc("<%s>" % name), "</b>")

    def datatype(self, datatype):
        self.write("(%s)" % self._dt(datatype))

    def example(self, text):
        if not text:
            return

        with self._simple_tag("p"):
            with self._simple_tag("i"):
                self.write("Example:")
            with self._simple_tag("pre"):
                self.write(self.esc(self._dedent(text)))

    @contextmanager
    def body(self):
        self.write('''<html><body>
        <style>
        dl {margin: 0 0 1em 0;}
        </style>
        ''')
        yield
        self.write('</body></html>')


class HtmlSchemaPrinter(AbstractSchemaPrinter):

    _schema_formatter = HtmlSchemaFormatter


def main(argv=None):
    argv = argv if argv is not None else sys.argv[1:]

    argparser = argparse.ArgumentParser(
        description="Print an HTML version of a schema")
    argparser.add_argument(
        "schema",
        metavar='[SCHEMA-OR-PACKAGE]',
        help=("The schema to print. By default, a file."
              " Optionally, a Python package."
              " If not given, defaults to reading a schema file from stdin"),
        default="-",
    )
    argparser.add_argument(
        "--out", "-o",
        help="Write the schema to this file; if not given, write to stdout",
        type=argparse.FileType('w'),
    )
    argparser.add_argument(
        "--package",
        action='store_true',
        default=False,
        help=("The SCHEMA-OR-PACKAGE argument indicates a Python package"
              " instead of a file. The component.xml (by default) from the"
              " package will be read."),
    )
    argparser.add_argument(
        "--package-file",
        action="store",
        default="component.xml",
        help=("When PACKAGE is given, this can specify the file inside it"
              " to load."),
    )
    argparser.add_argument(
        "--members",
        action="store",
        nargs="*",
        help=("Only output sections and types in this list (and reachable"
              " from it)."),
    )
    if RstSchemaPrinter:
        argparser.add_argument(
            "--format",
            action="store",
            choices=('html', 'xml'),  # XXX Can we get actual valid RST out?
            default="HTML",
            help="The output format to produce."
        )

    args = argparser.parse_args(argv)

    out = args.out or sys.stdout

    if args.package:
        schema = load_schema(args.package_file, args.schema)
    else:
        schema = load_schema(args.schema)

    printer_factory = HtmlSchemaPrinter
    if hasattr(args, 'format') and args.format == 'xml':
        printer_factory = RstSchemaPrinter

    printer_factory(schema, out, allowed_names=args.members).printSchema()

    return 0


if __name__ == '__main__':
    main()
