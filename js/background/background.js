var Options = {};

var _displayInfo = null;

var mutetab = mutetab || {};
var _mutetab = function() {
  var scope = this;

  // Constants
  var _injectCode = "";

  ////////////////////////////////////////////////////////////////////////////////////
  // Performing MuteTab-specific operations
  ////////////////////////////////////////////////////////////////////////////////////
  this.UnblockTab = function(tabId) {
    if (Options.AutoStopMode !== true)
      return;

    var request = messaging.GetTabInfoFor(tabId);
    request.Operation = Operation.Unblock;
    request.IsSync = false;
//    consolelog("initrequest 3");

    messaging.InitRequest(request);

    messaging.OnRequestAsync(request);
  };

  this.MuteOtherTabs = function(tabId) {
    if (Options.AutoStopMode !== true)
      return;

    var request = new TabInfo();
    request.TabId = messaging.ALLBUTCURRENTTAB;
    request.CurrentTabId = tabId;
    request.AllSourcesInTab = true;

    request.Operation = Operation.SmartMute + '!';
    request.IsSync = false;

    messaging.InitRequest(request);
    messaging.OnRequestAsync(request);
  };

  // Likely not necessary; used for manifestv2
  this.UpdateAllNoCallback = function() {
    return scope.UpdateAll(null);
  };

  // For now, this just gets run upon startup.
  // Note: I don't think it will work synchronously on program startup because we don't know how many frames a page will have. (And since this clears out stored data, that ensures it.)

  this.UpdateAll = function(callback) {
    var operationRequest = new TabInfo();
    operationRequest.TabId = messaging.ALLTABS;
    operationRequest.Operation = Operation.Update;
    messaging.InitRequest(operationRequest);
    messaging.OnRequestSync(operationRequest, callback);
  };

  // TO_DO
  this.matchesRule = function(str, rule)
  {
    var matches = false;

    if (str === rule)
      matches = true;

    //TO_DO: support wildcards and/or regexs

    return matches;
  };

  this.ToggleTabIsBackground = function(isBg, isPermanent)
  {
    //TODO: get currenttabid. Either set or remove a rule for it.  If setting a rule and isPermament is true, have it update it in prefs.
  };
};
_mutetab.call(mutetab);


////////////////////////////////////////////////////////////////////////////////////
// Set messaging delegates
////////////////////////////////////////////////////////////////////////////////////
messaging.TabChangedCommon = function(tabId) {

  // Launch this asynchronously.  TODO: avoid if already have info; not easy to check, though.
  chrome.tabs.get(tabId, messaging.InitTabInfo);

    var tabInfo = messaging.TabInfoDict[tabId];
  if (typeof tabInfo !== 'undefined') {
    msgconsolelog("Current tab (#" + tabId + "): ");
    msgconsolelog(tabInfo);
  }

  messaging._currentTabIdUnknown = false;
  messaging._prevSelectedTabId = tabId;

  messaging.MarkVisited(tabId);
  mutetab.MuteOtherTabs(tabId);
  //mutetab.UnblockTab(tabId);

//  mutetab.NotificationTest();

  contextmenus.UpdateContextMenus(tabId);
};

messaging.OnStore = function(tabInfo, storedTabInfo) {
  var audioSourceCount = 0;
  if (Options.ShowMuteStatusIcon === true) {
    for (frameIndex = 0; frameIndex < storedTabInfo.Frames.length; frameIndex++) {
      audioSourceCount += storedTabInfo.Frames[frameIndex].AudioSources.length;
    }
  }

  // Update context menu after data updated for current page
  if (tabInfo.TabId === messaging._prevSelectedTabId)
    contextmenus.UpdateContextMenus(tabInfo.TabId);
};

messaging.OnIncludedByUser = function(tabId)
{
  //TODO: work similarly to onexcludedbyuser.  but this is for assuming there is sound on a manual exception page
  return false;
};

messaging.OnExcludedByUser = function(tabId)
{
  // not implemented (pseudocode in git repository September 2013)
  return false;
};

////////////////////////////////////////////////////////////////////////////////////
// Executed on startup
////////////////////////////////////////////////////////////////////////////////////
//chrome.runtime.setUninstallUrl("http://www.mutetab.com/bye.html");

MigrateOptions();
InitOptions(Options);

messaging.InitListeners();

// Show tabs that could play sound on startup.  Note that each time the extension is restarted, each open webpage will grow further in size.
mutetab.UpdateAll(null);
setTimeout(mutetab.UpdateAllNoCallback, 3000);  // a hack to ensure that tabs that don't have the contentscript injected in them still show up.
