xhtmlInput = '''
<div><strong>Programmes FSE Convergence et Compétitivité
             régionale et emploi.</strong></div>
<p>Line-height tests</p>
<p style="line-height: 10px;">Line-height 10px, smaller than text</p>
<p>No line-height</p>
<p style="line-height: 50px;">Line-height 50px</p>
<p>No line-height</p>
<p style="line-height: 3em;">Line-height 3em</p>
<p>No line-height</p>
<p style="line-height: 10ex;">Line-height 10ex</p>
<p>No line-height</p>
'''

xhtmlInput2 = '''<b>Walloon entreprises, welcome !</b><br/>
<br/>
This site will allow you to get simple answers to those questions:<br/>
- am I an SME or not ?<br/>
- to which incentives may I postulate for, in Wallonia, according to my size?
<br/>The little test which you will find on this site is based on the European
Recommendation of May 6th, 2003. It was enforced on January 1st, 2005.
Most of the incentives that are available for SMEs in Wallonia are based
on the SME definition proposed by this recommandation.<br/><br/>

Incentives descriptions come from the 
<a href="http://economie.wallonie.be/" target="_blank">MIDAS</a> 
database and represent all incentives that are available on the Walloon
territory, whatever public institution is proposing it.<br/><br/>

<b>Big enterprises, do not leave !</b><br/><br/>

If this sites classifies you as a big enterprise, you will be able to consult
all incentives that are targeted to you.'''

xhtmlInput3 = '''
<div><strong>Programmes A</strong></div>
<div>Programmes B</div>
<div><strong>Programmes C</strong></div>
<ul><li>a</li><li>b</li></ul>'''

# This test ensures the "lmargin" style is not propagated to the next paragraph
# (it may have been the case in previous pod versions).
xhtmlInput4='''
<p class="lmargin" style="text-align:justify">DECIDE</p>
<p style="text-align:justify">Test</p>
'''
