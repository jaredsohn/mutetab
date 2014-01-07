MuteTab Chrome extension
=======

MuteTab is a Chrome extension that helps you manage the sound coming from tabs in Google Chrome. It helps you to narrow down which tab(s) are making sounds and provides browser-wide management of tab muting (pausing YouTube, HTML5 Video/Audio, and QuickTime and stopping others), including automatically pausing/stopping many background tabs.  It does not detect web audio.

###Documentation/download
http://www.mutetab.com/

###Points of interest

People looking to reuse code may find the following pieces of highest interest:

* js/contentscript/objectembed.js: Interpret the source of a plug-in to determine which parameters are set or change them.
* js/contentscript/messaging_contentscript.js, background/messaging.js: framework for keeping track of data related to open tabs

###Build instructions

First get the files onto your computer.  Clone [OpenForge](https://github.com/trigger-corp/browser-extensions) into mutetab_src and follow its instructions for setting it up.

Then clone this project and a utility ([mergejson](https://github.com/jaredsohn/mergejson)) into the proper folders by running the following commands:

```
cd mutetab_src
git clone https://github.com/jaredsohn/mutetab.git src
git clone https://github.com/jaredsohn/mergejson.git mergejson
```

Finally, run the following commands (including them in a script is recommended, since you'll do it every time you build.)

```
source ./python-env/bin/activate
rm -rf development/chrome
forge-extension build chrome
python mergejson/mergejson.py development/chrome/manifest.json src/mutetab_chrome.json development/chrome/manifest.json
```

You can run it by going to chrome://extensions, checking Developer mode, clicking "Load unpacked extension...", and choosing the development/chrome folder.


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/jaredsohn/mutetab/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

