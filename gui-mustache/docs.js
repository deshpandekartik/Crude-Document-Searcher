'use strict';

const express = require('express');
const multer = require('multer');
const upload = require('multer')();

const fs = require('fs');
const mustache = require('mustache');
const Path = require('path');
const { URL } = require('url');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
	const base = app.locals.base;
  	//@TODO add appropriate routes

	app.get(`/`, redirectRoot(app));

	app.get(`${base}/add.html`, addDocument(app));
	app.post(`${base}/add.html`, upload.single('file'), addDocument(app));

	app.get(`${base}/search.html`, searchDoc(app));	

	// display document
	app.get(`${base}/:id`, showDocument(app));	// must be last
}

/*************************** Action Routines ***************************/

function redirectRoot(app)
{
	return async function(req, res) {
		res.redirect(`${app.locals.base}`);
	};
};
	

function addDocument(app) {
  upload.single('file')
  return async function(req, res) {

	if ( req.method == "GET" ) {
		let model =  {
			base : app.locals.base
  		}
		const html = doMustache(app, 'add', model);
    		res.send(html);
	}
	else if ( req.method == "POST" ) {

		if ( req.file == undefined ) {
				let errormodel =  {
                	        errorMessage: 'please select a file containing a document to upload',
                	        base : app.locals.base
                	}
                const html = doMustache(app, 'add', errormodel);
                res.send(html);	

		}
		else {
		        let name = req.file.originalname.toString("utf8")
		        let content = req.file.buffer.toString("utf8")
		
			name = Path.basename(name, '.txt');

			const json = { name, content };

			// ask helper to upload the file
			let ret = await app.locals.model.addDoc(json)

			res.redirect(app.locals.base + '/' + name);
		}
	}
  };
};

function searchDoc(app) {
        return async function(req, res) {
		
		if (  'q' in req.query  ) {
	
			const searchstring = req.query.q

			let searchmap = new Map()
	
			for ( let searchword of searchstring.split(' ') ) {
	                        searchmap.set(normalizeword(searchword) , true)
	                }

			if ( searchstring.trim() == "" ) {
				// raise error message , empty search string was passed

				let model =  {
	        	                base : app.locals.base,
					errorNoSearch : 'please specify one-or-more search terms'
        	                }
	
				const html = doMustache(app, 'search', model);
	                        res.send(html)
			}
			else {

				let qstring = "?q=" + searchstring

				if ( 'start' in req.query ) {
		
					qstring = qstring + "&start=" + req.query.start
						
					if ( 'count' in req.query ) {
						qstring = qstring + "&count=" + req.query.count
					}
				}
	
				let result = await app.locals.model.searchDoc(qstring)

				if ( result.totalCount == 0 ) {
					// raise error message , no search results found

	                                let model =  {
        	                                base : app.locals.base,
        	                                errorNoDoc : 'no document containing \'' + searchstring + '\' found; please retry',
						searchterms : searchstring
        	                        }

        	                        const html = doMustache(app, 'search', model);
        	                        res.send(html)				
				}
				else {
					result.base = app.locals.base
					result.resultsstatus = true
					result.searchterms = searchstring

					for ( let res of result.results ) {
						for ( let i = 0; i < res.lines.length; i++ ) {
							for ( let word of res.lines[i].split(' ') ) {
								let normword = normalizeword(word)
	
								if ( searchmap.has(normword) ) {
									let replace = '<span class="search-term">' + word + '</span>'
									res.lines[i] = res.lines[i].replace(word, replace)
								}
							}
						}
					}

					const helperURL = await app.locals.model.returnURL()
					for ( let res of result.links ) {
                                                if ( res.rel == "next" ) {
							result.next = res.href.replace( helperURL,'')
							result.next = 'search.html' + result.next
						}

						if ( res.rel == "previous" ) {
							result.prev = res.href.replace( helperURL,'')
							result.prev = 'search.html' + result.prev
						}
                                        }

					const html = doMustache(app, 'search', result);
                                        res.send(html)
			
				}
			}
		}
		else {

			// just the search page was accesed;

			let model =  {
	                        base : app.locals.base
	                }
        	        const html = doMustache(app, 'search', model);
        	        res.send(html);

		}	

	};
}

function showDocument(app) {
  	return async function(req, res) {

		const id = req.params.id;
		if ( id != undefined ) {

			try {	
				let retdata = await app.locals.model.getDoc(id)

				let model =  {
					docname: id,
					doccontent: retdata.content,
                                        base : app.locals.base
                                }
				const html = doMustache(app, 'doccontent', model);
                		res.send(html);
			}
			catch (err) {
				let errormodel =  {
                	                errorMessage: 'doc ' + id + ' not found',
        	                        base : app.locals.base
	                        }
				const html = doMustache(app, 'doccontent', errormodel);
		                res.send(html);
			}
		}
  	};
};



/************************ General Utilities ****************************/

function normalizeword( word ) {

        // convert word to lower case
        word = word.toLowerCase()

        // delete any 's suffix.
        if ( word.endsWith("\'s") )
        {
                word = word.substring(0, word.length - 2);
        }

	// remove non alphanumeric characters

	let wordarr = word.split('')

	for ( let i = 0; i < word.length; i++ ) {
    		let code = word.charCodeAt(i);
	    	if (!(code > 47 && code < 58) && // numeric (0-9)
        		!(code > 64 && code < 91) && // upper alpha (A-Z)
        			!(code > 96 && code < 123)) // lower alpha (a-z)
		{
     			wordarr[i] = ''
    		}
		else {
			break;
		}
	}


	for ( let i = word.length; i > 0; i-- ) {
                let code = word.charCodeAt(i);
                if (!(code > 47 && code < 58) && // numeric (0-9)
                        !(code > 64 && code < 91) && // upper alpha (A-Z)
                                !(code > 96 && code < 123)) // lower alpha (a-z)
                {
                        wordarr[i] = ''  
                }
                else {
                        break;
                }
        }

        return wordarr.join("");
}


/** return object containing all non-empty values from object values */
function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}


/** Return a URL relative to req.originalUrl.  Returned URL path
 *  determined by path (which is absolute if starting with /). For
 *  example, specifying path as ../search.html will return a URL which
 *  is a sibling of the current document.  Object queryParams are
 *  encoded into the result's query-string and hash is set up as a
 *  fragment identifier for the result.
 */
function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

/************************** Template Utilities *************************/


/** Return result of mixing view-model view into template templateId
 *  in app templates.
 */
function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

/** Add contents all dir/*.ms files to app templates with each 
 *  template being keyed by the basename (sans extensions) of
 *  its file basename.
 */
function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

