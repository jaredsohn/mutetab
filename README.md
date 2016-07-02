MuteTab
========================

MuteTab is a Chrome extension that gives you enhanced control over your browser's sound.  Features include mute by default, blacklists, and an experimental music ducking feature.  More info at [mutetab.com](http://www.mutetab.com/new).


Installing from Source
----------------------

 * Visit `chrome://extensions/`
 * Ensure `Developer mode` is checked
 * Click `Load unpacked extension...`
 * Locate and select the directory with the `manifest.json` file in it

Hacking
-------

You must have [Node.js](http://nodejs.org/) installed to build the extension.

1. Install the dependencies: `npm install`
2. Build the extension from `src/js` into `build/js`:

  * Build once: `npm run build`

  * Build continuously as files change: `npm start`

The entry point for the extension's background page is `src/js/background.js`. It is responsible for communicating the list of open tabs to the client when requested.

The entry point for the extension's front-end is `src/js/client.jsx`. The client is written using [React](http://facebook.github.io/react/).

Both these files are bundled using [Browserify](http://browserify.org/) (running a JSX transform for the client scripts) into `build/js`. At runtime, the extension uses only files from `build` and `vendor`.

Tests
-----
Run the test suite by enabling the extension and going to chrome-extension://jopkojhkkeglfnolgoojbfdoimpnllfd/build/html/test.html. Note that running the tests will clear out your preferences and that you will need to click 'Restore defaults' or restart the extension before using it again. (There are some hidden settings that will cause the extension to behave abnormally.)

Licensing
---------

This code is licensed MIT.

The structure and UI started as a fork of [Chrome Fast Tab Switcher](https://github.com/BinaryMuse/chrome-fast-tab-switcher), which is Copyright (c) 2014 Michelle Tilley under the MIT license.

It also includes a large amount of [Streamkeys](https://github.com/berrberr/streamkeys) code (currently unused) which is Copyright (c) 2014 Alex Gabriel under the MIT license.

