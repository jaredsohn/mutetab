#!/usr/bin/env bash
npm run eslint

./node_modules/.bin/browserify -o build/js/background-bundle.js src/js/background.js
./node_modules/.bin/browserify -t babelify -o build/js/client-bundle.js src/js/client.jsx
./node_modules/.bin/watchify -v -o build/js/options-bundle.js src/js/options.js &

rm build/js/music_controllers/*
cp src/js/background/music_controllers/* build/js/music_controllers
cp src/js/DefaultController.js build/js/

echo Done!