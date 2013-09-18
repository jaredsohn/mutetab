MuteTab Chrome extension
=======

MuteTab is a Chrome extension that helps you manage the sound coming from tabs in Google Chrome. It helps you to narrow down which tab(s) are making sounds and provides browser-wide management of tab muting (pausing YouTube, HTML5 Video/Audio, and QuickTime and stopping others), including automatically pausing/stopping many background tabs.  It does not detect web audio.

###Documentation/download
http://www.mutetab.com/

###Source setup

1. Download and set up [OpenForge](https://github.com/trigger-corp/browser-extensions).

2. Download the contents of this repository and place it into OpenForge's src folder.

3. Download [mutetab_build](https://github.com/jaredsohn/mutetab_build) (will be posted soon) and place the contents into the OpenForge folder.

4. From the OpenForge folder, make 'z' executable and run it to create a new build. (You can find it in development/chrome.)

### Build instructions

1. Install [mergejson](https://github.com/jaredsohn/mergejson) to update the manifest with features I don't think are supported by openforge.

2. Run the following commands (including them in a script is recommended.)
source ./python-env/bin/activate
mkdir development
mkdir development/chrome
forge-extension build chrome
python mergejson.py development/chrome/manifest.json src/mutetab_chrome.json development/chrome/manifest.json

3. You can runit by going to chrome://extensions, checking Developer mode, clicking Load unpacked extension..., and choosing the development/chrome folder.
