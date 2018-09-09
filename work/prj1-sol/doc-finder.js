const {inspect} = require('util'); //for debugging

'use strict';

class DocFinder {

  /** Constructor for instance of DocFinder. */
  constructor() {
    //@TODO

	// Using Hashmap to reduce complexity
	this.local_memory = {}
	this.noise_words = {}
	this.sentence_word_map = {}
  }


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
   */
  words(content) {
    
    //@TODO

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
   */
  addNoiseWords(noiseWords) {
    //@TODO
	var noisearray = noiseWords.split("\n")
	for (const word of noisearray) 
	{    			 
		this.noise_words[word] = true
	}
  }

  /** Add document named by string name with specified content to this
   *  instance. Update index in this with all non-noise normalized
   *  words in content string.
   */ 
  addContent(name, content) {
    //@TODO
	// name = documentname
	// content = content in file
	

	var normalized = []

	var sentences = content.split("\n")

	for ( var line_number = 0; line_number < sentences.length; line_number++ )
	{
		var sentence = sentences[line_number]
		sentence = sentence.split(/\s+/g)

		for ( var word of sentence)
	        {
        	        word = this.normalizeword(word)

                	// check if word empty or is a noise word
                	if ( word != "" && !(word in this.noise_words) )
                	{
                	        normalized.push(word)
                	}
		
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

	
	for ( var word of normalized)
        {
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
   */
  find(terms) {

    //@TODO


	var result = []
	var all_terms = terms
	var resultantmap = {} ;
	var sentencerecorder = {}	

	
	if ( all_terms.length == 0 )
	{
		// No search terms passed , just return empty
		return [];
	}	

	for ( var searchword of all_terms)
	{
		if ( searchword in this.local_memory )
	        {
			for ( var filename in this.local_memory[searchword] )
			{
				if ( filename in resultantmap )
				{
					resultantmap[filename] = resultantmap[filename] + this.local_memory[searchword][filename]
				}
				else
				{
					resultantmap[filename] = this.local_memory[searchword][filename]
				}

				// now record in sentencerecorder
				
				if ( ! (filename in sentencerecorder ) )
				{
					var linenumber = this.sentence_word_map[searchword][filename][1]
					sentencerecorder[filename] = [ searchword, linenumber ]
				}
				else
				{
					if ( this.sentence_word_map[searchword][filename][1] < sentencerecorder[filename][1] )
					{
						var linenumber = this.sentence_word_map[searchword][filename][1]
						sentencerecorder[filename] = [ searchword, linenumber ]
					} 
				}
			}
        	}
		

	}

	console.log(resultantmap)

	// sort based on no of occurances
	var sortedfiles = Object.keys(resultantmap).sort(function(a,b){return resultantmap[b]-resultantmap[a]})

	console.log(sortedfiles)
	for ( var i = 0 ; i < sortedfiles.length; i++ )
	{
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
		}
	}

	console.log(sortedfiles)

	for ( var filename of sortedfiles )
	{
		result.push( {name: filename, score : resultantmap[filename], lines : this.sentence_word_map[sentencerecorder[filename][0]][filename][0] + "\n" } )
	}

	return result;	
  }

  /** Given a text string, return a ordered list of all completions of
   *  the last word in text.  Returns [] if the last char in text is
   *  not alphabetic.
   */
  complete(text) {
    //@TODO
	console.log(text)
    return [];
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

