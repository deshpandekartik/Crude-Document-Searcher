<!DOCTYPE html>
<html>
	<head>
    		<title>Add Document</title>
    		<link rel="stylesheet" href="{{{base}}}/css/style.css">
  	</head>
  
	<body>
    		<h1>Add Document</h1>
    		<ul>
    		</ul>
    		<form action="{{{base}}}/add.html" method="POST" enctype="multipart/form-data">
      
			<label>
        			<span class="label"> <b> Choose file: </b></span>
        			<input id="file" name="file" type="file">
      			</label>
      			<br/>
	
			{{#errorMessage}}
      				<span class="error">{{errorMessage}}</span><br/>
      			{{/errorMessage}}

      			<input id="submit" name="submit" type="submit" value="add" class="control">
    		</form>
{{>footer}}
</body>
</html>

