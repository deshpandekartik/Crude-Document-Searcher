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
  	constructor(dbUrl) {
		this.dbURL = dbUrl
		this.client = null
        	this.db = null

		this.Mongo_Collections = []

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
  	async init() {

		// open a connection to MongoDB 
		// keep the connection open, close it at the end as every connection request impacts performance
		this.client = await mongo.connect(this.dbURL, { useNewUrlParser: true });
    		this.db = await this.client.db(this.dbName);

		// load all collection names in local memory
                var collectionArray = await this.db.listCollections().toArray()
                for ( var eachCollection of collectionArray )
                {
                        this.Mongo_Collections.push(eachCollection.name)
                }
	

		// load all noisewords into memory
		if (this.Mongo_Collections.includes(this.noisewordsTB) )  {
			// load all noisewords into memory
	                var allnoisewords = await this.db.collection(this.noisewordsTB).find({}).toArray()
      			for ( var word of allnoisewords ) {
                        	// Hash map, reduces time complexity O(1)
                        	this.noise_words.set(word._id, true)
                	}
		}
		else
		{
			// Noise words collection not present, create collection
                	await this.createCollection(this.noisewordsTB)	
		}
  

                if ( ! this.Mongo_Collections.includes(this.contentTB))  {
                        // ContentTB collection not present, create collection
                        await this.createCollection(this.contentTB)
                }

                if ( ! this.Mongo_Collections.includes(this.memoryindexTB) )  {
                        // Memory indexes create collection
                        await this.createCollection(this.memoryindexTB)
                }


	}

  	/** Release all resources held by this doc-finder.  Specifically,
   	*  close any database connections.
  	*/
  	async close() {

		await this.client.close();
  	}

  	/** Clear database */
  	async clear() {
		await this.emptyCollection(this.contentTB)
		await this.emptyCollection(this.noisewordsTB)
		await this.emptyCollection(this.memoryindexTB)
  	}

  	/** Return an array of non-noise normalized words from string
   	*  contentText.  Non-noise means it is not a word in the noiseWords
   	*  which have been added to this object.  Normalized means that
   	*  words are lower-cased, have been stemmed and all non-alphabetic
   	*  characters matching regex [^a-z] have been removed.
	*	Time Complexity : O(n)  // n = length of content
   	*/
  	async words(contentText) {
		var streamlined_words = []

	        // split string based on all whitespaces
	        var content = contentText.split(/\s+/g)
		
		// O(n)	
	        for ( var word of content) {
	                word = this.normalizeword(word)

	                // check if word empty or is a noise word
	                if ( word != "" && !(this.noise_words.has(word)) ) {
	                        streamlined_words.push(word)
	                }
	        }

		return streamlined_words;
  	}

  	/** Add all normalized words in the noiseText string to this as
   	*  noise words.  This operation should be idempotent.
	*	Time Complexity : O(n)  // n = length of noiseWords
	*/
  	async addNoiseWords(noiseText) {
		var noise_words_mongo = []
		var noisearray = noiseText.split("\n")
	        for (const word of noisearray){
			// to make sure that we do not insert duplicates
			if ( word != "" && !(this.noise_words.has(word)) ) {
				this.noise_words.set(word,true)
                		noise_words_mongo.push( { _id : word , content : true } )	
			}
        	}

		// insert all noise words at onece for optimization
		if ( noise_words_mongo.length > 0 ) {
			// insert many
			await this.insertDocument(noise_words_mongo, this.noisewordsTB , true)
		}

  	}

  	/** Add document named by string name with specified content string
   	*  contentText to this instance. Update index in this with all
   	*  non-noise normalized words in contentText string.
   	*  This operation should be idempotent.
   	*/ 
  	async addContent(name, contentText) {

                // append document name, and the contentText to content,
                // later this will be inserted in DB
                if ( ! this.content.has(name) ) {

			this.updateDocument({ _id : name , content : contentText }, this.contentTB)
                        this.content.set(name,contentText)
                }
                else
                {
                        return;
                }



        	var sentences = contentText.split("\n")

        	// O( n*m )
        	for ( var line_number = 0; line_number < sentences.length; line_number++ ) {
        	        // for loop O(n) -  length of content
	
	                var sentence = sentences[line_number]
	                sentence = sentence.split(/\s+/g)
	
        	        // O(m) - length of sentence
        	        for ( var word of sentence) {
        	                // O(1)
        	                word = await this.normalizeword(word)
	
                        	// O(1)         - Hashmap
                        	// check if word empty or is a noise word
               	         	if ( word != "" && !(this.noise_words.has(word)) ) {
		                        // O(1)
                		        if ( this.local_memory.has(word) ){
                        		        if ( this.local_memory.get(word).has(name) ) {
							this.local_memory.get(word).get(name)[0] = this.local_memory.get(word).get(name)[0] + 1
                                		}
                                		else {
                                        		this.local_memory.get(word).set(name, [ 1, line_number ] )
                                		}
                        		}
                        		else {
                                		// DS : hashmap of hashmaps
                                		this.local_memory.set(word, new Map())
                                		this.local_memory.get(word).set(name, [ 1, line_number ])
                        		}
                	        }
        	        }
	        }


		/*
                var insertMongo = []
                for ( var eachword of this.local_memory.keys() ) {

                        insertMongo.push({
			        updateOne: {
            				filter: {"_id": eachword},
            				update: {"$set": { 
                					 "content": this.local_memory.get(eachword)
							}
            					 },
            					 upsert: true
        				}
    			})
                }
		
		// write all data to persistent storage using bulkwrite
                await this.db.collection(this.memoryindexTB).bulkWrite(insertMongo)

		*/
		
		// batch mode for insertion more efficient
		let batch = this.db.collection(this.memoryindexTB).initializeUnorderedBulkOp({useLegacyOps: true})
		for ( var eachword of this.local_memory.keys()) {

			//adding the update queries to the batch from the live copy and sending the state
			//to the word doc table for presistence
			await batch.find({ _id : eachword }).upsert().updateOne( {  $set : { "content" : this.local_memory.get(eachword) } } );
		}
		try{	
			//finally, executing the batch based on upsert option
			await batch.execute(function(err,result){});
		}catch(err)
		{
			//nothing to throw from here	
		}

	}

  	/** Return contents of document name.  If not found, throw an Error
  	*  object with property code set to 'NOT_FOUND' and property
   	*  message set to `doc ${name} not found`.
   	*/
  	async docContent(name) {
		var returndata = await this.db.collection(this.contentTB).findOne({ _id: name } )
		
		if ( returndata != null ) {
			return returndata.content;
		}
		else {
			var error = new Error(`doc ${name} not found`)
			error.code = 'NOT_FOUND'
			throw error;
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
  	async find(terms) {
		var all_terms = []
		
		for ( var searchword of terms) {
			var word = await searchword
			all_terms.push( word )
		}

		var local = await this.db.collection(this.memoryindexTB).find({ _id: { $in: all_terms } } ).toArray()

		
		var Rawcontent = new Map()
		// load all content into memory
                if (this.Mongo_Collections.includes(this.contentTB))  {
                        if ( this.content.size === 0 ) {
                                var allcontent = await this.db.collection(this.contentTB).find({}).toArray()
                                for ( var contentInstance of allcontent ) {
                                        // Hash map, reduces time complexity O(1)
                                        Rawcontent.set(contentInstance._id, contentInstance.content)
                                }
                        }
                }

		// No matches found
		if ( local.length == 0 ) {
			return [];
		}
	
		var resultantmap = new Map()
	        var sentencerecorder = new Map()

		for ( var match of local ) {
			for ( var filename in match.content ) {
					
				var data = match.content[filename]
				// data[0] = score
				// data[1] = line_number
				// resultant[2] = sentence
				// O(1)
                                if ( resultantmap.has(filename) ) {
					resultantmap.get(filename)[0] = resultantmap.get(filename)[0] + data[0]
					
					if ( data[1] < resultantmap.get(filename)[1] ) {
						resultantmap.get(filename)[1] = data[1]
						resultantmap.get(filename)[2] = Rawcontent.get(filename).split("\n")[data[1]] + "\n" + resultantmap.get(filename)[2]
					}
					else if ( data[1] > resultantmap.get(filename)[1] ) {
						resultantmap.get(filename)[1] = data[1]
                                                resultantmap.get(filename)[2] = resultantmap.get(filename)[2] + "\n" + Rawcontent.get(filename).split("\n")[data[1]]

					}
                                }
                                else {
                                        resultantmap.set(filename, [ data[0], data[1], Rawcontent.get(filename).split("\n")[data[1]] ] )
                                }
			}
		}

	        // sort based on no of occurances
	        // O( n*m log n*m )     - default time complexity of sort function in JS
	        var sortedfiles = Array.from(new Map ( Array.from(resultantmap).sort((a, b) => { return b[1][0] - a[1][0] }) ).keys())


	        // Total : O(n^2 * m^2)
	        // O(n*m) : length of sortedfiles
	        for ( var i = 0 ; i < sortedfiles.length; i++ ) {
	                // O(n*m - 1) : length of sortedfiles
                	for ( var j = i; j < sortedfiles.length; j ++ ) {
                	        if ( resultantmap.get(sortedfiles[i])[0] == resultantmap.get(sortedfiles[j])[0] ) {
                	                // The further along the alphabet, the higher the value. "b" > "a";
                	                if ( sortedfiles[i] > sortedfiles[j] ) {
                	                        var temp = sortedfiles[i]
                	                        sortedfiles[i] = sortedfiles[j]
                	                        sortedfiles[j] = temp
                	                }
                	        }
                	        else {
                	                break;
                	        }
                	}
        	}	


		var result = [];
        	for ( var filename of sortedfiles ) {
	    		result.push(filename + ": " + resultantmap.get(filename)[0] + "\n" + resultantmap.get(filename)[2]  + "\n" )
        	}
        	return result;
	
  	}

  	/** Given a text string, return a ordered list of all completions of
  	*  the last normalized word in text.  Returns [] if the last char
   	*  in text is not alphabetic.
   	*/
  	async complete(text) {
		text = text.split(' ').pop()

		if (!text.match(/[a-zA-Z]$/)) return [];

		var result = []
                var local = await this.db.collection(this.memoryindexTB).find({ _id: new RegExp('^' + text ) } ).toArray()

		var sorted = local.sort(function (a, b) {return b.content.length - a.content.length})
                for ( var match of local ) {
			result.push(match._id)
		}
		result = result.sort(function(a,b){return a.localeCompare(b); });
	
    		return result;
  	}

  	//Add private methods as necessary

	// APPLICATION SPECIFIC FUNCTIONS	
	
	/**
 	*     Time Complexity : O(1)
 	*/
  	async normalizeword( word ) {

        	// convert word to lower case
        	word = word.toLowerCase()

        	// delete any 's suffix.
        	if ( word.endsWith("\'s") ) {
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
	async createCollection(name) {
	       	this.db.createCollection( name )
	}

	/**
	* Inserts a record into collection
	*/
	async insertDocument(record, collectionName, insertMultiple) {

		if ( insertMultiple == true ) {
			this.db.collection(collectionName).insertMany(record)
		}
		else {
                	this.db.collection(collectionName).insertOne(record)
		}
	}
	
	async updateDocument(record, collectionName )
	{
		this.db.collection(collectionName).updateOne( { "_id" : record._id }, { $set: { "content" : record.content } }, { upsert : true }); 

	}

	/**
	* Wrapper to empty a collection
	*/
	async emptyCollection( collectionName ) {
		await this.db.collection(collectionName).deleteMany({})
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



