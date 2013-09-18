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

1. Clone [OpenForge](https://github.com/trigger-corp/browser-extensions).

2. Clone this repository and place it into the src folder from where you cloned OpenForge.

3. Install [mergejson](https://github.com/jaredsohn/mergejson) to update the manifest with features I don't think are supported by OpenForge and place into the OpenForge folder.

4. Run the following commands (including them in a script is recommended.)

```
source ./python-env/bin/activate
mkdir development
mkdir development/chrome
forge-extension build chrome
python mergejson.py development/chrome/manifest.json src/mutetab_chrome.json development/chrome/manifest.json
```

You can run it by going to chrome://extensions, checking Developer mode, clicking "Load unpacked extension...", and choosing the development/chrome folder.
