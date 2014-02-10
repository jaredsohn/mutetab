var Options = {}; // Local copy of options

document.addEventListener('DOMContentLoaded', function () {
  loadOptions(chrome.extension.getBackgroundPage().Options);

  document.querySelector('#save').addEventListener('click', function(e) { saveOptions();});
  document.querySelector('#restore_default').addEventListener('click', function(e) { restoreDefault();});
});

function loadOptions(options) {
//  document.getElementById("automutemode").value = options.AutoMuteMode;
  document.getElementById("automute_exclusions").value = options.AutomuteExclusionsText;
  document.getElementById("manuallydetected").value = options.UndetectedText;
//  document.getElementById("ShowFlashOperationsCheckBox").checked = options.ShowMultiFrameFlashOperations;
  document.getElementById("ForceScriptingCheckBox").checked = options.ForceScripting;

  Options = options;
}

function saveOptions() {
//  Options.AutoMuteBackground = document.getElementById("AutomuteBackgroundCheckBox").checked ? 'true' : 'false';
//  Options.NoDestructiveAutoMute = document.getElementById("NoDestructiveAutoMuteCheckBox").checked ? 'true' : 'false';

//  Options.AutoMuteMode = document.getElementById("automutemode").value;
//  Options.ShowMultiFrameFlashOperations = document.getElementById("ShowFlashOperationsCheckBox").checked ? true : false;
  Options.ForceScripting = document.getElementById("ForceScriptingCheckBox").checked ? true : false;

  Options.AutomuteExclusionsText = document.getElementById("automute_exclusions").value;
  Options.UndetectedText = document.getElementById("manuallydetected").value;

  var bg = chrome.extension.getBackgroundPage();
  bg.SaveOptions(Options);

  //updateBackground();

  alert('Options saved.');
}

/*
function updateBackground()
{
  var bg = chrome.extension.getBackgroundPage();
  var showMuteStatusIconChanged = (bg.Options.ShowMuteStatusIcon != (localStorage["showMuteStatusIcon"] == 'true'));
  bg.InitOptions(bg.Options);
  
  if (showMuteStatusIconChanged)
  {
      var request = new Object();
      request.Operation = "Update";
      request.TabId = bg.ALLTABS;
    
      chrome.extension.sendRequest(request, function(response) {
      });
    
    //GetAllTabIds(_updateIcons);    
    //TODO: send request to background to updateall 
  }
}*/

//This just updates the UI instead of changing values.
function restoreDefault() {
//  Options.ShowMultiFrameFlashOperations = false;
  Options.ForceScripting = true;
  Options.AutomuteExclusionsText = 'http://www.rdio.com\nhttp://www.pandora.com\n'; // TODO: add to this  
  Options.UndetectedText = 'http://www.rdio.com\n';
//  Options.AutoMuteMode = "Disabled";

/*
  Options.ShowMuteStatusIcon = false;
  Options.ShowDetailedOperations = false;
  Options.ShowAllAudioSources = true;
  Options.AutoMuteBackground = false;
  Options.NoDestructiveAutoMute = true;
  Options.ShowMultiFrameFlashOperations = false;
  Options.IncludeMenuForFlash = false;
  Options.FlickerEnabled = true;
  Options.ForceScripting = true;

  Options.LoggingEnabled = false;
  Options.MsgLoggingEnabled = false;
//  options.SocketEnabled = LoadFromStorage("socketEnabled", 'false');
  Options.AnalyticsEnabled = false;
  Options.UpdateOnPopup = false;
  
  Options.UrlExclusionRules = '';
*/


  loadOptions(Options);
}
