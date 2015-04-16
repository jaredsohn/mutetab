/////////////////////////////////////////////////////////////////////////////////////////////////
// For context menus
/////////////////////////////////////////////////////////////////////////////////////////////////

var contextmenus = {};

//Guide for namespacing: http://javascriptweblog.wordpress.com/2010/12/07/namespacing-in-javascript/
var _contextmenus = function() {
  var scope = this;

  var _currentTabContextId;
  var _otherTabsContextId;
  var _allTabsContextId;
  var _operatorForContextMenuDict = {};
  var _msgContextId;
  var _muteAllContextId;
  var _muteOthersContextId;
  var _updateContextMenusBusy = false;
  this.ClearContextMenus = function()
  {
    chrome.contextMenus.removeAll(function() {
      _msgContextId = chrome.contextMenus.create({
        "title": "(Only one dialog at a time)",
        "contexts": ["page"]
      });
    });
  };

  var operationContextMenuClickHandler = function(info, tab) {
    scope.PerformOperationForContextMenu(info, tab, scope._operatorForContextMenuDict[info.menuItemId]);
  };

  this.UpdateContextMenus = function(tabId) {
    if (_updateContextMenusBusy === true)
      return;

    _updateContextMenusBusy = true;
    chrome.contextMenus.removeAll(function callback() {
      try {
        _currentTabContextId = chrome.contextMenus.create({
          "title": "Current tab",
          "contexts": ["page"],
          "documentUrlPatterns": ["http://*/*", "https://*/*"]
        });

        _muteAllContextId = chrome.contextMenus.create({
          "title": "Stop all tabs", //"Mute all...",
          "contexts": ["page"],
          "onclick": muteAllContextMenuClickHandler
        });

        _muteOthersContextId = chrome.contextMenus.create({
          "title": "Stop background tabs", //"Mute background tabs...",
          "contexts": ["page"],
          "onclick": muteOthersContextMenuClickHandler
        });

        var operationsArray;
        var includedMuteUnsafeOperation;

        operationsArray = GetAllowedOperationsForTabId(tabId, true, Options);
        operationsArray.push('-');
        operationsArray.push(Operation.Update);

        var contextMenuId;
        var operationsArrayIndex;
        scope._operatorForContextMenuDict = {};
        includedMuteUnsafeOperation = false;
        for (operationsArrayIndex = 0; operationsArrayIndex < operationsArray.length; operationsArrayIndex++) {
          if (operationsArray[operationsArrayIndex] === Operation.SmartMute)
            includedMuteUnsafeOperation = true;
          if ((operationsArray[operationsArrayIndex] === Operation.SmartMuteSafe) && (includedMuteUnsafeOperation === true)) // Don't include both mute safe and mute unsafe
            continue;
          var tabInfo = messaging.TabInfoDict[tabId];

          if (operationsArray[operationsArrayIndex] === '-') {
            contextMenuId = chrome.contextMenus.create({
              "contexts": ["page"],
              "type": "separator",

              "parentId": _currentTabContextId
            });
          }
          else {
            contextMenuId = chrome.contextMenus.create({
              "title": operationsArray[operationsArrayIndex],
              "contexts": ["page"],
              "onclick": operationContextMenuClickHandler,
              "parentId": _currentTabContextId
            });
            scope._operatorForContextMenuDict[contextMenuId] = operationsArray[operationsArrayIndex];
          }
        }

        _updateContextMenusBusy = false;

      }
      catch (ex) {
        consolelog('UpdateContextMenus - ' + ex);
      }
    });
    //consolelog("updatecontextmenus done");
  };

  this.PerformOperationForContextMenu = function(info, tab, operation) {
    //consolelog("PerformOperationForContextMenu");
    try {
      var contextName = "";

      //consolelog("parentmenuitemid = " + info.parentMenuItemId);

      switch (info.parentMenuItemId) {
        case _currentTabContextId:
          contextName = "current";
          tabId = tab.id;
          break;
        case _otherTabsContextId:
          contextName = "othertabs";
          tabId = messaging.ALLBUTCURRENTTAB;
          break;
        case _allTabsContextId:
          contextName = "alltabs";
          tabId = messaging.ALLTABS;
          break;
      }

      var operationRequest = messaging.GetTabInfoFor(tabId);
      operationRequest.Operation = operation;
      operationRequest.AllSourcesInTab = true;
      operationRequest.IsSync = false;
      operationRequest.CurrentTabId = tab.id;

      //consolelog("Initialized contextmenu operation:");
      //consolelog(operationRequest);
      messaging.InitRequest(operationRequest);

      try {
        if (Options.AnalyticsEnabled === true) {
          _gaq.push(['_trackEvent', 'contextmenu-' + contextName, operation]);
        }
      } catch (ex)
      {
        consolelog(ex);
      }

      if (operation === Operation.SmartMute)
        scope.ClearContextMenus(); // Prevent showing multiple simultaneous dialogs

      messaging.OnRequestAsync(operationRequest);

    }
    catch (ex) {
      consolelog('PerformOperationForContextMenu - ' + ex);
    }
  };

  var muteAllContextMenuClickHandler = function(info, tab)
  {
    //console.log("muteallcontextmenuclickhandler")
    var operationRequest = messaging.GetTabInfoFor(messaging.ALLTABS);
    operationRequest.Operation = Operation.SmartMute;
    operationRequest.AllSourcesInTab = true;
    operationRequest.IsSync = false;
    operationRequest.CurrentTabId = tab.id;

    messaging.InitRequest(operationRequest);

    //console.log("muteall operation request");
    //console.log(operationRequest);

    messaging.OnRequestAsync(operationRequest);
  };

  var muteOthersContextMenuClickHandler = function(info, tab)
  {
    var operationRequest = messaging.GetTabInfoFor(messaging.ALLBUTCURRENTTAB);
    operationRequest.Operation = Operation.SmartMute;
    operationRequest.AllSourcesInTab = true;
    operationRequest.IsSync = false;
    operationRequest.CurrentTabId = tab.id;

    messaging.InitRequest(operationRequest);
    messaging.OnRequestAsync(operationRequest);
  };

};
_contextmenus.call(contextmenus);
