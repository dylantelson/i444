<!DOCTYPE html>
<head>
  <title>Introduction</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
{{#intro}}
  <h1>CS444/544 Spreadsheet Selection by Dylan Telson</h1>
  <form action="/" method="POST">
    <label for="ssName">Open Spreadsheet</label>
    <span>
      <input name="ssName" value id="ssName">
      <br>
      <span class="error" id="ssNameError"></span>
    </span>
    <input type="submit" value="Open">
  </form>
{{/intro}}
</body>
</html>
