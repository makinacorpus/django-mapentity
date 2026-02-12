xhtmlInput = '''
<p>Table test.</p>
<p>
<table class="plain">
<tbody>
<tr>
<td style="width:auto !important">Table 1 <br /></td>
<td colspan="2">aaaaa<br /></td>
</tr>
<tr>
<td>zzz <br /></td>
<td>
  <table cellspacing="1">
    <tr>
      <td style="font-size: 75%">SubTableA</td>
      <td>SubTableB</td>
    </tr>
    <tr>
      <td>SubTableC</td>
      <td>SubTableD</td>
    </tr>
  </table>
</td>
<td><b>Hello</b> blabla<table><tr><td>SubTableOneRowOneColumn</td></tr></table></td>
</tr>
<tr>
<td><p>Within a <b>para</b>graph</p></td>
<td><b>Hello</b> non bold</td>
<td>Hello <b>bold</b> not bold</td>
</tr>
</tbody>
</table>
</p>
<p></p>
<table border="1" cellpadding="5" cellspacing="5" style="width:500px">
 <tbody>
  <tr>
   <td style="background-color:rgb(255, 204, 51); color:rgb(84, 194, 33);">Fond en RVB et texte vert</td>
  </tr>
  <tr>
   <td style="background-color:#eb9eb9; color: #205c90">
    <p>Dans un &lt;p&gt; fond en # et texte bleu</p>
   </td>
  </tr>
  <tr>
   <td style="background-color:green; color: grey;">Fond en HTML color et texte gris</td>
  </tr>
 </tbody>
</table>
<p></p>
<table cellspacing="0">
<tr>
<th style="font-size:10px">Température</th>
<th colspan="2"><span style="font-size:10px">Janvier</span></th>
<th colspan="2"><span style="font-size:10px">Février</span></th>
<th colspan="2"><span style="font-size:10px">Mars</span></th>
<th colspan="2"><span style="font-size:10px">Avril</span></th>
<th colspan="2"><span style="font-size:10px">Mai</span></th>
<th colspan="2"><span style="font-size:10px">Juin</span></th>
<th colspan="2"><span style="font-size:10px">Juillet</span></th>
<th colspan="2"><span style="font-size:10px">Août</span></th>
<th colspan="2"><span style="font-size:10px">Septembre</span></th>
<th colspan="2"><span style="font-size:10px">Octobre</span></th>
<th colspan="2"><span style="font-size:10px">Novembre</span></th>
<th colspan="2"><span style="font-size:10px">Décembre</span></th>
</tr>
<tr>
<td style="font-size:9px" rowspan="5">Les cinq mois les plus chauds</td>
<td><span style="font-size:9px">1975</span></td>
<td><span style="font-size:9px">6.3</span></td>
<td><span style="font-size:9px">1990</span></td>
<td><span style="font-size:9px">7.9</span></td>
<td><span style="font-size:9px">1991</span></td>
<td><span style="font-size:9px">9.5</span></td>
<td><span style="font-size:9px">1987</span></td>
<td><span style="font-size:9px">11.9</span></td>
<td><span style="font-size: 9px; color: red;">1947</span></td>
<td><span style="font-size:9px">15.8</span></td>
<td><span style="font-size:9px">1976</span></td>
<td><span style="font-size:9px">19.3</span></td>
<td><span style="font-size:9px">1994</span></td>
<td><span style="font-size:9px">21.8</span></td>
<td><span style="font-size:9px">1997</span></td>
<td><span style="font-size:9px">21.2</span></td>
<td><span style="font-size:9px">1949</span></td>
<td><span style="font-size:9px">17.7</span></td>
<td><span style="font-size:9px">1921</span></td>
<td><span style="font-size:9px">14.0</span></td>
<td><span style="font-size:9px">1994</span></td>
<td><span style="font-size:9px">10.4</span></td>
<td><span style="font-size:9px">1934</span></td>
<td><span style="font-size:9px">7.5</span></td>
</tr>
</table>
<table cellspacing="0" cellpadding="0" border="0" style="width:1024px">
 <tbody>
 </tbody>
</table>
<p></p>
<table border="0">
  <tr><td>A table</td><td>without</td></tr>
  <tr><td colspan="2" align="center">b o r d e r</td></tr>
</table>
<p></p>
<table border="1" style="border:1px solid black;" class="TableKWN">
    <tbody>
        <tr>
            <td>1</td>
        </tr>
        <tr>
            <td>2</td>
        </tr>
    </tbody>
</table>
<table border="undefined"><tr><td>No border</td></tr></table>
<p style="text-indent: -1.00cm">Negative text indent kept (outside a table)</p>
<table style="margin-right:auto">
  <tbody>
    <tr>
    </tr>
    <tr>
      <td>Article 1</td>
      <td><p style="text-indent: -1.59cm">Content</p></td>
    </tr>
  </tbody>
</table>
<!-- A simple caption -->
<table border="1" cellpadding="1" cellspacing="1" style="width:500px" summary="Résumé">
 <caption>Titre simple</caption>
  <thead>
   <tr>
    <th scope="col">Head</th>
   </tr>
  </thead>
  <tbody>
   <tr>
    <td>Body</td>
   </tr>
  </tbody>
</table>
<!-- A complex caption -->
<table border="1" cellpadding="1" cellspacing="1" style="width:500px" summary="Et voici mon résumé">
 <caption>
  <p>&nbsp;</p>
  <p><strong>Compte budgétaire</strong></p>
 </caption>
  <thead>
   <tr>
    <th scope="col">H1</th>
    <th scope="col">H2</th>
   </tr>
  </thead>
  <tbody>
   <tr>
    <td>B1</td>
    <td>B2</td>
   </tr>
  </tbody>
</table>
'''
