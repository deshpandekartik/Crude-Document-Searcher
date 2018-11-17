
<!DOCTYPE html>

<html>
	<head>
    		<title>Documents Collections Search</title>
    		<link rel="stylesheet" href="{{{base}}}/css/style.css">
  	</head>
  	<body>
    		<h1>Documents Collection Search</h1>

		{{#errorNoDoc}}
    		<ul>
			 <li class="error"> {{errorNoDoc}} </li>
    		</ul>
		{{/errorNoDoc}}

    		<form method="GET" action="{{{base}}}/search.html">
	    	 	 <p>
	        		Please fill in one or more search terms in the field below:
	      		</p>
	
      			<label>
        			<span class="label">Search Terms:</span>
        	  			<input id="query" name="q" value="{{searchterms}}">
			</label>
			<br>
			{{#errorNoSearch}}
			<label>
				<span class="error"> {{errorNoSearch}} </span><br/>
 		     	</label>
     			{{/errorNoSearch}}

 			<input id="submit" name="submit" type="submit" value="search" class="control">
    		</form>

     
	{{#resultsstatus}}	 
		<h2>Search Results</h2>
	{{/resultsstatus}}	

	{{#results}}
        	<p class="result">
	  		<a class="doc-name" href="{{{base}}}/{{{name}}}"> {{{name}}} </a><br>
			
			{{{#lines}}}
				{{{lines}}}
			{{{/lines}}}
			<br>
		</p>
	{{/results}}


	{{#prev}}
                <a id="previous" href="{{prev}}">Previous</a> 
        {{/prev}}

	{{#next}}
		      <a id="next" href="{{next}}">Next</a>
	{{/next}}
