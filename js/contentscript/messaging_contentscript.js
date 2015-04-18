function consolelog(msg)
{
  if (messaging.LoggingEnabled) {
    console.log(msg);
  }
}

function consoleerror(msg)
{
  if (messaging.LoggingEnabled) {
    console.error(msg);
  //console.log(stacktrace());
  }
}

function msgconsolelog(msg)
{
  if (messaging.MsgLoggingEnabled === true)
    console.log(msg);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////

var messaging = {};
var _messaging = function() {
  var scope = this;

  this.Port = null;

  this.TabPageUrl = null;
  this.TabTitle = null;
  this.WindowId = null;
  this.TabPid = null;

  this.LoggingEnabled = false;
  this.MsgLoggingEnabled = false;

  this.FrameRequestId = 0;

  // delegates defined in other files based on application
  this.OnInit = null;
  this.OnPortMessage = null;
  this.OnCreateTabInfo = null;

  this.Init = function(requestId)
  {
    var tabInfoRequest = new TabInfo();
    tabInfoRequest.Operation = Operation.GetTabInfo;
    tabInfoRequest.IsSync = false;

    chrome.extension.sendRequest(tabInfoRequest, function(response) {

      //try
      //{
        // Initialize the tab using data from background page
        scope.TabId = response.request.TabId;
        scope.MsgLoggingEnabled = response.request.MsgLoggingEnabled;
        scope.LoggingEnabled = response.request.LoggingEnabled;

        // Initialize a port and send data to background tab
        var tabInfo = scope.CreateTabInfo(new FrameInfo());
        tabInfo.RequestId = requestId;

        // Moved earlier to get it working more reliably (but initial message doesn't contain any audiosources and we send a separate msg for each audio source)
        scope.InitPortListener(tabInfo);

        if (scope.OnInit !== null) {
          scope.OnInit(response);
        } else
        {
          consolelog("scope.oninit not defined");
        }

      //} catch (ex)
      //{
        //_alertException ("GetTabInfo - " + ex);
      //}
    });
  };

  // Initializes a port connection with the background page to store information about this frame; gets the tabinfo from the background page, too
  this.InitPortListener = function(tabInfo)
  {
    scope.FrameRequestId = 0; // When this method is called, we need to reset this requestid
    consolelog("initportlistener - " + tabInfo.PortName);
    scope.Port = chrome.extension.connect({
      name: tabInfo.PortName
    });
    scope.Port.onMessage.addListener(function(msg) {
      if (scope.OnPortMessage !== null)
        scope.OnPortMessage(msg);
    });

    // Upon initialization, we send an empty tabinfo object to the background page via the port
    var storeRequest = tabInfo;
    storeRequest.Operation = Operation.Store;
    storeRequest.IsSync = false;
    storeRequest.RequestId = tabInfo.RequestId;
    scope.Port.postMessage({ request: storeRequest });
  };

  // Send back updated info (i.e. state may have changed or update may have found something)
  this.SendTabInfo = function(tabInfo, requestId)
  {
    tabInfo.Operation = Operation.Store;
    tabInfo.IsSync = false;
    tabInfo.RequestId = requestId;
    if ((typeof tabInfo.Frames === 'object') && (tabInfo.Frames.length > 0))
      tabInfo.Frames[0].FrameRequestId = scope.FrameRequestId;
    scope.FrameRequestId++;
    try {
      if (scope.Port !== null)
      {
        consolelog("****Updating background page with audio source information to port " + scope.Port.name);
        consolelog(tabInfo);
        scope.Port.postMessage({
          request: tabInfo
        });
      } else
      {
        consolelog("Port is null");
        consoleerror(tabInfo);
      }
    } catch (ex)
    {
      consoleerror(ex);
    }
  };

  // Generate a tabInfo for the current frame
  this.CreateTabInfo = function(frameInfo)
  {
    var tabInfo = new TabInfo();
    tabInfo.Frames = [];

    var frameInfoCopy = jQuery.extend(true, {}, frameInfo);

    tabInfo.Frames.push(frameInfoCopy);

    tabInfo.TabId = scope.TabId;
    tabInfo.TabPageUrl = scope.TabPageUrl;
    tabInfo.TabTitle = scope.TabTitle;
    tabInfo.WindowId = scope.WindowId;
    tabInfo.TabPid = scope.TabPid;

    tabInfo.Frames[0].IFrameId = document.URL + "_" + Math.floor(Math.random() * 100000000).toString(); // now ensuring this is unique (but it also means that if reloaded, the id will likely differ)

    var portName = tabInfo.TabId + "_" + tabInfo.Frames[0].IFrameId;
    if (portName.length > 80) // Really long portnames are annoying to debug and the IFrameId is only there to sometimes make it easier to distinguish.
      portName = portName.substr(0, 80);

    tabInfo.Frames[0].PortName = portName;
    tabInfo.PortName = portName;

    if (scope.OnCreateTabInfo !== null)
      tabInfo = scope.OnCreateTabInfo(tabInfo);

    return tabInfo;
  };

  // Perform actions on behalf of background page when we don't have a port.
  // This should only happen when the extension is restarted and we try to do an update all
  this.OnRequest = function(request, sender, sendResponse)
  {
      scope.Init(request.RequestId);
  };
};
_messaging.call(messaging);

chrome.extension.onRequest.addListener(messaging.OnRequest);
