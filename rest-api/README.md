
```
#setup sh vars
$ DATA=$HOME/cs580w/data
$ SNARK=$DATA/corpus/snark
$ TESTS=$DATA/corpus/tests

#show usage message
./index.js
usage: index.js MONGO_DB_URL PORT NOISE_FILE [CONTENT_FILE...]

#start ws services in background using trailing &
$ ./index.js mongodb://localhost:27017/docs 1235
    $DATA/noise-words.txt $SNARK/_*.txt &
[1] 3155
$ PID 3155 listening on port 1235

#file .pid contains server PID
$ cat .pid
3155

#bad query; HTTP_STATUS is 400 BAD_REQUEST;
#using jq . to pretty-print json (could also use json_pp);
#the -s curl option makes curl silent.
$ curl -s 'http://localhost:1235/docs' | jq .
{
  "code": "BAD_PARAM",
  "message": "required query parameter \"q\" is missing"
}

#search for 'beaver daylight'; note %20 used to quote space
#note no previous link as first set of results
$ curl -s 'http://localhost:1235/docs?q=beaver%20daylight' | jq .
{
  "results": [
    {
      "name": "_the-hunting-of-the-snark_135",
      "score": 2,
      "lines": [
        "   And the Beaver, excited at last,\n",
        "   For the daylight was nearly past.\n"
      ],
      "href": "http://localhost:1235/docs/_the-hunting-of-the-snark_135"
    },
    {
      "name": "_the-hunting-of-the-snark_006",
      "score": 1,
      "lines": [
        "There was also a Beaver, that paced on the deck,\n"
      ],
      "href": "http://localhost:1235/docs/_the-hunting-of-the-snark_006"
    },
    {
      "name": "_the-hunting-of-the-snark_017",
      "score": 1,
      "lines": [
        "   There was only one Beaver on board;\n"
      ],
      "href": "http://localhost:1235/docs/_the-hunting-of-the-snark_017"
    },
    {
      "name": "_the-hunting-of-the-snark_018",
      "score": 1,
      "lines": [
        "The Beaver, who happened to hear the remark,\n"
      ],
      "href": "http://localhost:1235/docs/_the-hunting-of-the-snark_018"
    },
    {
      "name": "_the-hunting-of-the-snark_021",
      "score": 1,
      "lines": [
        "The Beaver's best course was, no doubt, to procure\n"
      ],
      "href": "http://localhost:1235/docs/_the-hunting-of-the-snark_021"
    }
  ],
  "totalCount": 17,
  "links": [
    {
      "rel": "self",
      "href": "http://localhost:1235/docs?q=beaver%20daylight&start=0&count=5"
    },
    {
      "rel": "next",
      "href": "http://localhost:1235/docs?q=beaver%20daylight&start=5&count=5"
    }
  ]
}

#use start query parameter to scroll into results
#note no next link as last set of results
$ curl -s 'http://localhost:1235/docs?q=beaver%20daylight&start=15' | jq .
{
  "results": [
    {
      "name": "_the-hunting-of-the-snark_104",
      "score": 1,
      "lines": [
        "Such friends, as the Beaver and Butcher became,\n"
      ],
      "href": "http://localhost:1235/docs/_the-hunting-of-the-snark_104"
    },
    {
      "name": "_the-hunting-of-the-snark_107",
      "score": 1,
      "lines": [
        "   That the Beaver's lace-making was wrong,\n"
      ],
      "href": "http://localhost:1235/docs/_the-hunting-of-the-snark_107"
    }
  ],
  "totalCount": 17,
  "links": [
    {
      "rel": "self",
      "href": "http://localhost:1235/docs?q=beaver%20daylight&start=15&count=5"
    },
    {
      "rel": "previous",
      "href": "http://localhost:1235/docs?q=beaver%20daylight&start=10&count=5"
    }
  ]
}

//bad start param; HTTP_STATUS is 400 BAD_REQUEST
$ curl -s 'http://localhost:1235/docs?q=beaver%20daylight&start=a15' | jq .
{
  "code": "BAD_PARAM",
  "message": "bad query parameter \"start\""
}

//bad count param; HTTP_STATUS is 400 BAD_REQUEST
$ curl -s 'http://localhost:1235/docs?q=beaver%20daylight&count=-5' | jq .
{
  "code": "BAD_PARAM",
  "message": "bad query parameter \"count\""
}

#completions; note use of + to represent space
$ curl -s 'http://localhost:1235/completions?text=the+hunting+of+the+sna' | jq .
[
  "snapping",
  "snark",
  "snarked",
  "snarkevery",
  "snarks"
]

#bad text param; HTTP_STATUS is 400 BAD_REQUEST
$ curl -s 'http://localhost:1235/completions?text1=sna' | jq .
{
  "code": "BAD_PARAM",
  "message": "required query parameter \"text\" is missing"
}

#we don't have any results for 'betty'
$ curl -s 'http://localhost:1235/docs?q=betty' | jq .
{
  "results": [],
  "totalCount": 0,
  "links": [
    {
      "rel": "self",
      "href": "http://localhost:1235/docs?q=betty&start=0&count=5"
    }
  ]
}

#show usage of a trivial script which wraps file contents into json
#along with name formed from file basename.
$ $DATA/mk-json.js $TESTS/test1.txt | jq .
{
  "name": "test1",
  "content": "Betty Botter bought a bit of butter\nBut the bit of butter Betty Botter bought was bitter\nSo Betty Botter bought a better bit of butter.\n\n"
}

#POST a test file to docs;
#curl's -X option is used to specify the POST HTTP method and
#`-d` provides #the body content;
#the value for the -d option is provided using mk-json.js with
#sed used to escape json " so that outer " can be used to quote spaces;
#note that this log does not show the HTTP status (201 CREATED)
#and the Location header (same as the returned href);
$ curl -s -X POST -H 'Content-Type: application/json' \
    -d "$($DATA/mk-json.js $TESTS/test1.txt | sed -e 's/"/\"/g' )"  \
    'http://localhost:1235/docs' | jq .
{
  "href": "http://localhost:1235/docs/test1"
}

#we now have results for betty; note no next or previous links
$ curl -s 'http://localhost:1235/docs?q=betty' | jq .
{
  "results": [
    {
      "name": "test1",
      "score": 3,
      "lines": [
        "Betty Botter bought a bit of butter\n"
      ],
      "href": "http://localhost:1235/docs/test1"
    }
  ],
  "totalCount": 1,
  "links": [
    {
      "rel": "self",
      "href": "http://localhost:1235/docs?q=betty&start=0&count=5"
    }
  ]
}

#missing POST parameters; HTTP_STATUS is 400 BAD_REQUEST
$ curl -s -X POST -H 'Content-Type: application/json'  \
    'http://localhost:1235/docs' | jq .
{
  "code": "BAD_PARAM",
  "message": "required body parameter \"name\" is missing"
}
$ curl -s -X POST -H 'Content-Type: application/json' \
    -d '{ "name": "xxx" }' \
    'http://localhost:1235/docs' | jq .
{
  "code": "BAD_PARAM",
  "message": "required body parameter \"content\" is missing"
}

#we can retrieve contents of a document 
$ curl -s 'http://localhost:1235/docs/test1' | jq .
{
  "content": "Betty Botter bought a bit of butter\nBut the bit of butter Betty Botter bought was bitter\nSo Betty Botter bought a better bit of butter.\n\n",
  "links": [
    {
      "rel": "self",
      "href": "http://localhost:1235/docs/test1"
    }
  ]
}

#shutdown server which is running in the background
$ kill `cat .pid`
shutting down on SIGTERM
$ 
[1]+  Done                    ./index.js mongodb://localhost:27017/docs 1235 $DATA/noise-words.txt $SNARK/_*.txt

$

```
