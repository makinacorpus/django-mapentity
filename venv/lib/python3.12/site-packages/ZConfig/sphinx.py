##############################################################################
#
# Copyright (c) 2017, 2018 Zope Corporation and Contributors.
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

from contextlib import contextmanager


try:
    import docutils.frontend
    import docutils.parsers.rst
    import docutils.utils
    from docutils import nodes
    from docutils.parsers.rst import Directive
except ModuleNotFoundError:  # pragma: no cover
    RstSchemaPrinter = None
    RstSchemaFormatter = None
else:

    from ZConfig._schema_utils import MARKER
    from ZConfig._schema_utils import AbstractSchemaFormatter
    from ZConfig._schema_utils import AbstractSchemaPrinter
    from ZConfig._schema_utils import load_schema

    class RstSchemaFormatter(AbstractSchemaFormatter):

        settings = None

        def __init__(self, schema, stream=None):
            super().__init__(schema, stream)
            self.document = None
            self._current_node = None
            self._nodes = []
            self.settings = docutils.frontend.OptionParser(
                components=(docutils.parsers.rst.Parser,)).get_default_values()

        def esc(self, text):
            return text

        def _parsed(self, text, name='Schema'):
            document = docutils.utils.new_document(
                name,
                settings=self.settings)

            parser = docutils.parsers.rst.Parser()
            parser.parse(text, document)
            return document.children

        def write(self, *texts):
            for text in texts:
                if isinstance(text, str):
                    self._current_node += nodes.Text(' ' + text + ' ', text)
                else:
                    # Already parsed
                    self._current_node += text

        def description(self, text):
            if not text:
                return

            self.write(self._parsed(self._dedent(text), "description"))

        def example(self, text):
            if not text:
                return

            dedented = self._dedent(text)
            example = "Example::\n\n\t" + '\n\t'.join(dedented.split('\n'))
            self.write(self._parsed(example, "example"))

        @contextmanager
        def item_list(self):
            old_node = self._current_node
            self._current_node = nodes.definition_list()
            old_node += self._current_node
            yield
            self._current_node = old_node

        @contextmanager
        def describing(self, description=MARKER, after=None):
            dl = self._current_node
            assert isinstance(dl, nodes.definition_list), dl
            item = nodes.definition_list_item()
            dl += item
            term = nodes.term()
            item += term
            self._current_node = term

            yield

            # We must now have either a description (so we call
            # described_as) or they must call described_as
            # des
            self._current_node = item

            self._describing(description, after)

        @contextmanager
        def described_as(self):
            item = self._current_node
            assert isinstance(item, nodes.definition_list_item), item

            definition = nodes.definition()
            para = nodes.paragraph()
            definition += para
            item += definition
            self._current_node = para

            yield

            # When this is done, we're back to the list
            self._current_node = item.parent

        def abstract_name(self, name):
            self._current_node += nodes.emphasis(text=name, rawsource=name)

        def concrete_name(self, *name):
            name = ' '.join(name)
            self._current_node += nodes.strong(text=name, rawsource=name)

        def concrete_section_name(self, *name):
            name = ' '.join(name)
            return self.concrete_name("<" + name + ">")

        @contextmanager
        def body(self):
            self.document = self._current_node = docutils.utils.new_document(
                "Schema",
                settings=self.settings)
            yield

    class RstSchemaPrinter(AbstractSchemaPrinter):
        _schema_formatter = RstSchemaFormatter

        def printSchema(self):
            super().printSchema()
            print(self.fmt.document.pformat(), file=self.fmt.stream)

    class SchemaToRstDirective(Directive):
        required_arguments = 1
        optional_arguments = 0
        option_spec = {
            'file': str,
            'members': str,
            'excluded-members': str,
        }

        def run(self):
            schema = load_schema(
                self.options.get('file', 'component.xml'),
                self.arguments[0],
            )

            members = ()
            if 'members' in self.options:
                members = self.options['members'].split()

            excluded_members = ()
            if 'excluded-members' in self.options:
                excluded_members = self.options['excluded-members'].split()

            printer = RstSchemaPrinter(schema, allowed_names=members,
                                       excluded_names=excluded_members)
            printer.fmt.settings = self.state.document.settings

            printer.buildSchema()

            return printer.fmt.document.children

    def setup(app):  # pragma: no cover
        "Sphinx extension entry point to add the zconfig directive."
        app.add_directive("zconfig", SchemaToRstDirective)
