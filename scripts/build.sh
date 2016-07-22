#!/usr/bin/env bash
#npm run eslint

./node_modules/.bin/browserify -o build/js/background-bundle.js src/js/background.js
./node_modules/.bin/browserify -t [ babelify --presets [ es2015 react ] ]  -o build/js/client-bundle.js src/js/client.jsx
./node_modules/.bin/browserify -o build/js/options-bundle.js src/js/options.js

echo Done!