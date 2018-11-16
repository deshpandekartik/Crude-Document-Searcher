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

	app.get(`${base}/add.html`, addDocument(app));
	app.post(`${base}/add.html`, upload.single('file'), addDocument(app));
	app.get(`${base}/:id`, showDocument(app));
}

/*************************** Action Routines ***************************/

//@TODO add action routines for routes + any auxiliary functions.

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
		        let filename = String(req.file.originalname)
		        let filecontent = String(req.file.buffer)
		
			console.log(filename)
			console.log(filecontent)
			res.redirect(app.locals.base + '/' + filename);
		}
	}
  };
};


function showDocument(app) {
  	return async function(req, res) {

  		res.sendStatus(200);
  	};
};



/************************ General Utilities ****************************/

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

