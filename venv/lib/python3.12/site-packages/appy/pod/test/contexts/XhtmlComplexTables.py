xhtmlInput = '''
<p>
<table class="plain">
<thead>
<tr>
<th class="align-right" align="right">Title column one<br /></th>
<th>title column two</th>
</tr>
</thead>
<tbody>
<tr>
<td class="align-right" align="right">Hi with a <a class="generated" href="http://easi.wallonie.be">http://easi.wallonie.be</a> <br /></td>
<td>fdff</td>
</tr>
<tr>
<td class="align-right" align="right"><br /></td>
<td><br /></td>
</tr>
<tr>
<td class="align-right" align="left">Some text here<br />
<ul><li>Bullet One</li><li>Bullet Two</li>
<ul><li>Sub-bullet A</li><li>Sub-bullet B</li>
<ul><li>Subsubboulette<br /></li></ul>
</ul>
</ul>
</td>
<td>
<table>
<tbody>
<tr>
<td>SubTable</td>
<td>Columns 2<br /></td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<br /></p>
'''

xhtmlInput2 = '''
<ul><li>
<p>a</p>
</li><li>
<p>b</p>
</li><li>
<p>c</p>
</li>
<ul>
  <li><p>SUB</p>
  </li>
</ul>
</ul>
'''

xhtmlInput3 = '''
 <table width="500px">
  <tr>
   <td width="876px">AA</td>
   <td width="474px">BB</td>
  </tr>
 </table>
 <table border="1" cellpadding="1" cellspacing="1" style="width:250px">
<tbody>
	<tr>
		<td>1</td>
		<td>Texte texte texte texte texte texte texte texte <s><strong>gras souligné</strong></s> texte texte texte texte texte texte</td>
	</tr>
	<tr>
		<td>2</td>
		<td>Texte texte texte texte texte texte texte texte <em>italique</em> texte texte texte texte texte texte texte</td>
	</tr>
	<tr>
		<td>3</td>
		<td>Texte texte texte texte texte texte texte texte texte <s>barré</s> texte texte texte texte texte texte</td>
	</tr>
</tbody>
</table>'''

xhtmlInput4 = '''
<table>
  <tbody>
    <tr>
      <td colspan="2">SOCIETE</td>
      <td colspan="2">OUTIL</td>
      <td colspan="2">POUBELLES</td>
      <td colspan="2">VELOS</td>
      <td colspan="2">CENDRIERS</td>
      <td colspan="2">TOTAL DE L'OFFRE</td>
    </tr>
  </tbody>
</table>
'''
