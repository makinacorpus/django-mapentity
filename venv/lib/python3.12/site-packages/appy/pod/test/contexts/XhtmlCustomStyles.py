xhtmlInput='''
<!-- "margin-left" property on paragraphs -->
<p>Normal paragraph with a specia char\n\t\v\x0cUn montant de \x0b\v145,00 € TVAC</p>
<p style="margin-left: 25px">25px margin left</p>
<p style="margin-left: 4cm">4cm margin left</p>
<p style="margin-left:-1cm">Text with a negative left margin</p>
<p style="margin-left:-.75pt">Mon texte avec retrait de margin-left:-.75pt;</p>

<!-- Text alignment within table cells (ckeditor-generated) -->
<table border="1" cellpadding="1" cellspacing="1" style="width:500px">
 <tbody>
  <tr>
   <td>Left-aligned text</td>
   <td style="text-align: center;">Centered text</td>
  </tr>
  <tr>
   <td style="text-align: right;">Right-aligned text</td>
   <td></td>
  </tr>
 </tbody>
</table>

<!-- Text alignment within paragraphs and divs -->
<p style="text-align: left">Left-aligned text</p>
<p style="text-align: right; margin-right: 30px">Right-aligned + margin rigth</p>
<p style="text-align: justify; margin-left: 2cm; margin-right: 2cm">Justified ext between margins Justified ext between margins
Justified ext between margins Justified ext between margins Justified ext between margins Justified ext between margins Justified ext between margins
justified ext between margins Justified ext between margins Justified ext between margins Justified ext between margins</p>
<div style="text-align: center; margin-top: 30px">Margin top + center in a div</div>
<p style="margin-left: 4cm">Second with 4cm margin left, to check if a single style will be generated</p>

<!-- Transfering styles from deleted inner-p tags -->
<table>
  <tr>
    <td><p style="text-align:right;">Right-aligned text, style applied on a p inside a td</p></td>
    <td><p style="text-align:center;">Centered text, style applied on a p inside a td</p></td>
    <td><p class="my_class">Text with a CSS class defined on the inner p</p></td>
  </tr>
</table>
<ul>
  <li><p style="font-style: italic; font-weight: bold;">Attribute "style" bold+italic</p></li>
  <li><p style="text-decoration: underline">Underline</p></li>
  <li><p class="Signature">"class" attribute using style "Signature"</p></li>
</ul>
<table border="1">
  <tbody>
    <tr>
      <td><p style="text-decoration: overline">Overlined text</p>
          <p style="font-weight: bold">This will be bold, style is not ignored anymore.</p></td>
      <td style="text-decoration: line-through">Line-through</td>
    </tr>
  </tbody>
</table>
<ul>
  <li style="font-style: italic; text-decoration: line-through;">italique barré;</li>
</ul>
<table>
 <tr><td style="font-style: italic">TD italique</td></tr>
</table>
<ol start="1" style="list-style-type: decimal; margin-left: 40px;">
 <li>
  <p>Item with left indent</p>
 </li>
</ol>
<p style="line-height: normal">Paragraph with a normal line-height</p>
<p style="line-height: 1.5em">Paragraph with a line-height of 1.5em.</p>
'''
