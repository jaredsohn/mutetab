// This code determines what actions to take when an operation icon is clicked.   This implementation is for the MuteTab popup window.

if (typeof(bg) === 'unknown')
  var bg = chrome.extension.getBackgroundPage();

if (typeof(consolelog) === 'unknown')
{
  consolelog = function(msg)
  {
    if (bg.Options.EnableLogging === true)
       console.log(msg);
  };
}

var popup_operation_loaded = true;

var _operateCallback = OperateOnTab_CallBack;

function OperateOnAudioSource(tabId, frameIndex, audioSourceIndex, operation, isSync) {

  try {
    if (bg.Options.AnalyticsEnabled === true) {
      _gaq.push(['_trackEvent', 'popup-audiosource', operation]);
    }
  } catch (ex)
  {
    consolelog(ex);
  }

  var tabInfo = bg.messaging.TabInfoDict[tabId];
  var newTabInfo = new TabInfo();
  newTabInfo.TabId = tabInfo.TabId;
  newTabInfo.Frames = [];
  newTabInfo.Frames.push(new FrameInfo());
  newTabInfo.Frames[0].PortName = tabInfo.Frames[frameIndex].PortName;
  newTabInfo.Frames[0].AudioSources = [];
  newTabInfo.Frames[0].AudioSources.push(tabInfo.Frames[frameIndex].AudioSources[audioSourceIndex]);

  newTabInfo.Operation = operation;
  newTabInfo.AllSourcesInTab = false;
  _operateOnTab(newTabInfo, operation, isSync);
  if (isSync !== false)
  {
    if (operation !== Operation.Show) {
      _operateCallback();
    }
  }
}

function OperateOnTab(tabId, operation, isSync) {

  var tabInfo = bg.messaging.GetTabInfoFor(tabId);
  tabInfo.AllSourcesInTab = true;
  _operateOnTab(tabInfo, operation, isSync);

  if (isSync === false)
  {
    if (operation !== Operation.Show) {
      _operateCallback();
    }
  }
}

// Automatically collapses what was previously expanded and saves what should be expanded to local storage
function Expand(tabId)
{
  Collapse(bg.Options.ExpandTabId);

//  console.log("expand");
  try {
    document.getElementById("audiosourcesfortab_" + tabId).style.display = 'block';
    document.getElementById("collapseexpandfortab_" + tabId).src = "img/operations/minus.png";

    bg.Options.ExpandTabId = tabId;
    bg.SaveOptions(bg.Options);
  } catch (ex)
  {
    consolelog("error:");
    consolelog(ex);
    consolelog(tabId);
  }
}

function Collapse(tabId)
{
  bg.Options.ExpandTabId = -1;
  bg.SaveOptions(bg.Options);

  try {
    document.getElementById("audiosourcesfortab_" + tabId).style.display = 'none';
    document.getElementById("collapseexpandfortab_" + tabId).src = "img/operations/plus2.png";
  } catch (ex)
  {

  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function _operateOnTab(tabInfo, operation, isSync) {

  var operationRequest = owl.deepCopy(tabInfo);

  // We make a copy of the tabinfo here that doesn't include port information (which can be a 'cyclic' structure and is unnecessary)
  operationRequest.Operation = operation;
  operationRequest.IsSync = isSync;

  try {
    if (operation !== Operation.Update) {
      if (bg.Options.AnalyticsEnabled === true) {
        _gaq.push(['_trackEvent', 'popup-tab', operation]);
      }
    }
  } catch (ex)
  {
    consolelog(ex);
  }

  chrome.extension.sendRequest(operationRequest, function(response) {
    if (isSync !== false)
    {
      _operateCallback();
    }
  });
}

function OperateOnTab_CallBack() {
  location.reload();
}
