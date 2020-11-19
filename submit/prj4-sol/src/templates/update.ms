<!DOCTYPE html>
<head>
  <title>Update</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
{{#update}}
  <h1>Update Spreadsheet for {{spreadsheetName}}</h1>
  <p>
    <a id="ss-act" href="/">Open different spreadsheet</a>
  </p>
  <table class="ss">
    <tbody>
    <tr>
      {{#tablefirst}}<th>{{HeaderValue}}</th>{{/tablefirst}}
    </tr>
      {{#tablerow}}
      <tr>
        <th>{{RowNum}}</th>
        {{#tablecol}}<td>{{CellValue}}</td>{{/tablecol}}
      </tr>
      {{/tablerow}}
    </tbody>
  </table>
  <p class="error"></p>
  <form action="/ss/{{spreadsheetName}}" method="POST">
    <label for="ssAct">Action</label>
    <span>
      <fieldset>
        <div>
          <input name="ssAct" type="radio" id="actClear" value="clear" {{Checked1}}>
          <label for="actClear">Clear Spreadsheet</label>
        </div>
        <div>
          <input name="ssAct" type="radio" id="actDelete" value="deleteCell" {{Checked2}}>
          <label for="actDelete">Delete Cell</label>
        </div>
        <div>
          <input name="ssAct" type="radio" id="actUpdate" value="updateCell" {{Checked3}} >
          <label for="actUpdate">Update Cell</label>
        </div>
        <div>
          <input name="ssAct" type="radio" id="actCopy" value="copyCell" {{Checked4}}>
          <label for="actCopy">Copy Cell</label>
        </div>
      </fieldset>
      <br>
      <span class="error" id="ssActError">{{ActionError}}</span>
    </span>
    <label for="cellId">Destination Cell ID</label>
    <span>
      <input name="cellId" value="{{LastCell}}" id="cellId">
      <br>
      <span class="error" id="cellIdError">{{CellError}}</span>
    </span>
    <label for="formula">Formula</label>
    <span>
      <input name="formula" value="{{LastFormula}}" id="formula">
      <br>
      <span class="error" id="formulaError">{{FormulaError}}</span>
    </span>
    <label>&nbsp;</label>
    <input type="submit" value="Update">
  </form>
{{/update}}
</body>
</html>
