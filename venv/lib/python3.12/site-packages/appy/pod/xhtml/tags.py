#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
from appy.xml import XHTML_SC
from appy.xml.escape import Escape
from appy.model.utils import Object as O

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class ChildrenIterator:
    ''''Iterator on children of a given tag'''
    def __init__(self, tag, types=None, reverse=False):
        # The parent tag
        self.tag = tag
        # Only children being of some p_types will be walked. If p_types is
        # None, all children will be walked.
        self.types = types
        if isinstance(types, str):
            self.types = (self.types,)
        # If p_reverse is True, tags will be walked in reverse order
        self.reverse = reverse
        # The index of the currently walked child
        if not tag.children:
            self.i = -1
        else:
            if reverse:
                self.i = len(tag.children) - 1
            else:
                self.i = 0

    def __iter__(self): return self

    def matches(self, child):
        '''Does p_child match self.types ?'''
        if not self.types: return True
        return child.__class__.__name__ in self.types

    def increment(self):
        '''Increment or decrement p_self.i, depending on _self.reverse'''
        if self.reverse:
            self.i -= 1
        else:
            self.i += 1

    def hasNext(self):
        '''Independently of self.types, is there still a next child to walk?'''
        i = self.i
        if i == -1: return
        if self.reverse:
            return i >= 0
        else:
            return i < len(self.tag.children)

    def __next__(self):
        '''Get the next child'''
        # Raise a StopIteration if we have no more children to return
        if not self.hasNext(): raise StopIteration
        # Get the next child having the required type
        found = False
        while not found:
            # Get the child at the current position
            child = self.tag.children[self.i]
            self.increment()
            if self.matches(child):
                found = True
                break
            else:
                if not self.hasNext(): raise StopIteration
        return child

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Tag:
    '''Represents an HTML tag'''
    
    # This is a tag and not tag content
    isTag = True
    # Being "walkable" means: tags of a given type can be globally visited. For
    # example, tables are globally walkable, while rows are not: rows of a given
    # table can only be visited via this table.
    walkable = False
    # A tag being "structural" means that it cannot directly hold textual
    # content.
    structural = False

    def __init__(self, name, attrs=None, parent=None):
        # The tag name, as a string ("p", "div", etc)
        self.name = name
        # The class name (name of a Tag sub-class)
        self.className = self.__class__.__name__
        # Is that a self-closing tag ?
        self.selfClosing = name in XHTML_SC
        # Tag's attributes. CSS class(es) are extracted in self.css while other
        # attributes are stored in self.attrs.
        self.css = None
        self.attrs = attrs and self.extractAttributes(attrs) or None
        # Links between parents and children
        self.parent = self.children = None
        if parent: self.setParent(parent)

    def clone(self):
        '''Create and return a clone of this tag'''
        # Create the clone
        class_ = eval(self.className)
        clone = class_(self.name)
        # Copy attributes when present
        if self.attrs:
            clone.attrs = self.attrs.clone()
        if self.css:
            clone.css = self.css[:]
        return clone

    def extractAttributes(self, attrs):
        '''Extracts p_attr(ibutes) defined for this tag'''
        r = O()
        for name, value in attrs.items():
            if name == 'class':
                self.css = [value]
            else:
                setattr(r, name, value)
        return r

    def setParent(self, parent, at=None):
        '''Sets a p_parent to this tag, or replace the current parent if there
           is one.

           This method establishes a bidirectional link between p_self
           (>.parent) and p_parent (>.children).

           If p_at is None, p_self is appended at the end of p_parent's
           children. Else, it is inserted at index specified in p_at.
        '''
        if self.parent:
            # Remove p_self as this parent's child
            self.parent.children.remove(self)
        # Set p_parent as p_self's parent
        self.parent = parent
        # Set p_self as p_parent's child
        children = parent.children
        if children is None:
            parent.children = [self]
        else:
            if at is None:
                children.append(self)
            else:
                children.insert(at, self)

    def getChild(self, type):
        '''Returns the first or unique p_self's child being of this p_type'''
        if not self.children: return
        for child in self.children:
            if child.className == type:
                return child

    def countChildren(self, type):
        '''Returns the number of p_self's children of this p_type'''
        r = 0
        if not self.children: return r
        for child in self.children:
            if child.className == type:
                r += 1
        return r

    def addCss(self, name):
        '''Adds CSS class named p_name among CSS classes defined on p_self'''
        css = self.css
        if css:
            if name not in css:
                css.append(name)
        else:
            self.css = [name]

    def addAttribute(self, name, value):
        '''Adds (or override) attribute p_name with p_value on this tag'''
        # Ensure p_value is a string
        if not isinstance(value, str): value = str(value)
        # Create the object storing attributes if it does not exist
        if not self.attrs: self.attrs = O()
        # Store on it the new (name, value)
        setattr(self.attrs, name, value)

    def getLevel(self):
        '''Return this tag's level, depending on its number of parents'''
        if not self.parent:
            return 0
        return 1 + self.parent.getLevel()

    def getContentLength(self):
        '''Gets the length of every Content instance within this tag and
           children.'''
        r = 0
        if not self.children: return 0
        for child in self.children:
            r += child.getContentLength()
        return r

    def isEmpty(self):
        '''Is this tag empty ?'''
        return self.getContentLength() == 0

    def __repr__(self, level=None):
        '''String representation of a tag'''
        # p_level, if known, can be given
        if level is None: level = self.getLevel()
        r = '%s%s' % (' ' * level, self.name)
        # Add its children tags if any
        if not self.children: return r
        children = [child.__repr__(level+1) for child in self.children \
                    if child.isTag]
        if not children: return r
        return '%s\n%s' % (r, '\n'.join(children))

    def asXhtml(self):
        '''Returns this tag in its XHTML form'''
        r = ['<%s' % self.name]
        # Add attribute "class"
        if self.css:
            r.append(' class="%s"' % ' '.join(self.css))
        # Add other attributes
        if self.attrs:
            for name, value in self.attrs.d().items():
                # Convert special chars into entities
                r.append(' %s="%s"' % (name, Escape.xml(value)))
        # Stop here if it is a self-closing tag
        if self.selfClosing:
            r.append('/>')
            return ''.join(r)
        # Close the opening tag and dump content and sub-tags
        r.append('>')
        if self.children:
            for child in self.children:
                r.append(child.asXhtml())
        # Dump the end tag
        r.append('</%s>' % self.name)
        return ''.join(r)

    def iterChildren(self, **kwargs):
        '''Iterates over p_self's children via a ChildIterator'''
        return ChildrenIterator(self, **kwargs)

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Para(Tag):
    '''Represents any paragraph-like tag: p, div, li...'''

class Inner(Tag):
    '''Represents any inner-tag: span, a, ...'''

class Table(Tag):
    '''Represents a "table" tag'''
    walkable = True
    structural = True

class Header(Tag):
    '''Represents a table header (tag "thead")'''
    structural = True

class Body(Tag):
    '''Represents a table body (tag "tbody")'''
    structural = True

class Row(Tag):
    '''Represents a "tr" tag'''
    structural = True

class Cell(Tag):
    '''Represents a "td" or "th" tag'''
    walkable = False
    structural = False

class List(Tag):
    '''Represents a "ol" or "ul" tag'''

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Mapping between HTML tags and classes representing it
I = Inner
classes = {
  # Paragraph tags
  'p':Para, 'div':Para, 'li':Para, 'blockquote':Para, 'address':Para,
  # Inner tags
  'span':I, 'b':I, 'strong':I, 'i':I, 'em':I, 'u':I, 's':I, 'strike':I, 'q':I,
  'code':I, 'samp':I, 'kbd':I, 'var':I, 'font':I, 'sub':I, 'sup':I, 'a':I,
  'acronym':I, 'abbr':I,
  # Table tags
  'table':Table, 'thead':Header, 'tbody':Body, 'tr':Row, 'td':Cell, 'th':Cell,
  # List tags
  'ol':List, 'ul':List,
}

def get(elem):
    '''Returns the class corresponding to HTML tag p_elem. r_ is the Tag class
       or one of its sub-classes.'''
    if elem in classes: return classes[elem]
    return Tag

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Content:
    isTag = False # This is not a tag, this is tag content
    walkable = False
    children = None # Content has no child
    className = 'Content'

    '''Represents text found within a tag'''
    def __init__(self, text):
        self.text = text

    def getContentLength(self):
        '''Return the length of self.text'''
        return len(self.text)

    def asXhtml(self):
        return self.text
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
