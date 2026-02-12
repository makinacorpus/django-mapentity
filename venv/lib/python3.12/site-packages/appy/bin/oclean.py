#!/usr/bin/env python3

'''Removes any formatting within notes in an odt or ods document'''

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
from pathlib import Path

from appy.bin import Program
from appy.bin.ogrep import Grep

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
CLEAN_OK = '%d styled text part(s) unstyled%s'
C_MULTI  = ' on %d file(s).'
CLEAN_NO = 'No cleaning occurred.'

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Cleaner(Program):
    '''Cleans notes within an ODT or ODS file'''

    # Help messages
    HELP_P   = 'is the path to a file or folder. If a file is passed, you ' \
               'must pass the path to an ODF file (odt or ods): oclean will ' \
               'be run on this file only, removing any formatting found ' \
               'within its POD notes (comments). If a folder is passed, ' \
               'oclean will be run on all ODF files found in this folder ' \
               'and sub-folders.'
    HELP_S   = 'to set if you want reduced output.'

    def defineArguments(self):
        '''Define the allowed arguments for this program'''
        add = self.parser.add_argument
        # Positional arguments
        add('path', help=Cleaner.HELP_P)
        # Optional arg
        add('-s' , '--silent' , dest='silent', help=Cleaner.HELP_S,
            action='store_true')

    def analyseArguments(self):
        '''Check and store arguments'''
        # Get args as p_self's attributes
        for name, value in self.args.__dict__.items():
            setattr(self, name, value)

    def run(self):
        '''Does the job by (mis)using a Grep instance'''
        # Perform a silly find & replace with a Grep instance (replacing a term
        # with itself): it will also have the effect of cleaning the notes with
        # p_self.path, because it is one of the default tasks performed by Grep.
        term = 'do ' # This will match *any* note
        grep = Grep(keyword=term, path=self.path, silent=True, verbose=False,
                    vverbose=False, repl=term, asString=True, inContent=False,
                    dryRun=False, nice=False)
        grep.verbose = 0
        grep.run()
        # Print a message
        silent = self.silent
        if grep.cleaned:
            if Path(self.path).is_dir():
                suffix = C_MULTI % len(grep.matches)
            else:
                suffix = '.'
            if not silent:
                print(CLEAN_OK % (grep.cleaned, suffix))
        else:
            if not silent:
                print(CLEAN_NO)
        # Even if verbose is 0, output messages (errors to show in any case)
        if grep.messages:
            for message in grep.messages:
                print(message)
        return grep.cleaned

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
if __name__ == '__main__': Cleaner().run()
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
