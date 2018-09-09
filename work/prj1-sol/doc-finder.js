const {inspect} = require('util'); //for debugging

'use strict';

class DocFinder {

  /** Constructor for instance of DocFinder. */
  constructor() {

	// Using Hashmap to reduce complexity
	this.local_memory = {}		// Stores all words , and document associated with it
	this.noise_words = {}		// Stores all noise words
	this.sentence_word_map = {}	// Store sentences of first occuring word in a document
  }


  /**
  *	Time Complexity : O(1)
  */
  normalizeword( word ) {

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

  /** Return array of non-noise normalized words from string content.
   *  Non-noise means it is not a word in the noiseWords which have
   *  been added to this object.  Normalized means that words are
   *  lower-cased, have been stemmed and all non-alphabetic characters
   *  matching regex [^a-z] have been removed.
   	
	Time Complexity : O(n)	// n = length of content
   */
   
  words(content) {
    
	var streamlined_words = []

        // split string based on all whitespaces
        content = content.split(/\s+/g)

        for ( var word of content)
        {
                word = this.normalizeword(word)

                // check if word empty or is a noise word
                if ( word != "" && !(word in this.noise_words) )
                {
			streamlined_words.push(word)
		}
	}

	return streamlined_words;
  }

  /** Add all normalized words in noiseWords string to this as
   *  noise words. 

	Time Complexity : O(n)	// n = length of noiseWords
   */
  addNoiseWords(noiseWords) {

	var noisearray = noiseWords.split("\n")
	for (const word of noisearray) 
	{    			 
		this.noise_words[word] = true
	}
  }

  /** Add document named by string name with specified content to this
   *  instance. Update index in this with all non-noise normalized
   *  words in content string.

	Time complexity - O(m*n)	// n - length of content, m - max no of words in a sentence
   */ 
  addContent(name, content) {
	// name = documentname
	// content = content in file
	

	var normalized = []

	var sentences = content.split("\n")

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
		        word = this.normalizeword(word)
			
			// O(1)		- Hashmap
                	// check if word empty or is a noise word
                	if ( word != "" && !(word in this.noise_words) )
                	{
                	        normalized.push(word)
                	}
		
			// O(1)
			// Add the sentence along with document name and line number for first occuring word in document	
			if ( ! ( word in this.sentence_word_map ) )
			{
				this.sentence_word_map[word] = {}
				this.sentence_word_map[word][name] = [ sentences[line_number] , line_number ]
			}
			else
			{
				if ( ! ( name in this.sentence_word_map[word] ) )
				{
					this.sentence_word_map[word][name] = [ sentences[line_number] , line_number ]
				}
			}
			
        	}
	}

	// O(m * n) - ( m*n ) - size of normailized wors, Worst case , all sentence word were unique 
	// Push all normalized words to localmemory , and keep track of count
	for ( var word of normalized )
        {
		// O(1)
		if ( word in this.local_memory )
		{
			if ( name in this.local_memory[word] )
			{
				this.local_memory[word][name] = this.local_memory[word][name] + 1
			}
			else
			{
				this.local_memory[word][name] = 1
			}
		}
		else
		{
			// DS : hashmap of hashmaps
			this.local_memory[word] = {}

			this.local_memory[word][name] = 1
		}
        }
  }

  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  Note
   *            that if a line contains multiple search terms, then it will
   *            occur only once in lines.
   *  The Result's list must be sorted in non-ascending order by score.
   *  Results which have the same score are sorted by the document name
   *  in lexicographical ascending order.
   *
   *	Time complexity : O(n^2 * m^2)
   *
   */
  find(terms) {

	var result = []
	var all_terms = terms
	var resultantmap = {} ;
	var sentencerecorder = {}	

	
	if ( all_terms.length == 0 )
	{
		// No search terms passed , just return empty
		return [];
	}	

	// Total : O(n*m)

	// O(n) - n : Number of terms
	for ( var searchword of all_terms)
	{
		// O(1)
		if ( searchword in this.local_memory )
	        {
			// Worst case, all files have the searchword
			// O(m) - m : no of files
			for ( var filename in this.local_memory[searchword] )
			{
				// O(1)
				if ( filename in resultantmap )
				{
					resultantmap[filename] = resultantmap[filename] + this.local_memory[searchword][filename]
				}
				else
				{
					resultantmap[filename] = this.local_memory[searchword][filename]
				}

				// O(1)
				// now record in sentencerecorder
				if ( ! (filename in sentencerecorder ) )
				{
					var linenumber = this.sentence_word_map[searchword][filename][1]
					var sentence = this.sentence_word_map[searchword][filename][0]
					sentencerecorder[filename] = [ linenumber , sentence]
				}
				else
				{
					// O(1)
					if ( this.sentence_word_map[searchword][filename][1] != sentencerecorder[filename][0] )
					{
						var linenumber = this.sentence_word_map[searchword][filename][1]
						var sentence = this.sentence_word_map[searchword][filename][0]

						if ( linenumber < sentencerecorder[filename][0] )
						{
							sentencerecorder[filename] = [ linenumber , sentence + "\n" + sentencerecorder[filename][1] ]
						}
						else
						{
                                                        sentencerecorder[filename] = [ linenumber , sentencerecorder[filename][1] + "\n" + sentence ]
                                                }
					} 
				}
			}
        	}
		

	}

	// sort based on no of occurances
	// O( n*m log n*m )	- default time complexity of sort function in JS 
	var sortedfiles = Object.keys(resultantmap).sort(function(a,b){return resultantmap[b]-resultantmap[a]})

	// Total : O(n^2 * m^2)
	
	// O(n*m) : length of sortedfiles
	for ( var i = 0 ; i < sortedfiles.length; i++ )
	{
		// O(n*m - 1) : length of sortedfiles
		for ( var j = i; j < sortedfiles.length; j ++ )	
		{
			if ( resultantmap[sortedfiles[i]] == resultantmap[sortedfiles[j]] )
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


	for ( var filename of sortedfiles )
	{
		result.push( {name: filename, score : resultantmap[filename], lines : sentencerecorder[filename][1] + "\n" } )
	}

	return result;	
  }

  /** Given a text string, return a ordered list of all completions of
   *  the last word in text.  Returns [] if the last char in text is
   *  not alphabetic.
   *
   *	Time complexity : n - Total no of words stored in local_memory
   */
  complete(text) {
   
	if ( text == "" )
    	{
		return [];
	}

	var result = []

	for ( var eachword in this.local_memory )
	{
		if ( eachword.startsWith(text) )
		{
			result.push(eachword)
		}
	}
	
    	return result;
  }

  
} //class DocFinder

module.exports = DocFinder;

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple class which packages together the result for a 
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

