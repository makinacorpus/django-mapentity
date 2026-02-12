##############################################################################
#
# Copyright (c) 2002, 2003, 2018 Zope Foundation and Contributors.
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
"""Tests of ZConfig schemas."""

import unittest

import ZConfig
from ZConfig.tests.support import CONFIG_BASE
from ZConfig.tests.support import TestHelper


def uppercase(value):
    return str(value).upper()


def appsection(value):
    return MySection(value)


def get_foo(section):
    return section.foo


class MySection:

    def __init__(self, value):
        self.conf = value


def get_section_attributes(section):
    L = list(section.getSectionAttributes())
    return sorted(L)


class SchemaTestCase(TestHelper, unittest.TestCase):
    """Tests of the basic schema support itself."""

    def test_minimal_schema(self):
        schema = self.load_schema_text("<schema/>")
        self.assertEqual(len(schema), 0)
        self.assertRaises(IndexError,
                          lambda schema=schema: schema[0])
        self.assertRaises(ZConfig.ConfigurationError,
                          schema.getinfo, "foo")

    def test_simple(self):
        schema, conf = self.load_both("simple.xml", "simple.conf")
        self._verifySimpleConf(conf)

    def _verifySimpleConf(self, conf):
        eq = self.assertEqual
        eq(conf.var1, 'abc')
        eq(conf.int_var, 12)
        eq(conf.float_var, 12.02)
        eq(conf.neg_int, -2)

        check = self.assertTrue
        check(conf.true_var_1)
        check(conf.true_var_2)
        check(conf.true_var_3)
        check(not conf.false_var_1)
        check(not conf.false_var_2)
        check(not conf.false_var_3)

    def test_app_datatype(self):
        dtname = __name__ + ".uppercase"
        schema = self.load_schema_text("""\
            <schema>
              <key name='a' datatype='{}'/>
              <key name='b' datatype='{}' default='abc'/>
              <multikey name='c' datatype='{}'>
                <default>abc</default>
                <default>abc</default>
                </multikey>
              <multikey name='d' datatype='{}'>
                <default>not</default>
                <default>lower</default>
                <default>case</default>
                </multikey>
            </schema>
            """.format(dtname, dtname, dtname, dtname))
        conf = self.load_config_text(schema, """\
                                     a qwerty
                                     c upp
                                     c er
                                     c case
                                     """)
        eq = self.assertEqual
        eq(conf.a, 'QWERTY')
        eq(conf.b, 'ABC')
        eq(conf.c, ['UPP', 'ER', 'CASE'])
        eq(conf.d, ['NOT', 'LOWER', 'CASE'])
        eq(get_section_attributes(conf),
           ["a", "b", "c", "d"])

    def test_app_sectiontype(self):
        schema = self.load_schema_text("""\
            <schema datatype='.appsection' prefix='%s'>
              <sectiontype name='foo' datatype='.MySection'>
                <key name='sample' datatype='integer' default='345'/>
                </sectiontype>
              <section name='sect' type='foo' />
            </schema>
            """ % __name__)
        conf = self.load_config_text(schema, """\
                                     <foo sect>
                                       sample 42
                                     </foo>
                                     """)
        self.assertIsInstance(conf, MySection)
        o1 = conf.conf.sect
        self.assertIsInstance(o1, MySection)
        self.assertEqual(o1.conf.sample, 42)

    def test_empty_sections(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='section'/>
              <section type='section' name='s1'/>
              <section type='section' name='s2'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     <section s1>
                                     </section>
                                     <section s2/>
                                     """)
        self.assertIsNotNone(conf.s1)
        self.assertIsNotNone(conf.s2)
        self.assertEqual(get_section_attributes(conf),
                         ["s1", "s2"])

    def test_deeply_nested_sections(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='type1'>
                <key name='key' default='type1-value'/>
              </sectiontype>
              <sectiontype name='type2'>
                <key name='key' default='type2-value'/>
                <section name='sect' type='type1'/>
              </sectiontype>
              <sectiontype name='type3'>
                <key name='key' default='type3-value'/>
                <section name='sect' type='type2'/>
              </sectiontype>
              <section name='sect' type='type3'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     <type3 sect>
                                       key sect3-value
                                       <type2 sect>
                                         key sect2-value
                                         <type1 sect/>
                                       </type2>
                                     </type3>
                                     """)
        eq = self.assertEqual
        eq(conf.sect.sect.sect.key, "type1-value")
        eq(conf.sect.sect.key, "sect2-value")
        eq(conf.sect.key, "sect3-value")
        eq(get_section_attributes(conf),
           ["sect"])
        eq(get_section_attributes(conf.sect),
           ["key", "sect"])
        eq(get_section_attributes(conf.sect.sect),
           ["key", "sect"])
        eq(get_section_attributes(conf.sect.sect.sect),
           ["key"])

    def test_multivalued_keys(self):
        schema = self.load_schema_text("""\
            <schema handler='def'>
              <multikey name='a' handler='ABC' />
              <multikey name='b' datatype='integer'>
                <default>1</default>
                <default>2</default>
              </multikey>
              <multikey name='c' datatype='integer'>
                <default>3</default>
                <default>4</default>
                <default>5</default>
              </multikey>
              <multikey name='d' />
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     a foo
                                     a bar
                                     c 41
                                     c 42
                                     c 43
                                     """, num_handlers=2)
        L = []
        self.handlers({'abc': L.append,
                       'DEF': L.append})
        self.assertEqual(L, [['foo', 'bar'], conf])
        L = []
        self.handlers({'abc': None,
                       'DEF': L.append})
        self.assertEqual(L, [conf])
        self.assertEqual(conf.a, ['foo', 'bar'])
        self.assertEqual(conf.b, [1, 2])
        self.assertEqual(conf.c, [41, 42, 43])
        self.assertEqual(conf.d, [])
        self.assertEqual(get_section_attributes(conf),
                         ["a", "b", "c", "d"])

    def test_multikey_required(self):
        schema = self.load_schema_text("""\
            <schema>
              <multikey name='k' required='yes'/>
            </schema>
            """)
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "")

    def test_multisection_required(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='s'/>
              <multisection name='*' attribute='s' type='s' required='yes'/>
            </schema>
            """)
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "")

    def test_key_required_but_missing(self):
        schema = self.load_schema_text("""\
            <schema>
              <key name='k' required='yes'/>
            </schema>
            """)
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "")

    def test_section_required_but_missing(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='k'/>
              <section name='k' type='k' required='yes'/>
            </schema>
            """)
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "")

    def test_key_default_element(self):
        self.assertRaises(
            ZConfig.SchemaError, self.load_schema_text, """\
            <schema>
              <key name='name'>
                <default>text</default>
              </key>
            </schema>
            """)

    def test_bad_handler_maps(self):
        schema = self.load_schema_text("""\
            <schema>
              <key name='a' handler='abc'/>
              <key name='b' handler='def'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     a foo
                                     b bar
                                     """, num_handlers=2)
        self.assertEqual(get_section_attributes(conf),
                         ["a", "b"])
        self.assertRaises(ZConfig.ConfigurationError,
                          self.handlers, {'abc': id, 'ABC': id, 'def': id})
        self.assertRaises(ZConfig.ConfigurationError,
                          self.handlers, {})

    def test_handler_ordering(self):
        schema = self.load_schema_text("""\
            <schema handler='c'>
              <sectiontype name='inner'>
              </sectiontype>
              <sectiontype name='outer'>
                <section type='inner' name='sect-inner' handler='a'/>
              </sectiontype>
              <section type='outer' name='sect-outer' handler='b'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     <outer sect-outer>
                                       <inner sect-inner/>
                                     </outer>
                                     """, num_handlers=3)
        L = []
        self.handlers({'a': L.append,
                       'b': L.append,
                       'c': L.append})
        outer = conf.sect_outer
        inner = outer.sect_inner
        self.assertEqual(L, [inner, outer, conf])

    def test_duplicate_section_names(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'/>
              <sectiontype name='nesting'>
                <section name='a' type='sect'/>
              </sectiontype>
              <section name='a' type='nesting'/>
            </schema>
            """)
        self.assertRaises(ZConfig.ConfigurationError, self.load_config_text,
                          schema, """\
                          <sect a/>
                          <sect a/>
                          """)
        self.load_config_text(schema, """\
                                     <nesting a>
                                       <sect a/>
                                     </nesting>
                                     """)

    def test_disallowed_duplicate_attribute(self):
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
                          <schema>
                            <key name='a'/>
                            <key name='b' attribute='a'/>
                          </schema>
                          """)

    def test_unknown_datatype_name(self):
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, "<schema datatype='foobar'/>")

    def test_load_abstracttype(self):
        schema = self.load_schema_text("""\
            <schema>
              <abstracttype name='group'>
                <description>This is an abstract section type.</description>
              </abstracttype>
              <sectiontype name='t1' implements='group'>
                <key name='k1' default='default1'/>
              </sectiontype>
              <sectiontype name='t2' implements='group'>
                <key name='k2' default='default2'/>
              </sectiontype>
              <multisection name='*' type='group' attribute='g'/>
            </schema>
            """)
        # check the types that get defined
        t = schema.gettype("group")
        self.assertTrue(t.isabstract())
        t1 = schema.gettype("t1")
        self.assertTrue(not t1.isabstract())
        self.assertIs(t.getsubtype("t1"), t1)
        t2 = schema.gettype("t2")
        self.assertTrue(not t2.isabstract())
        self.assertIs(t.getsubtype("t2"), t2)
        self.assertRaises(ZConfig.ConfigurationError, t.getsubtype, "group")
        self.assertIsNot(t1, t2)
        # try loading a config that relies on this schema
        conf = self.load_config_text(schema, """\
                                     <t1/>
                                     <t1>
                                       k1 value1
                                     </t1>
                                     <t2/>
                                     <t2>
                                       k2 value2
                                     </t2>
                                     """)
        eq = self.assertEqual
        eq(get_section_attributes(conf), ["g"])
        eq(len(conf.g), 4)
        eq(conf.g[0].k1, "default1")
        eq(conf.g[1].k1, "value1")
        eq(conf.g[2].k2, "default2")
        eq(conf.g[3].k2, "value2")

        # white box:
        self.assertIs(conf.g[0].getSectionDefinition(), t1)
        self.assertIs(conf.g[1].getSectionDefinition(), t1)
        self.assertIs(conf.g[2].getSectionDefinition(), t2)
        self.assertIs(conf.g[3].getSectionDefinition(), t2)

    def test_abstracttype_extension(self):
        schema = self.load_schema_text("""\
            <schema>
              <abstracttype name='group'/>
              <sectiontype name='extra' implements='group'/>
              <section name='thing' type='group'/>
            </schema>
            """)
        abstype = schema.gettype("group")
        self.assertIs(schema.gettype("extra"), abstype.getsubtype("extra"))

        # make sure we can use the extension in a config:
        conf = self.load_config_text(schema, "<extra thing/>")
        self.assertEqual(conf.thing.getSectionType(), "extra")
        self.assertEqual(get_section_attributes(conf), ["thing"])
        self.assertEqual(get_section_attributes(conf.thing), [])

    def test_abstracttype_extension_errors(self):
        # specifying a non-existant abstracttype
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
                          <schema>
                            <sectiontype name='s' implements='group'/>
                          </schema>
                          """)
        # specifying something that isn't an abstracttype
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
                          <schema>
                            <sectiontype name='t1'/>
                            <sectiontype name='t2' implements='t1'/>
                          </schema>
                          """)

    def test_arbitrary_key(self):
        schema = self.load_schema_text("""\
            <schema>
              <key name='+' required='yes' attribute='keymap'
                   datatype='integer'/>
            </schema>
            """)
        conf = self.load_config_text(schema, "some-key 42")
        self.assertEqual(conf.keymap, {'some-key': 42})
        self.assertEqual(get_section_attributes(conf), ["keymap"])

    def test_arbitrary_multikey_required(self):
        schema = self.load_schema_text("""\
            <schema>
              <multikey name='+' required='yes' attribute='keymap'
                        datatype='integer'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     some-key 42
                                     some-key 43
                                     """)
        self.assertEqual(conf.keymap, {'some-key': [42, 43]})

    def test_arbitrary_multikey_optional(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'>
                <multikey name='+' attribute='keymap'/>
              </sectiontype>
              <section name='+' type='sect' attribute='stuff'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     <sect foo>
                                       some-key 42
                                       some-key 43
                                     </sect>
                                     """)
        self.assertEqual(conf.stuff.keymap, {'some-key': ['42', '43']})
        self.assertEqual(get_section_attributes(conf), ["stuff"])

    def test_arbitrary_multikey_optional_empty(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'>
                <multikey name='+' attribute='keymap'/>
              </sectiontype>
              <section name='+' type='sect' attribute='stuff'/>
            </schema>
            """)
        conf = self.load_config_text(schema, "<sect foo/>")
        self.assertEqual(conf.stuff.keymap, {})

    def test_arbitrary_multikey_with_defaults(self):
        schema = self.load_schema_text("""\
            <schema>
              <multikey name='+' attribute='keymap'>
                <default key='a'>value-a1</default>
                <default key='a'>value-a2</default>
                <default key='b'>value-b</default>
              </multikey>
            </schema>
            """)
        conf = self.load_config_text(schema, "")
        self.assertEqual(conf.keymap, {'a': ['value-a1', 'value-a2'],
                                       'b': ['value-b']})

    def test_arbitrary_multikey_with_unkeyed_default(self):
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
                          <schema>
                            <multikey name='+' attribute='keymap'>
                              <default>value-a1</default>
                            </multikey>
                          </schema>
                          """)

    def test_arbitrary_key_with_defaults(self):
        schema = self.load_schema_text("""\
            <schema>
              <key name='+' attribute='keymap'>
                <default key='a'>value-a</default>
                <default key='b'>value-b</default>
              </key>
            </schema>
            """)
        conf = self.load_config_text(schema, "")
        self.assertEqual(conf.keymap, {'a': 'value-a', 'b': 'value-b'})

    def test_arbitrary_key_with_unkeyed_default(self):
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
                          <schema>
                            <key name='+' attribute='keymap'>
                              <default>value-a1</default>
                            </key>
                          </schema>
                          """)

    def test_arbitrary_keys_with_others(self):
        schema = self.load_schema_text("""\
            <schema>
              <key name='k1' default='v1'/>
              <key name='k2' default='2' datatype='integer'/>
              <key name='+' required='yes' attribute='keymap'
                   datatype='integer'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     some-key 42
                                     k2 3
                                     """)
        self.assertEqual(conf.k1, 'v1')
        self.assertEqual(conf.k2, 3)
        self.assertEqual(conf.keymap, {'some-key': 42})
        self.assertEqual(get_section_attributes(conf),
                         ["k1", "k2", "keymap"])

    def test_arbitrary_key_missing(self):
        schema = self.load_schema_text("""\
            <schema>
              <key name='+' required='yes' attribute='keymap' />
            </schema>
            """)
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "# empty config file")

    def test_arbitrary_key_bad_schema(self):
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
                          <schema>
                            <key name='+' attribute='attr1'/>
                            <key name='+' attribute='attr2'/>
                          </schema>
                          """)

    def test_getrequiredtypes(self):
        schema = self.load_schema("library.xml")
        self.assertEqual(schema.getrequiredtypes(), [])

        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='used'/>
              <sectiontype name='unused'/>
              <section type='used' name='a'/>
            </schema>
            """)
        L = sorted(schema.getrequiredtypes())
        self.assertEqual(L, ["used"])

    def test_getunusedtypes(self):
        schema = self.load_schema("library.xml")
        L = sorted(schema.getunusedtypes())
        self.assertEqual(L, ["type-a", "type-b"])

        schema = self.load_schema_text("""\
            <schema type='top'>
              <sectiontype name='used'/>
              <sectiontype name='unused'/>
              <section type='used' name='a'/>
            </schema>
            """)
        self.assertEqual(schema.getunusedtypes(), ["unused"])

    def test_section_value_mutation(self):
        schema, conf = self.load_both("simple.xml", "simple.conf")
        new = []
        conf.empty = new
        self.assertIs(conf.empty, new)

    def test_simple_anonymous_section(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'>
                <key name='key' default='value'/>
              </sectiontype>
              <section name='*' type='sect' attribute='attr'/>
            </schema>
            """)
        conf = self.load_config_text(schema, "<sect/>")
        self.assertEqual(conf.attr.key, "value")

    def test_simple_anonymous_section_without_name(self):
        # make sure we get the same behavior without name='*'
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'>
                <key name='key' default='value'/>
              </sectiontype>
              <section type='sect' attribute='attr'/>
            </schema>
            """)
        conf = self.load_config_text(schema, "<sect/>")
        self.assertEqual(conf.attr.key, "value")

    def test_simple_anynamed_section(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'>
                <key name='key' default='value'/>
              </sectiontype>
              <section name='+' type='sect' attribute='attr'/>
            </schema>
            """)
        conf = self.load_config_text(schema, "<sect name/>")
        self.assertEqual(conf.attr.key, "value")
        self.assertEqual(conf.attr.getSectionName(), "name")

        # if we omit the name, it's an error
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "<sect/>")

    def test_nested_abstract_sectiontype(self):
        schema = self.load_schema_text("""\
            <schema>
              <abstracttype name='abstract'/>
              <sectiontype name='t1' implements='abstract'/>
              <sectiontype name='t2' implements='abstract'>
                <section type='abstract' name='s1'/>
              </sectiontype>
              <section type='abstract' name='*' attribute='s2'/>
            </schema>
            """)
        self.load_config_text(schema, """\
                                     <t2>
                                       <t1 s1/>
                                     </t2>
                                     """)

    def test_nested_abstract_sectiontype_without_name(self):
        # make sure we get the same behavior without name='*'
        schema = self.load_schema_text("""\
            <schema>
              <abstracttype name='abstract'/>
              <sectiontype name='t1' implements='abstract'/>
              <sectiontype name='t2' implements='abstract'>
                <section type='abstract' name='s1'/>
              </sectiontype>
              <section type='abstract' attribute='s2'/>
            </schema>
            """)
        self.load_config_text(schema, """\
                                     <t2>
                                       <t1 s1/>
                                     </t2>
                                     """)

    def test_reserved_attribute_prefix(self):
        template = """\
            <schema>
              <sectiontype name='s'/>
                %s
            </schema>
            """

        def check(thing, self=self, template=template):
            text = template % thing
            self.assertRaises(ZConfig.SchemaError,
                              self.load_schema_text, text)

        check("<key name='a' attribute='getSection'/>")
        check("<key name='a' attribute='getSectionThing'/>")
        check("<multikey name='a' attribute='getSection'/>")
        check("<multikey name='a' attribute='getSectionThing'/>")
        check("<section type='s' name='*' attribute='getSection'/>")
        check("<section type='s' attribute='getSectionThing'/>")
        check("<multisection type='s' name='*' attribute='getSection'/>")
        check("<multisection type='s' attribute='getSectionThing'/>")

    def test_sectiontype_as_schema(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='s'>
                <key name='skey' default='skey-default'/>
              </sectiontype>
              <sectiontype name='t'>
                <key name='tkey' default='tkey-default'/>
                <section name='*' type='s' attribute='section'/>
              </sectiontype>
            </schema>
            """)
        t = schema.gettype("t")
        conf = self.load_config_text(t, "<s/>")
        self.assertEqual(conf.tkey, "tkey-default")
        self.assertEqual(conf.section.skey, "skey-default")
        self.assertEqual(get_section_attributes(conf), ["section", "tkey"])
        self.assertEqual(get_section_attributes(conf.section), ["skey"])

    def test_datatype_conversion_error(self):
        schema_url = "file:///tmp/fake-url-1.xml"
        config_url = "file:///tmp/fake-url-2.xml"
        schema = self.load_schema_text("""\
             <schema>
               <key name='key' default='bogus' datatype='integer'/>
             </schema>
             """, url=schema_url)
        e = self.get_data_conversion_error(
            schema, "", config_url)
        self.assertEqual(e.url, schema_url)
        self.assertEqual(e.lineno, 2)

        e = self.get_data_conversion_error(schema, """\
                                           # comment

                                           key splat
                                           """, config_url)
        self.assertEqual(e.url, config_url)
        self.assertEqual(e.lineno, 3)

    def get_data_conversion_error(self, schema, src, url):
        with self.assertRaises(ZConfig.DataConversionError) as e:
            self.load_config_text(schema, src, url=url)

        return e.exception

    def test_numeric_section_name(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'/>
              <multisection name='*' type='sect' attribute='things'/>
            </schema>
            """)
        conf = self.load_config_text(schema, "<sect 1 />")
        self.assertEqual(len(conf.things), 1)

    def test_sectiontype_extension(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='t1'>
                <key name='k1'/>
              </sectiontype>
              <sectiontype name='t2' extends='t1'>
                <key name='k2'/>
              </sectiontype>
              <section name='s' type='t2'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
                                     <t2 s>
                                       k1 k1-value
                                       k2 k2-value
                                     </t2>
                                     """)
        eq = self.assertEqual
        eq(conf.s.k1, "k1-value")
        eq(conf.s.k2, "k2-value")
        eq(get_section_attributes(conf), ["s"])
        eq(get_section_attributes(conf.s), ["k1", "k2"])

    def test_sectiontype_extension_errors(self):
        # cannot override key from base
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
                          <schema>
                            <sectiontype name='t1'>
                              <key name='k1'/>
                            </sectiontype>
                            <sectiontype name='t2' extends='t1'>
                              <key name='k1'/>
                            </sectiontype>
                          </schema>
                          """)
        # cannot extend non-existing section
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
                          <schema>
                            <sectiontype name='t2' extends='t1'/>
                          </schema>
                          """)
        # cannot extend abstract type
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
                          <schema>
                            <abstracttype name='t1'/>
                            <sectiontype name='t2' extends='t1'/>
                          </schema>
                          """)

    def test_sectiontype_derived_keytype(self):
        # make sure that a derived section type inherits the keytype
        # of its base
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect' keytype='identifier'/>
              <sectiontype name='derived' extends='sect'>
                <key name='foo' attribute='foo'/>
                <key name='Foo' attribute='Foo'/>
              </sectiontype>
              <section name='foo' type='derived'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
            <derived foo>
              foo bar
              Foo BAR
            </derived>
            """)
        self.assertEqual(conf.foo.foo, "bar")
        self.assertEqual(conf.foo.Foo, "BAR")
        self.assertEqual(get_section_attributes(conf.foo), ["Foo", "foo"])

    def test_sectiontype_override_keytype(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='base' keytype='identifier' >
                <key name='+' attribute='map' />
              </sectiontype>
              <sectiontype name='derived' keytype='ipaddr-or-hostname'
                           extends='base' />
              <section name='*' type='base' attribute='base' />
              <section name='*' type='derived' attribute='derived' />
            </schema>
            """)
        conf = self.load_config_text(schema, """\
            <base>
              ident1 foo
              Ident2 bar
            </base>
            <derived>
              EXAMPLE.COM foo
            </derived>
            """)
        L = sorted(conf.base.map.items())
        self.assertEqual(L, [("Ident2", "bar"), ("ident1", "foo")])
        L = sorted(conf.derived.map.items())
        self.assertEqual(L, [("example.com", "foo")])
        self.assertEqual(get_section_attributes(conf), ["base", "derived"])

    def test_keytype_applies_to_default_key(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='sect'>
                <key name='+' attribute='mapping'>
                  <default key='foo'>42</default>
                  <default key='BAR'>24</default>
                </key>
              </sectiontype>
              <section type='sect' name='*' attribute='sect'/>
            </schema>
            """)
        conf = self.load_config_text(schema, "<sect/>")
        items = sorted(conf.sect.mapping.items())
        self.assertEqual(items, [("bar", "24"), ("foo", "42")])

    def test_duplicate_default_key_checked_in_schema(self):
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
            <schema>
              <sectiontype name='sect'>
                <key name='+' attribute='mapping'>
                  <default key='foo'>42</default>
                  <default key='Foo'>24</default>
                </key>
              </sectiontype>
              <section type='sect' name='*' attribute='sect'/>
            </schema>
            """)

    def test_default_keys_rechecked_clash_in_derived_sectiontype(self):
        # If the default values associated with a <key name="+"> can't
        # be supported by a new keytype for a derived sectiontype, an
        # error should be indicated.
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
            <schema>
              <sectiontype name='base' keytype='identifier'>
                <key name='+' attribute='mapping'>
                  <default key='foo'>42</default>
                  <default key='Foo'>42</default>
                </key>
              </sectiontype>
              <sectiontype name='sect' keytype='basic-key'
                           extends='base'>
                <!-- should cry foul here -->
              </sectiontype>
              <section type='sect' name='*' attribute='sect'/>
            </schema>
            """)

    def test_default_keys_rechecked_dont_clash_in_derived_sectiontype(self):
        # If the default values associated with a <key name="+"> can't
        # be supported by a new keytype for a derived sectiontype, an
        # error should be indicated.
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='base' keytype='identifier'>
                <multikey name='+' attribute='mapping'>
                  <default key='foo'>42</default>
                  <default key='Foo'>42</default>
                </multikey>
              </sectiontype>
              <sectiontype name='sect' keytype='basic-key'
                           extends='base'>
                <!-- should cry foul here -->
              </sectiontype>
              <section type='base' name='*' attribute='base'/>
              <section type='sect' name='*' attribute='sect'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
            <base/>
            <sect/>
            """)
        base = sorted(conf.base.mapping.items())
        self.assertEqual(base, [("Foo", ["42"]), ("foo", ["42"])])
        sect = sorted(conf.sect.mapping.items())
        self.assertEqual(sect, [("foo", ["42", "42"])])

    def test_sectiontype_inherited_datatype(self):
        schema = self.load_schema_text("""\
            <schema prefix='ZConfig.tests.test_schema'>
              <sectiontype name='base' datatype='.get_foo'>
                <key name="foo"/>
              </sectiontype>
              <sectiontype name='derived' extends='base'/>
              <section name='*' type='derived' attribute='splat'/>
            </schema>
            """)
        conf = self.load_config_text(schema, """\
            <derived>
              foo bar
            </derived>
            """)
        self.assertEqual(conf.splat, "bar")

    def test_schema_keytype(self):
        schema = self.load_schema_text("""\
            <schema keytype='ipaddr-or-hostname'>
              <key name='+' attribute='table' datatype='ipaddr-or-hostname'/>
            </schema>
            """)
        conf = self.load_config_text(schema,
                                     "host.example.com 127.0.0.1\n"
                                     "www.example.org 127.0.0.2\n")
        table = conf.table
        self.assertEqual(len(table), 2)
        L = sorted(table.items())
        self.assertEqual(L, [("host.example.com", "127.0.0.1"),
                             ("www.example.org", "127.0.0.2")])

        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "abc.  127.0.0.1")

    def test_keytype_identifier(self):
        schema = self.load_schema_text("""\
           <schema keytype='identifier'>
             <key name='foo' attribute='foo'/>
             <key name='Foo' attribute='Foo'/>
           </schema>
           """)
        conf = self.load_config_text(schema,
                                     "Foo Foo-value\n"
                                     "foo foo-value\n")
        self.assertEqual(conf.foo, "foo-value")
        self.assertEqual(conf.Foo, "Foo-value")
        self.assertEqual(get_section_attributes(conf), ["Foo", "foo"])
        # key mis-match based on case:
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "FOO frob\n")
        # attribute names conflict, since the keytype isn't used to
        # generate attribute names
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
                          <schema keytype='identifier'>
                            <key name='foo'/>
                            <key name='Foo'/>
                          </schema>
                          """)

    def test_datatype_casesensitivity(self):
        self.load_schema_text("<schema datatype='NULL'/>")

    def test_simple_extends(self):
        schema = self.load_schema_text("""\
           <schema extends='{}/simple.xml {}/library.xml'>
             <section name='A' type='type-a' />
           </schema>
           """.format(CONFIG_BASE, CONFIG_BASE))
        self._verifySimpleConf(self.load_config(schema, "simple.conf"))

    def test_extends_fragment_failure(self):
        self.assertRaises(
            ZConfig.SchemaError, self.load_schema_text,
            "<schema extends='%s/library.xml#foo'/>" % CONFIG_BASE)

    def test_extends_description_override(self):
        schema = self.load_schema_text("""\
           <schema extends='{}/base.xml {}/library.xml'>
             <description>
               overriding description
             </description>
             <section name='A' type='type-a' />
             <section name='X' type='type-X' />
           </schema>
           """.format(CONFIG_BASE, CONFIG_BASE))
        description = schema.description.strip()
        self.assertEqual(description, "overriding description")

    def test_extends_description_first_extended_wins(self):
        schema = self.load_schema_text("""\
           <schema extends='{}/base.xml {}/library.xml'>
             <section name='A' type='type-a' />
             <section name='X' type='type-X' />
           </schema>
           """.format(CONFIG_BASE, CONFIG_BASE))
        description = schema.description.strip()
        self.assertEqual(description, "base description")

    def test_multi_extends_implicit_OK(self):
        self.load_schema_text("""\
           <schema extends='{}/base.xml {}/library.xml'>
             <section name='A' type='type-a' />
             <section name='X' type='type-X' />
           </schema>
           """.format(CONFIG_BASE, CONFIG_BASE))

    def test_multi_extends_explicit_datatype_OK(self):
        self.load_schema_text("""\
           <schema extends='{}/base-datatype1.xml {}/base-datatype2.xml'
                   datatype='null'>
             <section name='One' type='type-1' />
             <section name='Two' type='type-2' />
           </schema>
           """.format(CONFIG_BASE, CONFIG_BASE))

    def test_multi_extends_explicit_keytype_OK(self):
        self.load_schema_text("""\
           <schema extends='{}/base-keytype1.xml {}/base-keytype2.xml'
                   keytype='{}.uppercase'>
             <section name='One' type='type-1' />
             <section name='Two' type='type-2' />
           </schema>
           """.format(CONFIG_BASE, CONFIG_BASE, __name__))

    def test_multi_extends_datatype_conflict(self):
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
            <schema extends='{}/base-datatype1.xml {}/base-datatype2.xml'/>
            """.format(CONFIG_BASE, CONFIG_BASE))

    def test_multi_extends_keytype_conflict(self):
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
            <schema extends='{}/base-keytype1.xml {}/base-keytype2.xml'/>
            """.format(CONFIG_BASE, CONFIG_BASE))

    def test_multiple_descriptions_is_error(self):
        self.assertRaises(ZConfig.SchemaError,
                          self.load_schema_text, """\
            <schema>
              <description>  foo  </description>
              <description>  bar  </description>
            </schema>
            """)

    def test_schema_example(self):
        schema = self.load_schema_text("""\
            <schema>
                <example>  This is an example  </example>
            </schema>
            """)
        self.assertEqual(schema.example, 'This is an example')

    def test_key_example(self):
        schema = self.load_schema_text("""\
            <schema>
                <sectiontype name="abc">
                    <key name="def">
                        <example>  This is an example  </example>
                    </key>
                </sectiontype>
            </schema>
            """)
        self.assertEqual(schema.gettype('abc').getinfo('def').example,
                         'This is an example')

    def test_multikey_example(self):
        schema = self.load_schema_text("""\
            <schema>
                <sectiontype name="abc">
                    <multikey name="def">
                        <example>  This is an example  </example>
                    </multikey>
                </sectiontype>
            </schema>
            """)
        self.assertEqual(schema.gettype('abc').getinfo('def').example,
                         'This is an example')

    def test_sectiontype_example(self):
        schema = self.load_schema_text("""\
            <schema>
                <sectiontype name="abc">
                    <example>  This is an example  </example>
                </sectiontype>
                <section type="abc" name="def"/>
            </schema>
            """)
        self.assertEqual(schema.gettype('abc').example, 'This is an example')

    def test_multiple_examples_is_error(self):
        self.assertRaises(ZConfig.SchemaError, self.load_schema_text, """\
            <schema>
                <example>  This is an example  </example>
                <example>  This is an example  </example>
            </schema>
            """)

    def test_section_example(self):
        schema = self.load_schema_text("""\
            <schema>
                <sectiontype name="abc">
                    <example>  This is a sectiontype example  </example>
                </sectiontype>
                <section type="abc" name="def">
                    <example>  This is an example  </example>
                </section>
            </schema>
            """)
        self.assertEqual(schema.getinfo('def').sectiontype.example,
                         'This is a sectiontype example')
        self.assertEqual(schema.getinfo('def').example, 'This is an example')

    def test_multisection_example(self):
        schema = self.load_schema_text("""\
            <schema>
                <sectiontype name="abc">
                    <example>  This is a sectiontype example  </example>
                </sectiontype>
                <multisection type="abc" name="*" attribute="things">
                    <example>  This is an example  </example>
                </multisection>
            </schema>
            """)
        self.assertEqual(schema[0][1].sectiontype.example,
                         'This is a sectiontype example')
        self.assertEqual(schema[0][1].example, 'This is an example')

    def checkErrorText(self, schema, error_text):
        self.assertRaisesRegex(ZConfig.SchemaError, error_text,
                               self.load_schema_text, schema)

    def test_error_bad_parent(self):
        self.checkErrorText(
            "<schema><schema>",
            "Unknown tag")

    def test_error_unknown_doc(self):
        self.checkErrorText("<bad>", "Unknown document type")

    def test_error_extra_cdata(self):
        self.checkErrorText("<schema>text",
                            "non-blank character data")

    def test_error_subclass(self):
        import ZConfig.datatypes
        import ZConfig.schema

        class MockLoader:
            registry = ZConfig.datatypes.Registry()

        parser = ZConfig.schema.SchemaParser(MockLoader(), 'url')
        parser.push_prefix({'prefix': __name__})
        parser.push_prefix({'prefix': '.' + __name__})

        def cv(n):
            raise ValueError()
        MockLoader.registry._stock['dotted-suffix'] = cv

        self.assertRaises(ZConfig.SchemaError,
                          parser.push_prefix,
                          {'prefix': __name__})

        self.assertRaises(ZConfig.SchemaError,
                          parser.basic_key,
                          "not a basic key")

        self.assertRaises(ZConfig.SchemaError,
                          parser.identifier,
                          "not an identifier")

    def test_error_required_value(self):
        self.checkErrorText(
            """
            <schema>
              <key name='+' required='maybe' attribute='keymap' />
            </schema>
            """,
            "value for 'required' must be")

    def test_error_section(self):
        self.checkErrorText(
            """
            <schema>
              <section />
            """,
            "section must specify type")

    def test_error_multisection(self):
        self.checkErrorText(
            """
            <schema>
              <sectiontype name="abc" />
              <multisection type="abc" name="doreme"/>
            """,
            "multisection must specify .* for the name")

    def test_error_multikey(self):

        self.checkErrorText(
            """
            <schema>
              <multikey name='foo' required="yes" default="1"
                        attribute='keymap'/>
            </schema>
            """,
            "default values for multikey must be given")

    def test_error_key_info(self):

        self.checkErrorText(
            """
            <schema>
              <key name='foo' required="yes" default="1" attribute='keymap'/>
            </schema>
            """,
            "required key cannot have a default")

        self.checkErrorText(
            """
            <schema>
              <key name='*' attribute='keymap'/>
            </schema>
            """,
            r"key may not specify '\*' for name")

        self.checkErrorText(
            """
            <schema>
              <key name='' attribute='keymap'/>
            </schema>
            """,
            "name must be specified and non-empty")

        self.checkErrorText(
            """
            <schema>
              <key name='*' />
            </schema>
            """,
            "container attribute must be specified")

        self.checkErrorText(
            """
            <schema>
              <key name='invalid key name' attribute='keymap'/>
            </schema>
            """,
            "could not convert key name to keytype")

    def test_error_import_fragment(self):
        self.checkErrorText(
            """
            <schema>
              <import src='http://path/with#fragment' />
            """,
            "may not include a fragment identifier")

    def test_error_sectiontype(self):
        self.checkErrorText(
            """
            <schema>
              <sectiontype>
            """,
            "sectiontype name must not be omitted or empty")

    def test_error_abstracttype(self):
        self.checkErrorText(
            """
            <schema>
              <abstracttype>
            """,
            "abstracttype name must not be omitted or empty")

    def test_metadefault(self):
        self.load_schema_text(
            """
            <schema>
              <key name="name">
                <metadefault>a default</metadefault>
              </key>
            </schema>
        """)

    def test_error_component_section(self):
        self.checkErrorText(
            """
            <schema>
              <import package="ZConfig.tests" file="bad-component.xml" />
            """,
            "elements may not be nested")

        self.load_schema_text(
            """
            <schema>
              <import package="ZConfig.tests" file="bad-component2.xml" />
            </schema>
            """)


def test_suite():
    return unittest.defaultTestLoader.loadTestsFromName(__name__)


if __name__ == '__main__':
    unittest.main(defaultTest='test_suite')
