##############################################################################
#
# Copyright (c) 2002, 2003, 2019 Zope Foundation and Contributors.
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
"""Shell-style string substitution helper."""

import os
import re

import ZConfig


_name_re = r'[a-zA-Z_][a-zA-Z0-9_]*'
_name_match = re.compile(_name_re).match


def substitute(s, mapping):
    """Substitute values from *mapping* into *s*.

    *mapping* can be a :class:`dict` or any type that supports the
    ``get()`` method of the mapping protocol. Replacement values are
    copied into the result without further interpretation. Raises
    :exc:`~.SubstitutionSyntaxError` if there are malformed constructs
    in *s*.
    """

    if "$" in s:
        result = ''
        rest = s
        while rest:
            p, name, namecase, rest, vtype = _split(rest)
            result += p
            if name:
                v = None
                if vtype == 'define':
                    v = mapping.get(name)
                if vtype == 'env':
                    v = os.getenv(namecase)

                if v is None:
                    raise ZConfig.SubstitutionReplacementError(s, namecase)
                result += v
        return result
    else:
        return s


def isname(s):
    """Returns ``True`` if *s* is a valid name for a substitution
    text, otherwise returns ``False``.
    """

    m = _name_match(s)
    if m:
        return m.group() == s
    else:
        return False


def _split(s):
    # Return a four tuple:  prefix, name, namecase, suffix
    # - prefix is text that can be used literally in the result (may be '')
    # - name is a referenced name, or None
    # - namecase is the name with case preserved
    # - suffix is trailling text that may contain additional references
    #   (may be '' or None)
    if "$" in s:
        i = s.find("$")
        c = s[i + 1:i + 2]
        if c == "":
            raise ZConfig.SubstitutionSyntaxError(
                "illegal lone '$' at end of source")
        if c == "$":
            return s[:i + 1], None, None, s[i + 2:], None
        prefix = s[:i]
        vtype = 'define'
        if c == "{":
            m = _name_match(s, i + 2)
            if not m:
                raise ZConfig.SubstitutionSyntaxError(
                    "'${' not followed by name")
            name = m.group(0)
            i = m.end() + 1
            if not s.startswith("}", i - 1):
                raise ZConfig.SubstitutionSyntaxError(
                    "'${%s' not followed by '}'" % name)
        elif c == "(":
            m = _name_match(s, i + 2)
            if not m:
                raise ZConfig.SubstitutionSyntaxError(
                    "'$(' not followed by name")
            name = m.group(0)
            i = m.end() + 1
            if not s.startswith(")", i - 1):
                raise ZConfig.SubstitutionSyntaxError(
                    "'$(%s' not followed by ')'" % name)
            vtype = 'env'
        else:
            m = _name_match(s, i + 1)
            if not m:
                raise ZConfig.SubstitutionSyntaxError(
                    "'$' not followed by '$' or name")
            name = m.group(0)
            i = m.end()
        return prefix, name.lower(), name, s[i:], vtype
    else:
        return s, None, None, None, None
