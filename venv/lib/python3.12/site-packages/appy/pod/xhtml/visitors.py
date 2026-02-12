'''This module contains all visitors for the tree of tags defined in tags.py
   and build by parser.py.'''

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
from appy.pod.xhtml import tags

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Visitor:
    '''Abstract base class for all visitors'''

    def visit(self, env):
        '''Visits the tree of tags that has been build in the p_env(ironment)'''

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class TablesVisitor(Visitor):
    '''Abstract visitor that walks through all tables'''

    def visit(self, env):
        # Do nothing if no table was found
        if 'Table' not in env.tags: return
        # Walk every table
        r = False
        for table in env.tags['Table']:
            updated = self.visitTable(table)
            r = r or updated
        return updated

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class TablesNormalizer(TablesVisitor):
    '''Ensure all tables rows are under a tag "thead" or "tbody"'''

    def isHeaderRow(self, row):
        '''A row is considered a header row if all cells are "th" cells'''
        for cell in row.iterChildren(types='Cell'):
            if cell.name == 'td': return
        return True # Implicitly, all rows are "th" rows if we are here

    def visitTable(self, table):
        '''Visiting a table = normalizing it'''
        # Store here tags "thead" and "tbody"
        thead = tbody = None
        # Store here "root" rows, ie, those encountered directly under the
        # "table" tag (not being under tag "thead" nor "tbody").
        rootRows = []
        # Walk table sub-tags
        for tag in table.iterChildren():
            if tag.className == 'Header':
                thead = tag
            elif tag.className == 'Body':
                tbody = tag
            elif tag.className == 'Row':
                rootRows.append(tag)
        # Set all root rows within thead or tbody
        for row in rootRows:
            if self.isHeaderRow(row):
                # This is a header row. Create the "thead" tag when inexistent.
                if not thead:
                    thead = tags.Header('thead', None, parent=table)
                row.setParent(thead)
            else:
                # This is a body row. Create the "tbody" tag when inexistent.
                if not tbody:
                    tbody = tags.Body('tbody', None, parent=table)
                row.setParent(tbody)
        # We have currently no interest of reporting if at least one table has
        # been updated or not.
        return True

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class TablesOptimizer(TablesVisitor):
    '''Removes most style information about tables'''

    # Attributes to remove on tag "table" and sub-tags
    undesired = ('width', 'height')
    undesiredAttributes = {
      'table': undesired + ('style',),
      'tr'   : undesired + ('style',),
      'th'   : undesired,
      'td'   : undesired
    }

    # CSS properties to keep within "style" attributes
    desiredProperties = ('text-align',)

    def removeAttributes(self, tag):
        '''Remove any undesired attribute on this p_tag'''
        # Returns true if at least one removal has been performed
        r = False
        # Remove undesired attributes on the p_table
        attrs = tag.attrs
        if not attrs: return
        # Walk undesired attributes
        for name in self.undesiredAttributes[tag.name]:
            if name in attrs:
                delattr(attrs, name)
                r = True
        return r

    def removeProperties(self, tag):
        '''Remove ay CSS property from p_tag's "style" attribute not being in
           self.desiredProperties.'''
        props = tag.attrs.style.strip(' ;').split(';')
        if not props: return
        # Walk CSS properties in reverse order and remove the undesired ones
        keep = self.desiredProperties
        i = len(props) - 1
        updated = False
        while i >= 0:
            try:
                name, value = props[i].split(':', 1)
                name = name.strip()
            except ValueError:
                # The value is wrong
                del props[i]
                updated = True
            # Remove it when appropriate
            if name not in keep:
                del props[i]
                updated = True
            i -= 1
        # Set the updated style info on p_tag, if it has been updated
        if updated:
            # All proprerties may have been removed
            if not props:
                delattr(tag.attrs, 'style')
            else:
                tag.attrs.style = ';'.join(props)
        return updated

    def visitRow(self, row):
        '''Optimize this table p_row'''
        updated = self.removeAttributes(row)
        # Walk cells
        for cell in row.iterChildren(types='Cell'):
            # Remove undesired attributes
            r = self.removeAttributes(cell)
            updated = updated or r
            # Remove undesired CSS properties
            attrs = cell.attrs
            if attrs and 'style' in attrs:
                r = self.removeProperties(cell)
                updated = updated or r
        return updated

    def visitTable(self, table):
        '''Visiting a table = optimizing it'''
        # Remove undesired attributes on the p_table
        updated = self.removeAttributes(table)
        # Ensure the table as simple 1px border
        attrs = table.attrs
        if not attrs or 'border' not in attrs or attrs.border != '1':
            table.addAttribute('border', 1)
            updated = True
        # Remove undesired attributes on sub-tags: tr, th and td. Find and walk
        # all table rows.
        for tag in table.iterChildren(types=('Row', 'Header', 'Body')):
            if tag.name == 'tr':
                r = self.visitRow(tag)
                updated = updated or r
            elif tag.name in ('thead', 'tbody'):
                for row in tag.iterChildren(types='Row'):
                    r = self.visitRow(row)
                    updated = updated or r
        return updated
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class KeepWithNext(Visitor):
    # CSS classes with "keep with next" functionality, by tag type. By default,
    # class "ParaKWN" is applied.
    cssClasses = {'li': 'podItemKeepWithNext'}
    # We will only walk tags directly under the root tag, having one of these
    # types.
    rootTagTypes = ('Para', 'List', 'Table')

    def __init__(self, chars):
        # The number of chars that must be kept together
        self.charsToKeep = chars
        # The number of chars walked and counted so far
        self.charsWalked = 0
        # If we must split a table due to our "keep-with-next" constraints, we
        # store here the table row of the table to split; this row will be the
        # first of the second table.
        self.splitRow = None

    def charsReached(self):
        '''Have we reached self.charsToKeep ?'''
        return self.charsWalked >= self.charsToKeep

    def splitTable(self):
        '''Splits the table containing p_self.splitRow into 2 separate tables in
           order to enforce "keep-with-next" constraints.'''
        # Let's call the table to split "table" and the splitted tables
        # "table1" and "table2". Instead of performing a real split, where
        # "table1" will contain the first "table" rows, including the one
        # preceding p_self.splitRow, and "table2" will contain the last "table"
        # rows, from p_self.splitRow to the end, we will duplicate "table":
        # "table1" and "table2" will contain all "table" rows. Indeed, xhtml2odt
        # and LibreOffice will potentially compute cell's widths, and if these
        # computations are performed on "table1" and "table2" respectively
        # containing their corresponding rows, they may produce different
        # results on "table1" and on "table2". That is not acceptable. This is
        # why we keep all rows duplicated in both tables, but we set a
        # "keeprows" attribute that will be processed by the POD's
        # post-processor.
        # Get the first table's tags of interest
        tbody1 = self.splitRow.parent
        table1 = tbody1.parent
        # Count the number of rows within table1's header
        header1 = table1.getChild('Header')
        if header1:
            headerRows = header1.countChildren('Row')
        else:
            headerRows = 0
        # Create the second table by cloning the first one
        table2 = table1.clone()
        tbody2 = tags.Body('tbody', parent=table2)
        # Ensure "table2" will be kept with the next paragraphs
        table2.addCss('TableKWN')
        # Copy all rows from "table1" to "table2". Here, we cheat: instead of
        # copying rows, we copy them by reference. The rows will have "tbody1"
        # as parent, but currently this has no importance when dumping the tree
        # of tags as XHTML.
        tbody2.children = tbody1.children
        # Set attributes "keeprows" on "table1" and "table2"
        i = tbody1.children.index(self.splitRow)
        table1.addAttribute('keeprows', ':%d' % (headerRows+i))
        table1.addAttribute('style', 'margin-bottom:0px')
        table2.addAttribute('keeprows', '%d:' % i)
        table2.addAttribute('style', 'margin-top:0px')
        # Insert table2 just after table1
        parent = table1.parent
        table2.setParent(parent, at=parent.children.index(table1)+1)

    def visitPara(self, para):
        '''Visiting a p_para(graph) = applying the correct "keep-with-next"
           class on it.'''
        para.addCss(self.cssClasses.get(para.name) or 'ParaKWN')
        # Update the number of walked chars
        self.charsWalked += para.getContentLength()

    def visitList(self, list):
        '''Visiting a list = visiting its items in reverse order'''
        # "li" sub-tags are Para instances
        for child in list.iterChildren(types='Para', reverse=True):
            self.visitPara(child)
            if self.charsReached():
                return

    def visitRow(self, row):
        '''We visit a row only for computing its content length'''
        self.charsWalked += row.getContentLength()

    def visitTable(self, table):
        '''Visiting a table = visiting its rows in reverse order.

           If we reach p_self.charsToKeep at a given row R, we must split the
           table in 2 tables: the first one containing all rows preceding R, and
           the second one containing row R and subsequent rows.
        '''
        # Get the "tbody" tag
        tbody = table.getChild('Body')
        if not tbody: return
        # Walk tbody's rows in reverse order
        for row in tbody.iterChildren(types='Row', reverse=True):
            self.visitRow(row)
            if self.charsReached():
                # This row and subsequent ones must be splitted in a second
                # table, excepted if this row is the first row of data in its
                # table. Indeed, we will not take the risk of having table
                # headers left alone on a separate page.
                if row != tbody.getChild('Row'):
                    self.splitRow = row
                break

    def visit(self, env):
        '''We will determine the set of root paragraphs corresponding to the
           last "self.chars" chars and apply, on each one, a special class that
           will ensure it will be kept with the next one on the same page.'''
        # Walk tags directly under the root tag, in reverse order
        for child in env.r.iterChildren(types=self.rootTagTypes, reverse=True):
            # Visit the child
            getattr(self, 'visit%s' % child.className)(child)
            # Stop if we have reached the number of chars to keep together
            if self.charsReached():
                break
        # If we have reached chars in the middle of a table, we must split it
        if self.splitRow: self.splitTable()
        return True

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Cleaner(Visitor):
    '''Removes empty paragraphs at the end of the text and/or between non empty
       paragraphs.'''

    def __init__(self, removeTrailingParas=True):
        # If p_removeTrailingParas is...
        # ----------------------------------------------------------------------
        # True  | empty paragraphs situated at the end of the text will be
        #       | removed. Empty paragraphs found between 2 non empty paragraphs
        #       | will be left untouched.
        # ----------------------------------------------------------------------
        # False | empty paragraphs found between 2 non empty paragraphs will be
        #       | removed. Those situated at the end of the text will be left
        #       | untouched.
        # ----------------------------------------------------------------------
        # None  | Nothing is done regarding empty paragraphs.
        # ----------------------------------------------------------------------
        self.removeTrailingParas = removeTrailingParas

    def isEmptyPara(self, child):
        '''Does p_child represent an empty paragraph or something we can ignore
           (like a Content instance) ?'''
        return not child.isTag or \
               (isinstance(child, tags.Para) and child.isEmpty())

    def removeEndingParas(self, root):
        '''Remove trailing empty paragraphs'''
        updated = False
        for child in root.iterChildren(reverse=True):
            # Content at this root level is garbage
            if self.isEmptyPara(child):
                root.children.remove(child)
                updated = True
            else:
                # Stop here, we have met something non empty
                break
        return updated

    def removeEmptyParas(self, root):
        '''Remove empty paragraphs being inserted between 2 non empty
           paragraphs.'''
        updated = False
        # Browse tags in reverse order. Do not touch the end of the content
        # until non empty content is found (removing stuff in this part is done
        # via m_removeEndingParas, if enabled). Then, remove any empty paragraph
        # found.
        inBottom = True
        # Remember the previously encountered child (=the one following the
        # current child, because we walk then in reverse order).
        previous = None
        for child in root.iterChildren(reverse=True):
            # Ignore empty content at the bottom of the text
            if self.isEmptyPara(child):
                if inBottom:
                    continue
                # Remove this empty para and the possible carriage return
                # that follows (<p></p>\n).
                if child.isTag:
                    root.children.remove(child)
                    if previous and not previous.isTag:
                        root.children.remove(previous)
                    updated = True
            else:
                # We have met something non empty
                inBottom = False
            previous = child
        return updated

    def visit(self, env):
        '''Removes the appropriate paragraphs'''
        remove = self.removeTrailingParas
        if remove is None: return
        method = remove and 'removeEndingParas' or 'removeEmptyParas'
        return getattr(self, method)(env.r)
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
