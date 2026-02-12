# I need a class
class D:
    def getAt1(self):
        return '\n<p>Test1<br /></p>\n'
dummy = D()

titles = '''
<h1>Title 1</h1>
<h2>Title 2</h2>
<h3>Title 3</h3>
<h4>Title 4</h4>
<h5>Title 5</h5>
<h6>Title 6</h6>'''

defaultStyles = '''
<p>Vu que...</p>
<p>Vu que 2...</p>
<!-- A page break after this para -->
<p style="page-break-after: always">Page break after this paragraph.</p>
<p style="margin-left:25px">Attendu que...;</p>
<div style="page-break-before: always">Page break before this one.</div>
'''
