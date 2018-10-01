const assert = require('assert');
const mongo = require('mongodb').MongoClient;

const {inspect} = require('util'); //for debugging

'use strict';

/** This class is expected to persist its state.  Hence when the
 *  class is created with a specific database url, it is expected
 *  to retain the state it had when it was last used with that URL.
 */ 
class DocFinder {

  	/** Constructor for instance of DocFinder. The dbUrl is
   	*  expected to be of the form mongodb://SERVER:PORT/DB
   	*  where SERVER/PORT specifies the server and port on
   	*  which the mongo database server is running and DB is
   	*  name of the database within that database server which
   	*  hosts the persistent content provided by this class.
   	*/
  	constructor(dbUrl) 
	{
		this.dbURL = dbUrl
		this.client = null
        	this.db = null
		this.content = []
		this.noise_words = new Map()

		/*
		DATABASE NAMES
		1. content
		2. noisewords
		*/	
		this.contentTB = "content"
		this.noisewordsTB = "noisewords"	
  	}

  	/** This routine is used for all asynchronous initialization
   	*  for instance of DocFinder.  It must be called by a client
   	*  immediately after creating a new instance of this.
   	*/
  	async init() 
	{

		// open a connection to MongoDB 
		// keep the connection open, close it at the end as every connection request impacts performance
		this.client = await mongo.connect(this.dbURL);
    		this.db = this.client.db(this.dbName); 
  	}

  	/** Release all resources held by this doc-finder.  Specifically,
   	*  close any database connections.
  	*/
  	async close() 
	{

		//this.createCollection("content")
                //var myobj = { _id : name , content : "asdasd" };
                //this.insertDocument(myobj,"content", false)

		this.client.close();
  	}

  	/** Clear database */
  	async clear() 
	{
    		//TODO
  	}

  	/** Return an array of non-noise normalized words from string
   	*  contentText.  Non-noise means it is not a word in the noiseWords
   	*  which have been added to this object.  Normalized means that
   	*  words are lower-cased, have been stemmed and all non-alphabetic
   	*  characters matching regex [^a-z] have been removed.
	*	Time Complexity : O(n)  // n = length of content
   	*/
  	async words(contentText) 
	{
		var streamlined_words = []

	        // split string based on all whitespaces
	        content = contentText.split(/\s+/g)
		
		// O(n)	
	        for ( var word of content)
	        {
	                word = this.normalizeword(word)

	                // check if word empty or is a noise word
	                if ( word != "" && !(this.noise_words.has(word)) )
	                {
	                        streamlined_words.push(word)
	                }
	        }

		return streamlined_words;
  	}

  	/** Add all normalized words in the noiseText string to this as
   	*  noise words.  This operation should be idempotent.
	*	Time Complexity : O(n)  // n = length of noiseWords
	*/
  	async addNoiseWords(noiseText) 
	{
		noiseText = "this"
		var noise_words_mongo = []
		var noisearray = noiseText.split("\n")
	        for (const word of noisearray)
        	{
			// to make sure that we do not insert duplicates
			if ( word != "" && !(this.noise_words.has(word)) )
			{
				this.noise_words.set(word,true)
                		noise_words_mongo.push( { _id : word , content : true } )	
			}
        	}

		// create collection
		this.createCollection(this.noisewordsTB)

		if ( noise_words_mongo == 1 )
		{
			// insert one
			this.insertDocument(noise_words_mongo, this.noisewordsTB , false)
		}
		else
		{
			// insert many
			this.insertDocument(noise_words_mongo, this.noisewordsTB , true)
		}

  	}

  	/** Add document named by string name with specified content string
   	*  contentText to this instance. Update index in this with all
   	*  non-noise normalized words in contentText string.
   	*  This operation should be idempotent.
   	*/ 
  	async addContent(name, contentText) 
	{
		
		// append document name, and the contentText to content, 
		// later this will be inserted in DB
		this.content.push({ _id : name , content : contentText })
	
	}

  	/** Return contents of document name.  If not found, throw an Error
  	*  object with property code set to 'NOT_FOUND' and property
   	*  message set to `doc ${name} not found`.
   	*/
  	async docContent(name) 
	{
    		//TODO
    		return '';
  	}
  
  	/** Given a list of normalized, non-noise words search terms, 
   	*  return a list of Result's  which specify the matching documents.  
   	*  Each Result object contains the following properties:
   	*
   	*     name:  the name of the document.
   	*     score: the total number of occurrences of the search terms in the
   	*            document.
   	*     lines: A string consisting the lines containing the earliest
   	*            occurrence of the search terms within the document.  The 
   	*            lines must have the same relative order as in the source
   	*            document.  Note that if a line contains multiple search 
   	*            terms, then it will occur only once in lines.
   	*
   	*  The returned Result list must be sorted in non-ascending order
   	*  by score.  Results which have the same score are sorted by the
   	*  document name in lexicographical ascending order.
   	*
   	*/
  	async find(terms) 
	{
    		//TODO
    		return [];
  	}

  	/** Given a text string, return a ordered list of all completions of
  	*  the last normalized word in text.  Returns [] if the last char
   	*  in text is not alphabetic.
   	*/
  	async complete(text) 
	{
    		//TODO
    		return [];
  	}

  	//Add private methods as necessary

	// APPLICATION SPECIFIC FUNCTIONS	
	
	/**
 	*     Time Complexity : O(1)
 	*/
  	async normalizeword( word ) 
	{

        	// convert word to lower case
        	word = word.toLowerCase()

        	// delete any 's suffix.
        	if ( word.endsWith("\'s") )
        	{
        	        word = word.substring(0, word.length - 2);
        	}

        	// remove non alphanumeric characters
        	word = word.replace(/\W/g, '')
        	return word;
  	}



	// MONGO DB Functions 

	/**
	*create a collection, if not exists in database
	*/
	createCollection(name)
	{
	        this.db.createCollection( name, function(err, res)
	        {
	                if (err) throw err;
	        });
	}

	/**
	* Inserts a record into collection
	*/
	insertDocument(record, collectionName, insertMultiple)
	{

		if ( insertMultiple == true )
		{
			this.db.collection(collectionName).insertMany(record, function(err, res)
                        {
                                if (err) throw err;
                                console.log("1 document inserted");
                        });
		}
		else
		{
                	this.db.collection(collectionName).insertOne(record, function(err, res)
                	{
                	        if (err) throw err;
                	        console.log("1 document inserted");
                	});
		}
	}
} //class DocFinder

module.exports = DocFinder;

//Add module global functions, constants classes as necessary
//(inaccessible to the rest of the program).

//Used to prevent warning messages from mongodb.
const MONGO_OPTIONS = {
  useNewUrlParser: true
};

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple utility class which packages together the result for a
 *  document search as documented above in DocFinder.find().
 */ 
class Result {
  constructor(name, score, lines) {
    this.name = name; this.score = score; this.lines = lines;
  }

  toString() { return `${this.name}: ${this.score}\n${this.lines}`; }
}

/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
  return (result2.score - result1.score) ||
    result1.name.localeCompare(result2.name);
}

/** Normalize word by stem'ing it, removing all non-alphabetic
 *  characters and converting to lowercase.
 */
function normalize(word) {
  return stem(word.toLowerCase()).replace(/[^a-z]/g, '');
}

/** Place-holder for stemming a word before normalization; this
 *  implementation merely removes 's suffixes.
 */
function stem(word) {
  return word.replace(/\'s$/, '');
}



