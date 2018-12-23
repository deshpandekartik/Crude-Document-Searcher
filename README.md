Crude document searcher

1. Start the document searcher.

```
cd searcher
npm install
./index.js mongodb://localhost:27017/docs add-noise $DATA/noise-words.txt
./index.js mongodb://localhost:27017/docs add-content $GBS/*.txt
cd ..

```

2. Start Rest API services.

```
cd rest-api
npm install
./index.js mongodb://localhost:27017/docs 1235 $DATA/noise-words.txt $SNARK/_*.txt &
cd ..

```

3. Render webpages, through Mustache template on port 80 

```
cd gui-mustache
npm install
./index.js 80 http://localhost:1235
cd ..

```
