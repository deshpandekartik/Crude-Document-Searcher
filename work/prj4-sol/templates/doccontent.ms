<!DOCTYPE html>
<html>
	<head>
    		<title> {{docname}} </title>
    		
		<link rel="stylesheet" href="{{{base}}}/css/style.css">
  	</head>
  
	<body>
    		<h1 class="doc-name"> {{docname}} </h1>
    		<ul>
			{{#errorMessage}}
	       	 		<li class="error"> {{errorMessage}} </li>
			{{/errorMessage}}
    		</ul>
    		<pre class="content">
			{{doccontent}} 	
		</pre>
