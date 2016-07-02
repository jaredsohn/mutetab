#!/usr/bin/env bash

npm run eslint

./node_modules/.bin/watchify -v -o build/js/background-bundle.js src/js/background.js &
./node_modules/.bin/watchify -v -o build/js/options-bundle.js src/js/options.js &
./node_modules/.bin/watchify -v -t babelify -o build/js/client-bundle.js src/js/client.jsx &

cp src/js/DefaultController.js build/js/
cp src/js/background/music_controllers/* build/js/music_controllers

for job in `jobs -p`
do
  wait $job
done
