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

                        const name = req.params.name;
                        const output = await app.locals.finder.docContent(name);
			
			const results = { content : output , links : [ { rel : "self", href : _currentUrl(req,true) } ] }

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
			let reterror = _maperrors(err)
			res.status(reterror.httpCode).json({ code : reterror.jsonCode , message : reterror.jsonMSG});
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

				if ( Number(req.query.start) != NaN && req.query.start >= 0 ) {
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
				results[eachobj].href =  encodeURI(_currentUrl(req,false) + "/docs/" + results[eachobj].name)
			}

			let selfv = { rel : "self", href : encodeURI(_currentUrl(req,false) + "/docs?q=" + searchstring + "&start=" + start + "&count=" + orignalcount) }
			let prevv = null
			let nextv = null

			if ( start > 0 )
			{
				// previous 
				let start_temp = start

				if ( (start_temp - orignalcount) < 0 )
				{
					start_temp = 0
				}
				else
				{
					start_temp = Math.abs(start_temp - orignalcount)
				}


				prevv = { rel : "previous", href : encodeURI(_currentUrl(req,false) + "/docs?q=" + searchstring + "&start=" + start_temp + "&count=" + orignalcount) }
			}


			// next
			if ( ( start + orignalcount ) < mainresults.length )
			{
				// previous
                                let start_temp = start
				start_temp = start + orignalcount

                                nextv = { rel : "next", href : encodeURI(_currentUrl(req,false) + "/docs?q=" + searchstring + "&start=" + start_temp + "&count=" + orignalcount) }
		
			}


			if ( start < 0 ) {
				start = 0
			}

			let newresults = {}
			newresults.results = results
			newresults.totalCount = mainresults.length
			newresults.links = [selfv]

			if ( nextv != null ) {			
				newresults.links.push(nextv)
			}
			
			if ( prevv != null ) {
				newresults.links.push(prevv)
			}

			res.statusCode = OK
                     	res.json(newresults);
                }
                catch(err) {
			let reterror = _maperrors(err)
                        res.status(reterror.httpCode).json({ code : reterror.jsonCode , message : reterror.jsonMSG});
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
			let reterror = _maperrors(err)
                        res.status(reterror.httpCode).json({ code : reterror.jsonCode , message : reterror.jsonMSG});
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
			let reterror = _maperrors(err)
                        res.status(reterror.httpCode).json({ code : reterror.jsonCode , message : reterror.jsonMSG});
                }
        });
}


function _currentUrl(req,fullurlstatus) {
	const port = req.app.locals.port;
	if ( fullurlstatus == true ) {
  		return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
	}
	else {
		return `${req.protocol}://${req.hostname}:${port}`;
	}
}
	
var ERROR_STATUS_MAP = {
        OK : OK,
        NOT_FOUND : NOT_FOUND,
        BAD_PARAM : BAD_REQUEST,
        CREATED : CREATED,
        CONFLICT : CONFLICT
};

function _maperrors(err) {
	let obj = {}

	if ( 'isDomain' in err ) {
	       	if ( err.code in ERROR_STATUS_MAP ) {
       			obj.httpCode = ERROR_STATUS_MAP[err.code]
        	 	obj.jsonCode = err.code
        	  	obj.jsonMSG = err.message
     		}
  		else {
       			obj.httpCode = SERVER_ERROR
        	     	obj.jsonCode = err.code
        	   	obj.jsonMSG = err.message
    		}
	}
	else {
		if ( err.code == 'NOT_FOUND' ) {
			obj.httpCode = ERROR_STATUS_MAP[err.code]
                        obj.jsonCode = err.code
                        obj.jsonMSG = err.message
		}
		else {
			obj.httpCode = SERVER_ERROR
             		obj.jsonCode = err.code
           		obj.jsonMSG = err.message
		}
	}

	return obj;
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
