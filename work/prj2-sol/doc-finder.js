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

		this.content_mongo = []
		this.content = new Map()

		this.local_memory = new Map()

		this.noise_words = new Map()

		/*
		* DATABASE NAMES
		*/	
		this.contentTB = "content"
		this.noisewordsTB = "noisewords"
		this.memoryindexTB = "memoryindex"
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

		// load all noisewords into memory
		var allnoisewords = await this.db.collection(this.noisewordsTB).find({}).toArray()
                for ( var word of allnoisewords )
                {
                        this.noise_words.set(word._id, true)
                }
 
  	}

  	/** Release all resources held by this doc-finder.  Specifically,
   	*  close any database connections.
  	*/
  	async close() 
	{
		// first insert all content without indexing
		if ( this.content_mongo.length > 1 )
		{
			this.createCollection(this.contentTB)
			this.insertDocument(this.content_mongo, this.contentTB , true)
		}
		else if ( this.content_mongo.length === 1 )
		{
			this.createCollection(this.contentTB)
			this.insertDocument(this.content_mongo, this.contentTB , false)
		}

		// insert content with indexing
		if ( this.content_mongo.length > 0 )
		{
			var insertMongo = []

			// O(n) , total no of distinct words present over all docuemnts
			for ( var eachword of this.local_memory.keys() )	
			{
				insertMongo.push({ _id : eachword , content : this.local_memory.get(eachword) })
				
			}

			// create collection and enter the data into persistent storage
			this.createCollection(this.memoryindexTB)
	                this.insertDocument(insertMongo,this.memoryindexTB, true)
		}

		await this.client.close();
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
	        var content = contentText.split(/\s+/g)
		
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

		// insert all noise words at onece for optimization
		if ( noise_words_mongo.length == 1 )
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
		if ( ! this.content.has(name) )
		{
			//this.content_mongo.push({ _id : name , content : contentText })
			//this.content.set(name,contentText)
		}

		// for optimization, content will be inserted when the close method is called


        	var sentences = contentText.split("\n")

        	// O( n*m )
        	for ( var line_number = 0; line_number < sentences.length; line_number++ )
        	{
        	        // for loop O(n) -  length of content
	
	                var sentence = sentences[line_number]
	                sentence = sentence.split(/\s+/g)
	
        	        // O(m) - length of sentence
        	        for ( var word of sentence)
        	        {
        	                // O(1)
        	                word = await this.normalizeword(word)
	
                        	// O(1)         - Hashmap
                        	// check if word empty or is a noise word
               	         	if ( word != "" && !(this.noise_words.has(word)) )
                	        {
		                        // O(1)
                		        if ( this.local_memory.has(word) )
                        		{
                        		        if ( this.local_memory.get(word).has(name) )
                                		{
							this.local_memory.get(word).get(name)[0] = this.local_memory.get(word).get(name)[0] + 1
                                        		//this.local_memory.get(word).set(name, this.local_memory.get(word).get(name) + 1)
                                		}
                                		else
                                		{
                                        		this.local_memory.get(word).set(name, [ 1,  sentences[line_number] , line_number ] )
                                		}
                        		}
                        		else
                        		{
                                		// DS : hashmap of hashmaps
                                		this.local_memory.set(word, new Map())
                                		this.local_memory.get(word).set(name, [ 1,  sentences[line_number] , line_number ])
                        		}
                	        }
        	        }
	        }
	}

  	/** Return contents of document name.  If not found, throw an Error
  	*  object with property code set to 'NOT_FOUND' and property
   	*  message set to `doc ${name} not found`.
   	*/
  	async docContent(name) 
	{
		var returndata = await this.db.collection(this.contentTB).findOne({ _id: name } )
		
		if ( returndata != null )
		{
			return returndata.content;
		}
		else
		{
			// TODO: Add code for error handling
			return ' ';
		}
		return ' ';
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
		var all_terms = []
		
		for ( var searchword of terms)
		{
			all_terms.push(await searchword )
		}

		var local = await this.db.collection(this.memoryindexTB).find({ _id: { $in: all_terms } } ).toArray()
	
		var resultantmap = new Map()
	        var sentencerecorder = new Map()

		for ( var match of local )
		{
			for ( var filename in match.content )
			{
				// O(1)
                                if ( resultantmap.has(filename) )
                                {
                                        resultantmap.set(filename, resultantmap.get(filename) + match.content[filename][0] )
                                }
                                else
                                {
                                        resultantmap.set(filename, match.content[filename][0] )
                                }

				// O(1)
                                // now record in sentencerecorder
                                if ( ! (sentencerecorder.has(filename) ) )
                                {
                                        var linenumber = match.content[filename][2]
                                        var sentence = match.content[filename][1]
                                        sentencerecorder.set(filename,[linenumber , sentence])
                                }
                                else
                                {
                                        // O(1)
                                        if ( filename in match.content && match.content[filename][2] != sentencerecorder.get(filename)[0] )
                                        {
                                                var linenumber = match.content[filename][2]
                                                var sentence = match.content[filename][1]

                                                if ( linenumber < sentencerecorder.get(filename)[0] )
                                                {
                                                        sentencerecorder.set(filename, [ linenumber , sentence + "\n" + sentencerecorder.get(filename)[1] ])
                                                }
                                                else
                                                {
                                                        sentencerecorder.set(filename, [ linenumber , sentencerecorder.get(filename)[1] + "\n" + sentence ])
                                                }
                                        }
                                }

			}
		}

	        // sort based on no of occurances
	        // O( n*m log n*m )     - default time complexity of sort function in JS
	        var sortedfiles = Array.from(new Map ( Array.from(resultantmap).sort((a, b) => { return b[1] - a[1] }) ).keys())


	        // Total : O(n^2 * m^2)
	        // O(n*m) : length of sortedfiles
	        for ( var i = 0 ; i < sortedfiles.length; i++ )
        	{
	                // O(n*m - 1) : length of sortedfiles
                	for ( var j = i; j < sortedfiles.length; j ++ )
                	{
                	        if ( resultantmap.get(sortedfiles[i]) == resultantmap.get(sortedfiles[j]) )
                	        {
                	                // The further along the alphabet, the higher the value. "b" > "a";
                	                if ( sortedfiles[i] > sortedfiles[j] )
                	                {
                	                        var temp = sortedfiles[i]
                	                        sortedfiles[i] = sortedfiles[j]
                	                        sortedfiles[j] = temp
                	                }
                	        }
                	        else
                	        {
                	                break;
                	        }
                	}
        	}	


		var result = [];
        	for ( var filename of sortedfiles )
        	{
        	        result.push(filename + ": " + resultantmap.get(filename) + "\n" + sentencerecorder.get(filename)[1] + "\n" )
        	}
        	return result;
	
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
	        	        if (err)
                                {
                                        console.log(new Error(err.code + ' : ' + err.errmsg));
                                }
	        	});
			
			// TODO : Empty the collection here	
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
				if (err) 
                                {
                                        console.log(new Error(err.code + ' : ' + err.errmsg));
                                }
                        });
		}
		else
		{
                	this.db.collection(collectionName).insertOne(record, function(err, res)
                	{
                	        if (err) 
				{
					console.log(new Error(err.code + ' : ' + err.errmsg));
				}
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



