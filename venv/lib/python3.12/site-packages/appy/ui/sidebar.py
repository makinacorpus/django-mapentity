#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
from appy.px import Px

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
WIDTH_KO  = 'Wrong width value "%s": any width must be a positive integer.'
WUNIT_KO  = 'Wrong width unit "%s": "px" is the only acceptable value for now.'

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Sidebar:
    '''The Appy sidebar'''

    def __init__(self, width=320, minWidth=None, maxWidth=None, unit='px'):
        '''Create a Sidebar object on a Appy class, in static attribute named
           "sidebar", if you want to display a sidebar for objects of this
           class.'''
        # If you specify a not-None p_minWidth or p_maxWidth being different
        # from p_width, the sidebar will be resizable.
        #
        # The default sidebar width, as an integer
        self.width = self.check(width)
        # The minimum width (int): the sidebar will never be resized at a width
        # being lower than this one.
        self.minWidth = self.check(minWidth) or width
        # The maximum width (int): the sidebar will never be resized at a width
        # being higher than this one.
        self.maxWidth = self.check(maxWidth) or width
        # The unit for width values ("px" only for the moment)
        if unit != 'px': raise Exception(WUNIT_KO % str(unit))
        self.unit = unit

    def check(self, width):
        '''Raises an exception if p_width is invalid'''
        if width is None: return
        if not isinstance(width, int) or width <= 0:
            raise Exception(WIDTH_KO % str(width))
        return width

    def getWidth(self, name='width'):
        '''Returns the width, as a string'''
        r = getattr(self, name)
        return f'{r}{self.unit}'

    def isResizable(self, c):
        '''This sidebar will be resizable if min and/or max widths are different
           from p_self.width.'''
        w = self.width
        return self.minWidth != w or self.maxWidth != w

    def getJs(self, o):
        '''Return the code that creates a JS Sidebar object'''
        return f'var sidebar=new Sidebar("{o.class_.name}",{self.width},' \
               f'{self.minWidth},{self.maxWidth});'

    @classmethod
    def get(class_, tool, o, layout, popup):
        '''The sidebar must be shown when p_o declares to use the sidebar. If
           it must be shown, a Sidebar object is returned.'''
        if not o or popup: return
        sidebar = getattr(o.class_.python, 'sidebar', None)
        if not sidebar: return
        if callable(sidebar): sidebar = sidebar(o, layout)
        return sidebar

    px = Px('''
     <div var="hostLayout=layout;
               layout='view';
               inSidebar=True;
               page,grouped,css,js,phases=o.getGroupedFields('main','sidebar');
               collapse=ui.Collapsible.get('sidebar', dright, req)"
          id=":collapse.id" class="sidebar" style=":collapse.style">

      <!-- Include specific CSS and JS, and create the JS Sidebar object -->
      <x>::ui.Includer.getSpecific(tool, css, js)</x>
      <script>::sidebar.getJs(o)</script>

      <!-- The "resizer" allows to resize the sidebar -->
      <x if="sidebar.isResizable(_ctx_)">
       <div class="sbResizer" onmousedown="sidebar.dragStart(event)"
            style="cursor:ew-resize"></div>
       <div class="sbMask" style="z-index:-1"></div>
      </x>

      <!-- Fields defined within the sidebar -->
      <div class="sbContent">:o.pxFields</div>
     </div>''',

     css='''.sidebar { padding:|sbPadding|; position:sticky; top:0;
                       overflow-y:auto; overflow-x:auto }
            .sbContent { margin:|sbMargin| }
            .sbResizer { position:absolute; top:0; width:8px; height:100%;
                         background-color:lightgrey; opacity:0.1 }
            .sbMask { position:absolute; top:0; left:8px;
                      width:calc(100% - 8px); height:100% }
            .sbResizer:hover { background-color:lightgrey; opacity:0.5 }''',

     js = '''
       class Sidebar {

         constructor(cls, width, minWidth, maxWidth) {
           // The related Appy class
           this.cls = cls;
           // Default widths
           this.width = width;
           this.minWidth = minWidth;
           this.maxWidth = maxWidth;
           // The DOM node representing the sidebar
           this.node = document.currentScript.parentNode;
           this.resizer = null; // Will be initialized later
           this.mask = null; // Idem
           // Initialise the sidebar's current width
           const current = ui.get(cls).sidebarWidth || `${width}px`;
           this.setWidth(current);
           ui.set(cls, 'sidebarWidth', current);
           // Store here the current mouse x position while dragging the resizer
           this.mouseX = null;
           /* If, while dragging, we move the mouse above p_maxWidth, the
              surplus, stored in the following attribute, will be a positive
              number of pixels, computed as the difference between the current x
              mouse position and the sidebar's max width. Inversely, if, while
              dragging, we move the mouse below the p_minWidth, the surplus will
              be negative. */
           this.surplus = 0;
         }

         setWidth(width) {
           /* Set the sidebar's current width. Also set min-width; else, the
              width seems, in some situations, not be taken into account. */
           this.node.style.width = width;
           this.node.style.minWidth = width;
         }

         resizeInside(delta, candidate) {
           /* Called by m_resize when the cursor is within the sidebar's
              [min,max] acceptable width range. Returns a tuple of the form
              (i_width, b_toggleCursor): i_width is the recomputed sidebar
              width, while b_toggleCursor indicates if the cursor must be
              changed. */
           let future = null, toggleCursor = false;
           if (delta > 0) {
             // The mouse went to the left (the sidebar is stretched)
             if (candidate > this.maxWidth) {
               // We would stretch the sidebar above its max width
               future = this.maxWidth;
               this.surplus = candidate - future;
               toggleCursor = true;
             }
             else {
               future = candidate; // The stretched sidebar is acceptable
             }
           }
           else {
             // The mouse went to the right (the sidebar is shrinked)
             if (candidate < this.minWidth) {
               // We would shrink the sidebar below its min width
               future = this.minWidth;
               this.surplus = candidate - future;
               toggleCursor = true;
             }
             else future = candidate; // The stretched sidebar is acceptable
           }
           return [future, toggleCursor];
         }

         resizeOutside(delta, candidate) {
           /* Called by m_resize when the cursor is outside the sidebar's
              [min,max] acceptable width range. Returns a tuple being similar to
              m_resizeInside. */
           let future = null, toggleCursor = false;
           if (this.surplus > 0) { // We are above the max width
             if (delta > 0) this.surplus += delta; // More surplus, simply
             else {
               const deltaS = this.surplus + delta;
               if (deltaS > 0) this.surplus += delta; // Less surplus, simply
               else { // We are back below the sidebar's max width
                 future = this.maxWidth + deltaS;
                 this.surplus = 0;
                 toggleCursor = true;
               }
             }
           }
           else { // The surplus is negative: we are below the min width
             if (delta < 0) this.surplus += delta; // More surplus, simply
             else {
               const deltaS = this.surplus + delta;
               if (deltaS < 0) this.surplus += delta; // Less surplus, simply
               else { // We are back above the sidebar's min width
                 future = this.minWidth - deltaS;
                 this.surplus = 0;
                 toggleCursor = true;
               }
             }
           }
           return [future, toggleCursor];
         }

         static resize(event) {
           event.preventDefault();
           const delta = sidebar.mouseX - event.x,
                 current = parseInt(sidebar.node.style.width),
                 surplus = sidebar.surplus,
                 inRange = surplus == 0,
                 candidate = (inRange)? current + delta: null;
           /* v_current is the current sidebar width, while v_candidate is the
              candidate width after the mouse move, if acceptable. */
           let future = null, toggleCursor = false;
           // v_future will store the sidebar width after the current move
           if (inRange) {
             // sidebar.mouseX is currently within sidebar's [min, max] widths
             [future, toggleCursor] = sidebar.resizeInside(delta, candidate);
           }
           else {
             // sidebar.mouseX is over the max width or below the min width
             [future, toggleCursor] = sidebar.resizeOutside(delta, candidate);
           }
           // Update mouseX
           sidebar.mouseX = event.x;
           // Update the sidebar width, when relevant
           if ((future != null) && (future != current)) {
             sidebar.setWidth(`${future}px`);
           }
           // Update the cursor
           if (toggleCursor) {
             const cursor = (sidebar.surplus == 0)? 'ew-resize': 'not-allowed';
             sidebar.setCursors(cursor);
           }
         }

         toggleMask(show) {
           /* The mask adds an element in front of any other element in the
              sidebar. That way, if the sidebar contains some external viewer
              incrusted in an object tag or iframe, we don't go out of the main
              window and the event listeners continue to work. Else, as soon as
              we touch, while dragging, another window object in the sidebar,
              the drag operation is interrupted. */
           if (!this.mask) this.mask = document.querySelector('.sbMask');
           this.mask.style.zIndex = (show)? 10: -1;
           this.mask.style.backgroundColor = (show)? 'white': 'transparent';
           this.mask.style.opacity = (show)? 0.4: 0.0;
         }

         setCursors(cursor, cursorDoc) {
           /* Sets cursors for the resizer and the document object. If
              p_cursorDoc is null, p_cursor will be set both for the resizer and
              the document. */
           // Sets the p_cursor on the resizer
           if (!this.resizer) this.resizer=document.querySelector('.sbResizer');
           this.resizer.style.cursor = cursor;
           /* Prevent the cursor from switching to the standard pointer
              everytime we are out of the resizer. */
           document.body.style.cursor = cursorDoc || cursor;
         }

         dragStart(event) {
           event.preventDefault();
           // Ensure the "resize" cursor is set
           this.setCursors('ew-resize');
           // Show the mask in the sidebar
           this.toggleMask(true);
           // The user clicked in the resizer: start the resize (drag) operation
           const w = event.target.getBoundingClientRect().width;
           if (event.offsetX < w) {
             this.mouseX = event.x;
             window.addEventListener('mousemove', Sidebar.resize);
             window.addEventListener('mouseup', Sidebar.dragStop);
           }
         }

         static dragStop(event) {
           /* The user has released the mouse button: stop the resize and store
              the new sidebar width. */
           window.removeEventListener('mousemove', Sidebar.resize);
           window.removeEventListener('mouseup', Sidebar.dragStop);
           ui.set(sidebar.cls, 'sidebarWidth', sidebar.node.style.width);
           // Reinitialize various sidebar elements
           sidebar.setCursors('ew-resize', 'initial');
           sidebar.surplus = 0;
           sidebar.toggleMask(false);
         }
       }''')
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
