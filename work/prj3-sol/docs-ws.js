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

  	app.get(`${DOCS}/:name`, getContent(app));
	app.get(`${DOCS}/`,searchContent(app))
	app.post(`${DOCS}/`, addContent(app));
	app.get(`${COMPLETIONS}/`, getCompletions(app))
		

  	app.use(doErrors()); //must be last; setup for server errors   
}

//@TODO: add handler creation functions called by route setup
//routine for each individual web service.  Note that each
//returned handler should be wrapped using errorWrap() to
//ensure that any internal errors are handled reasonably.

function getContent(app) {
        return errorWrap(async function(req, res) {
		try {	
			if ( ! ( 'name' in req.params ) ) {
                                throw {
                                        isDomain: true,
                                        errorCode: 'BAD_PARAM',
                                        message: `Missing name parameter \"name\"`,
                                };
                        }


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
				res.statusCode = OK
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
			
			let orignalcount = 5	
			const searchstring = req.query.q

                        let mainresults = await app.locals.finder.find(searchstring);		
			let results = mainresults;
			if ( 'start' in req.query ) {

				if ( Number(req.query.start) != NaN && req.query.start > 0 && req.query.start < results.length ) {
					start = Number(req.query.start)
				}
				else {
					throw {
                	                        isDomain: true,
                	                        errorCode: 'BAD_PARAM',
                	                        message: `bad query parameter \"start\"`,
        	                        };
	
				}
				
				if ( 'count' in req.query ) {

					if ( Number(req.query.count) != NaN && req.query.count > 0 ) {
						count = Number(req.query.count)
						orignalcount = count
					}
					else {
						throw {
                	                                isDomain: true,
	                                                errorCode: 'BAD_PARAM',
        	                                        message: `bad query parameter \"count\"`,
                        	                };

					}
				}
			}

			if ( start + count > results.length ) {
				count = results.length - start
			}		

			results = results.slice(start, start + count)
				
			for ( let eachobj in  results ) {
				// TODO : Change URL
				results[eachobj].href =  encodeURI(_currentUrl(req) + results[eachobj].name)
			}

			let selfv = { rel : "self", href : encodeURI(_currentUrl(req) + "&start=" + start + "&count=" + orignalcount) }

			let reltext = ""; 
			if ( start + count >= mainresults.length ) {
				// previous
				reltext = "previous"
				count = 5

				if ( start >= mainresults.length ) {
					start = mainresults.length - 5
				}
				else {
					start = start - 5
				}	
			}
			else {
				// next
				reltext = "next"
				start = start + count
				count = 5
			}

			if ( start < 0 ) {
				start = 0
			}

			let nextv = { rel : reltext , href : encodeURI(_currentUrl(req) + "&start=" + start + "&count=" + count ) }
			let newresults = {}
			newresults.results = results
			newresults.totalCount = mainresults.length

			if ( mainresults.length > 0 ) {
				newresults.links = [ selfv , nextv ]
			}
			else {
				newresults.links = [ selfv ]
			}

			res.statusCode = OK
                     	res.json(newresults);
                }
                catch(err) {
                        throw err;
                        doErrors(app)
                }
        });
}


function addContent(app) {
  	return errorWrap(async function(req, res) {
    		try {
      			const obj = req.body;
			if ( ! ( 'name' in obj ) ) {
				throw {
                            		isDomain: true,
                                    	errorCode: 'BAD_PARAM',
                                	message: `Missing query parameter \"name\"`,
                               	};
			}

			if ( ! ( 'content' in obj ) ) {
                                throw {
                                        isDomain: true,
                                        errorCode: 'BAD_PARAM',
                                        message: `Missing query parameter \"content\"`,
                                };
                        }

      			const results = await app.locals.finder.addContent(obj.name, obj.content);
      			//res.append('Location', _currentUrl(req) + '/' );
			const link = { href : _currentUrl(req) }
			

			res.statusCode = CREATED
			res.json(link)
    		}
    		catch(err) {
			throw err
			doErrors(app)
    		}
  	});
}

function getCompletions(app) {
        return errorWrap(async function(req, res) {
                try {

			if ( ! ( 'text' in req.params ) )
			{
				throw {
                                        isDomain: true,
                                        errorCode: 'BAD_PARAM',
                                        message: `Missing query parameter \"text\"`,
                                };
			} 
			
                        const text = req.query.text;
			const results = await app.locals.finder.complete(text)
	
			res.statusCode = OK
                       	res.json(results);
                }
                catch(err) {
                        throw err;
                        doErrors(app)
                }
        });
}


function _currentUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
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
