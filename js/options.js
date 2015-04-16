_savePref = function(key, value)
{
  forge.prefs.set(key, value, null, null);
};

ClearOptions = function() {
  forge.prefs.clearAll(function()
  {
    InitOptions(Options);
    console.log("Options cleared.");
  }, null);
};

// Note: Cleaned up cruft a lot 6/20/2012.  Look at right before that date to see what used to be out in the wild.
// Is now async (9/2013)
InitOptions = function(options) // If defaults change, update manually in optionsui.js
{
  // Legacy
  options.ShowMuteStatusIcon = false; //Note: varname changed here from 1.2 release so that I can change everyone's default
  options.ShowDetailedOperations = false;
  options.ShowAllAudioSources = true;
  forge.prefs.get("automuteBackground", function(val) { options.AutoMuteBackground = (val !== null) ? val : false; }, function() { options.AutoMuteBackground = false; });
  forge.prefs.get("noDestructiveAutoMute", function(val) { options.NoDestructiveAutoMute = (val !== null) ? val : true; }, function() { options.NoDestructiveAutoMute = true; });
  options.ShowMultiFrameFlashOperations = false; // dead

  // Current (2.0 and later)
  forge.prefs.get("flickerEnabled", function(val) { options.FlickerEnabled = (val !== null) ? val : true; }, function() { options.FlickerEnabled = true; });
  forge.prefs.get("forceScripting", function(val) { options.ForceScripting = (val !== null) ? val : true; }, function() { options.ForceScripting = true; });
  forge.prefs.get("loggingEnabled", function(val) { options.LoggingEnabled = (val !== null) ? val : false; }, function() { options.LoggingEnabled = false; });
  forge.prefs.get("msgLoggingEnabled", function(val) { options.MsgLoggingEnabled = (val !== null) ? val : false; }, function() { options.MsgLoggingEnabled = false; });
  forge.prefs.get("analyticsEnabled", function(val) { options.AnalyticsEnabled = (val !== null) ? val : true; }, function() { options.AnalyticsEnabled = true; });
  forge.prefs.get("updateOnPopup", function(val) { options.UpdateOnPopup = (val !== null) ? val : true; }, function() { options.UpdateOnPopup = true; });
  forge.prefs.get("autoStopMode", function(val) { options.AutoStopMode = (val !== null) ? val : false; }, function() { options.AutoStopMode = false; });
  forge.prefs.get("showBlocked", function(val) { options.ShowBlocked = (val !== null) ? val : false; }, function() { options.ShowBlocked = false; }); // Do we show blocked in the popup
  forge.prefs.get("expandTabId", function(val) { options.ExpandTabId = parseInt((val !== null) ? val : -1, 10); }, function() { options.ExpandTabId = -1; }); // For which tab do we show audio sources in the popup?

  // Might exist in future
  options.AutomuteExclusionsText = '';
  options.UndetectedText = '';

  console.log("loaded options: ");
  console.log(options);
};

SaveOptions = function(options)
{
  _savePref("flickerEnabled", options.FlickerEnabled);
  _savePref("forceScripting", options.ForceScripting);

  // User must change these at the console.  Values saved here (so user doesn't have to enter it again when restarting)
  _savePref("loggingEnabled", options.LoggingEnabled);
  _savePref("msgLoggingEnabled", options.MsgLoggingEnabled);
  _savePref("analyticsEnabled", options.AnalyticsEnabled);

  _savePref("updateOnPopup", options.UpdateOnPopup);
  _savePref("showBlocked", options.ShowBlocked);
  _savePref("autoStopMode", options.AutoStopMode);
  _savePref("expandTabId", options.ExpandTabId.toString());
};

SetDevMode = function()
{
  _savePref("updateOnPopup", false);
  _savePref("loggingEnabled", true);
  _savePref("msgLoggingEnabled", true);
  _savePref("analyticsEnabled", false);

  InitOptions(Options);
  console.log("Success!  Options set to:");
  console.log(Options);
};

// Most migration code removed since it would only affect users who hadn't upgraded in over a year
MigrateOptions = function()
{

  var now = new Date().getTime();

//  forge.prefs.get("welcomed", _onCheckWelcomed, function() { _onCheckedWelcomed(null); });
  forge.prefs.get("install_time", _onCheckedInstall, function() { _onCheckedInstall(null); });
};

_onCheckedInstall = function(val)
{
  if (val === null)
  {
    var version = chrome.app.getDetails().version;
    var now = new Date().getTime();

    _savePref("install_time", now);
    _savePref("version", version);

    localStorage.setItem("welcomed", now);
    chrome.tabs.create({
        'url': "http://www.mutetab.com/welcome.html"
    }, function(tab) {
    });

    try {
      _gaq.push(['_trackEvent', 'installed', version]);
    } catch (ex) {
      console.log(ex);
    }
  }
};
