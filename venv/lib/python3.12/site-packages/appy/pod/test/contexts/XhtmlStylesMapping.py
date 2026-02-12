xhtmlInput = '''
<p>Hello.</p>
<h2>Heading One</h2>
Blabla.<br />
<h3>SubHeading then.</h3>
Another blabla.<br /><br /><br />
<p style="font-weight:bold">Hello CentreCentre</p>
<div>In a div</div>
'''
# I need a class
class D:
    def getAt1(self):
        return xhtmlInput
dummy = D()

xhtmlInput2='''
<p style="font-style:italic">Mapped to style_1.</p>
'''

xhtmlInput3='''
<p>The text within cells must be in style Blue</p>
<table><tr><td><p>Must be Blue</p></td><td><p>Here too</p></td></tr></table>
'''
