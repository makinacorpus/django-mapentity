xhtmlInput = '''
<ol>
 <li>Row 1;</li>
 <li>row 2 :
  <p>- sub-paragraph, row 1</p>
  <p>- sub-paragraph, row 2</p>
 </li>
 <li><p class="Signature">row 3 (Signature style applied);</p></li>
 <li>row 4:
   <ul>
     <li>Sub list:<p>aa</p><div>bb</div><div>aa</div></li>
     <li><div>Hello</div></li>
     <li>Normal</li>
   </ul>
 </li>
</ol>
<ol>
  <li><div><p>Texte</p></div></li>
  <li>
    <p>Texte before the table</p>
    <!-- This table was unrendered -->
    <table>
      <tbody>
       <tr><td>Texte</td><td>Texte</td><td>Texte</td></tr>
       <tr><td>Texte</td><td>Texte</td><td>Texte</td></tr>
      </tbody>
    </table>
    <p>Texte after the table</p>
  </li>
</ol>'''
