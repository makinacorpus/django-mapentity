##############################################################################
#
# Copyright (c) 2003 Zope Corporation and Contributors.
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

"""Script to check validity of a configuration file.
"""


import argparse
import sys

import ZConfig


def main(args=None):
    optparser = argparse.ArgumentParser(
        description="Script to check validity of a configuration file",
        epilog="""
        Each file named on the command line is checked for syntactical errors
        and schema conformance.  The schema must be specified.  If no files
        are specified and standard input is not a TTY, standard in is treated
        as a configuration file.  Specifying a schema and no configuration
        files causes the schema to be checked.""",
    )

    optparser.add_argument(
        "-s", "--schema", dest="schema",
        required=True,
        help="use the schema in FILE (can be a URL)",
        metavar="FILE"
    )

    optparser.add_argument(
        "file",
        nargs='*',
        help="Optional configuration file to check",
        type=argparse.FileType('r'),
    )

    options = optparser.parse_args(args=args)

    schema = ZConfig.loadSchema(options.schema)

    if not options.file:
        if sys.stdin.isatty():
            # just checking the schema
            return 0

        # stdin is a pipe
        options.file = [sys.stdin]

    errors = False
    for f in options.file:
        try:
            ZConfig.loadConfigFile(schema, f)
        except ZConfig.ConfigurationError as e:
            print(str(e), file=sys.stderr)
            errors = True

    return int(errors)


if __name__ == "__main__":
    sys.exit(main())
