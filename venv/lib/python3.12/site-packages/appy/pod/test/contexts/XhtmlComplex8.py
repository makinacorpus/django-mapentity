xhtmlInput = '''
<ol><li>
<div style="text-align: justify;">Le Gouvernement adopte le projet d’arrêté modifiant l'arrêté du 9 février 1998 portant délégations de compétence et de signature aux fonctionnaires généraux et à certains autres agents des services du Gouvernement de la Communauté française - Ministère de la Communauté française.</div>
</li><li>
<div style="text-align: justify;">Il charge le Ministre de la Fonction publique de l'exécution de la présente décision.</div>
</li></ol>
<p class="pmParaKeepWithNext">&nbsp;</p>
<!-- li tags into div tags, as produced by Appy's HtmlDiff -->
<ul>
  <li>Ligne 1</li>
  <div name="delete" style="color:red; text-decoration:line-through; rsor:help" title="">
    <li>Ligne 2</li>
  </div>
  <li>Ligne 3</li>
</ul>
'''

xhtml2 = '''
<p>Appy.pod failed to render paragraphs
inside a <strong>blockquote</strong> tag:</p>
<blockquote>
<p>This text was not rendered.</p>
</blockquote>

<p>Same for DIVs inside a <strong>blockquote</strong> tag:</p>
<blockquote>
<div>This text was not rendered.</div>
</blockquote>

<p>Only flowing text passes :</p>
<blockquote>
This text is rendered.
</blockquote>
'''

text1 = '''IMIO & Geezteem'''
