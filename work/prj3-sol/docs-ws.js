'use strict';

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const url = require('url');
const queryString = require('querystring');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;


//Main URLs
const DOCS = '/docs';
const COMPLETIONS = '/completions';

//Default value for count parameter
const COUNT = 5;

/** Listen on port for incoming requests.  Use docFinder instance
 *  of DocFinder to access document collection methods.
 */
function serve(port, docFinder) {
  const app = express();
  app.locals.port = port;
  app.locals.finder = docFinder;
  setupRoutes(app);
  const server = app.listen(port, async function() {
    console.log(`PID ${process.pid} listening on port ${port}`);
  });
  return server;
}

module.exports = { serve };

function setupRoutes(app) {
  	app.use(cors());            //for security workaround in future projects
  	app.use(bodyParser.json()); //all incoming bodies are JSON

  	//@TODO: add routes for required 4 services

  	// returns the content of document
  	app.get(`${DOCS}/:name`, getContent(app));
	app.get(`${DOCS}/`,searchContent(app))

  	app.use(doErrors()); //must be last; setup for server errors   
}

//@TODO: add handler creation functions called by route setup
//routine for each individual web service.  Note that each
//returned handler should be wrapped using errorWrap() to
//ensure that any internal errors are handled reasonably.

function getContent(app) {
        return errorWrap(async function(req, res) {
                try {

                        const name = req.params.name;
                        const results = await app.locals.finder.docContent(name);

                        if (results.length === 0) {
                                throw {
                                        isDomain: true,
                                        errorCode: 'NOT_FOUND',
                                        message: `document ${name} not found`,
                                };
                        }
                        else {
                                res.json(results);
                        }
                }
                catch(err) {
   			throw err;
	       		doErrors(app)
                }
        });
}

function searchContent(app) {
        return errorWrap(async function(req, res) {
                try {	
			let start = 0;
			let count = 5;
		
			const searchstring = req.query.q
                        let results = await app.locals.finder.find(searchstring);		

			if ( 'start' in req.query ) {

				if ( Number(req.query.start) != NaN && req.query.start > 0 && req.query.start < results.length ) {
					start = Number(req.query.start)
				}
				else {
					// TODO : send error
				}
				
				if ( 'count' in req.query ) {

					if ( Number(req.query.count) != NaN && req.query.count > 0 ) {

						if ( req.query.count + start > results.length ) {
							// TODO : reset count		
						}
						else {
							count = Number(req.query.count)
						}
					}
					else {
						// TODO: send error
					}
				}
			}

			if ( start + count > results.length ) {
				count = results.length - start
			}		

                        if (results.length === 0) {
                                throw {
                                        isDomain: true,
                                        errorCode: 'NOT_FOUND',
                                        message: `${searchstring} not found in any dcouments`,
                                };
                        }
                        else {
				results = results.slice(start, start + count)
				
				for ( let eachobj in  results ) {
					results[eachobj].href =  "http://" + req.get('host') + "/docs/" + results[eachobj].name
				}
				//res.append({ totalCount : results.length } )

				let selfv = { rel : "self" , href : encodeURI("http://" + req.get('host') + "/docs/" + "?q=" + searchstring + "&start=" + start + "&count=" + count) }
				start = start + count
				count = 5
				let nextv = { rel : "self" , href : encodeURI("http://" + req.get('host') + "/docs/" + "?q=" + searchstring + "&start=" + start + "&count=" + count ) }
				let newresults = {}
				newresults.results = results
				newresults.links = [ selfv , nextv ]

                                res.json(newresults);
                        }
                }
                catch(err) {
                        throw err;
                        doErrors(app)
                }
        });
}



/** Return error handler which ensures a server error results in nice
 *  JSON sent back to client with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}

/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}
  

/** Return base URL of req for path.
 *  Useful for building links; Example call: baseUrl(req, DOCS)
 */
function baseUrl(req, path='/') {
  const port = req.app.locals.port;
  const url = `${req.protocol}://${req.hostname}:${port}${path}`;
  return url;
}
