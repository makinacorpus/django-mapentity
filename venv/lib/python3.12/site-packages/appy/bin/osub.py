#!/usr/bin/env python3

'''Checks or updates a sub-pod template imported into a main one via a statement
   "do...from pod", using attribute "managePageStyles" being an integer value.
'''

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import re, os.path
from pathlib import Path

from appy.bin import Program
from appy.utils.zip import zip, unzip
from appy.utils import path as putils
from appy.utils.string import randomName
from appy.pod.styles_manager import StylesGenerator

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
FILE_KO   = '%s does not exist or is not a file.'
FILE_WR   = '%s must be a .odt file.'
FILE_EM   = "No paragraph has been found in this file - It can't be analysed."
FILE_CP   = "File is corrupted: style %s, mentioned in the document's first " \
            "paragraph or table, does not exist."
NO_MASTER = "The main page style is not explicitly set in this file."
MASTER_OK = 'Page style "%s" is explicitly set, at least on the first page.'
MASTER_NM = 'Page style "%s" is already explicitly set on the first page: ' \
            'there is no need to modify the document.'
MASTER_ST = 'Master page style "%s" explicitly set on the document\'s first ' \
            'paragraph or table.'

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Sub(Program):
    '''Checks or updates a sub-pod template'''

    # Help messages
    HELP_P   = 'is the path to the odt file to update or check. When ' \
               'importing, via a do...pod statement, a sub-pod template into ' \
               'a main one, using parameter "managePageStyles" being an ' \
               'integer value, page styles must explicitly be defined in the ' \
               'sub-pod template. If it is not the case on the passed file, ' \
               'the default page style will explicitly be set (on the first ' \
               'document paragraph).'
    HELP_C   = 'set this option if you want to check the explicit presence ' \
               'of page styles in the file, without performing any actual ' \
               'change on it.'

    # The regular expression for getting the first paragraph (or table) in
    # content.xml, with its style.
    anyG = '(.*?)'
    paraTag = '(?:text:p|table:table)'
    paraType = '(text|table)'
    para = re.compile('<%s%s%s:style-name="%s"' % \
                      (paraTag, anyG, paraType, anyG))

    # Concrete tags, depending on tag type
    paraTags = {'text': 'text:p', 'table': 'table:table'}

    # Template regex representing an ODF style
    style = '<style:style.*?style:name="%s"(.*?)</style:style>'

    # Regex for getting the master page name in a style definition
    master = re.compile('style:master-page-name="%s"' % anyG)

    # Regex for getting the master page definition
    masterDef = re.compile('<style:master-page.*?style:name="%s"' % anyG)

    # The style to generate
    genStyleFamilies = {'table': 'table', 'text': 'paragraph'}
    genStyle = '<style:style style:name="%s" style:family="%s" ' \
               'style:parent-style-name="%s" style:master-page-name="%s">' \
               '</style:style>'

    # The hook used to inject the new styles in content.xml
    styleHook = '</office:automatic-styles>'

    def defineArguments(self):
        '''Define the allowed arguments for this program'''
        add = self.parser.add_argument
        # Positional arguments
        add('path', help=Sub.HELP_P)
        # Optional arg
        add('-c' , '--check' , dest='check', help=Sub.HELP_C,
            action='store_true')

    def analyseArguments(self):
        '''Check and store arguments'''
        # Get args as p_self's attributes
        for name, value in self.args.__dict__.items():
            setattr(self, name, value)
        # Ensure the file exists and is has .odt extension
        path = Path(self.path)
        if not path.is_file():
            return self.exit(FILE_KO % self.path)
        if not path.name.endswith('.odt'):
            return self.exit(FILE_WR % self.path)
        self.path = path

    def log(self, message):
        '''Logs this p_message'''
        print(message)

    def setNewStyle(self, newName, match):
        '''Return the first para, whose style has been replaced with the new
           one.'''
        anyG = Sub.anyG
        pattern = Sub.para.pattern.replace(anyG, match.group(1), 1)
        paraType = match.group(2)
        pattern = pattern.replace(self.paraTag, self.paraTags[paraType])
        pattern = pattern.replace(self.paraType, paraType)
        return pattern.replace(anyG, newName, 1)

    def setMasterStyleName(self, styleName, contentXml, stylesXml, styleType):
        '''Sets, to the first paragraph found in p_contentXml, a new style (to
           be created and added in contextXml) that inherits from p_styleName,
           being the style currently applied to this first paragraph. The new
           style must refer to the default page style.'''
        # Read the name of the default page style, as defined in styles.xml
        masterName = Sub.masterDef.search(stylesXml).group(1)
        # Assign the new style to the first para
        newName = '%spod%s' % (styleName, randomName())
        fun = lambda match: self.setNewStyle(newName, match)
        contentXml = Sub.para.sub(fun, contentXml, count=1)
        # Define the new style and add it to content.xml
        styleFamily = self.genStyleFamilies[styleType]
        style = Sub.genStyle % (newName, styleFamily, styleName, masterName)
        hook = Sub.styleHook
        contentXml = contentXml.replace(hook, style+hook, 1)
        # Overwrite the file
        with open(os.path.join(self.tempFolder, 'content.xml'), 'w') as f:
            f.write(contentXml)
        self.log(MASTER_ST % masterName)

    def analyseContent(self, contents):
        '''Analyse the content of p_self.path, whose content of files
           content.xml and styles.xml are in dict p_content.'''
        r = False 
        # Get the first paragraph within content.xml
        contentXml = contents['content.xml']
        stylesXml = contents['styles.xml']
        match = Sub.para.search(contentXml)
        if not match:
            self.log(FILE_EM)
            return r
        # Get the paragraph style
        styleType = match.group(2)
        styleName = match.group(3)
        rexStyle = re.compile(Sub.style % styleName, re.M)
        match = rexStyle.search(contentXml) or rexStyle.search(stylesXml)
        if not match:
            self.log(FILE_CP % styleName)
            return r
        match = Sub.master.search(match.group(1))
        if not match or not match.group(1):
            # No master page is tied to this style
            if self.check:
                # Log a message
                self.log(NO_MASTER)
            else:
                # Create a new style
                self.setMasterStyleName(styleName, contentXml, stylesXml,
                                        styleType)
                r = True
        else:
            # A master page style is defined
            message = MASTER_OK if self.check else MASTER_NM
            self.log(message % match.group(1))
        return r

    def run(self):
        '''Analyse, and possibly update, the file @p_self.path'''
        # Unzip the file in the temp folder
        tempFolder = self.tempFolder = putils.getOsTempFolder(sub=True)
        fileName = str(self.path)
        self.tempFolder = tempFolder
        contents = unzip(fileName, tempFolder, odf=True, asBytes=False)
        changed = self.analyseContent(contents)
        if changed:
            # Re-zip the result
            zip(fileName, tempFolder, odf=True)
        # Delete the temp folder
        putils.FolderDeleter.delete(tempFolder)

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
if __name__ == '__main__': Sub().run()
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
