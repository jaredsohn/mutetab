// Wraps injecting JavaScript into a tab with some tabid
//
// Had been used to have MuteTab work on tabs open prior to installing extension (but broken in 9/13)
// A warning on using this: contentscripts are injected into the normal DOM instead of
// the separate ones that Chrome normally executes them in.

var InjectJS = function(js, tabid, callback, callbackparam) {
  var details = {};
  details.code = js;
  details.allFrames = true;
  chrome.tabs.executeScript(tabid, details, function() {
    callback(callbackparam);
  });
};

//TODO: should first determine if tab already has a contentscript. (Maybe by doing updateall as before)
//TODO: should not do this if page cannot be injected into (determine via url?)
var InjectContentScripts = function(tabId, callback, callbackparam) {
  var appDetails = chrome.app.getDetails();

  consolelog("injectcontentscripts into tabid " + tabId);

  // Uses async library: https://github.com/caolan/async
  async.forEachSeries(appDetails.content_scripts[0].js, function(item, callback) {

    var details = {};
    details.file = item;
    details.allFrames = appDetails.content_scripts[0].all_frames;

    consolelog("going to inject into tabid " + tabId + "\n");
    consolelog(details);
    chrome.tabs.executeScript(tabId, details, function() {

      callback(callbackparam);
    });
  }, function(err) {
    consolelog("done! err = ");
    consolelog(err);

    // possibly do a callback if I want this whole method to be run synced
    if (callback !== null)
      callback(callbackparam);
  });
};
var InjectContentScriptsAsync = function(tabId) {
  scope.InjectContentScripts(tabId, null, null);
};
