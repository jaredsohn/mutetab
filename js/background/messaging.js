// messaging.js
// This file provides the guts of the extension from the background page perspective.
//
// Specifically, it:
// * Maintains an up-to-date list of information gathered by currently-opened tabs by using listeners for {connect, removed, tabchanged, and windowchanged}
// * Provides implementation for Show and Close and allows performing other operations via callbacks.

function consolelog(msg)
{
	if (Options.LoggingEnabled === true)
		console.log(msg);
}
function consolewarn(msg)
{
	if (Options.LoggingEnabled === true)
		console.warn(msg);
}
function msgconsolelog(msg){
	if (Options.MsgLoggingEnabled === true)
		console.log(msg);
}

var RequestInfo = function()
{
	this.PendingPortRequests = 0;											// # of ports we're waiting to hear from
	this.SyncIntervalName = '';												// name of our interval
	this.OperationCallBackIntervalCount = 0;					// # of intervals we'll wait to see if we got a response before timing out
	this.OperationCallBack = null;										// callback func and two params
	this.OperationCallBackParam1 = null;
	this.OperationCallBackParam2 = null;
};

Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

var messaging = messaging || {};
var _messaging = function(){
	var scope = this;

	this.ALLTABS = -100;
	this.ALLBUTCURRENTTAB = -200;
	this.BACKGROUNDAUDIOTABS = -300; //TODO: shouldn't be in messaging though
	this.UNKNOWNTABID = -400;

	this.TabLruList = [];
	this.TabInfoDict = {};

	//TODO: these are public and should be capitalized
	this._currentTabIdUnknown = true;
	this._prevSelectedTabId = -1;
	this._prevSelectedWindowId = -1;

	// Application-specific callbacks
	this.TabChangedCommon = null;
	this.OnStore = null;
	this.OnExcludedByUser = null;

	this._portDict = {};	// map portname to port

	this._requestInfoDict = {}; // map requestId to RequestInfo

	this._nextRequestId = 1;

	////////////////////////////////////////////////////////////////////////////////////////////////
	// Public methods
	////////////////////////////////////////////////////////////////////////////////////////////////
	this.GetTabInfoFor = function(tabId){
		var request = scope.TabInfoDict[tabId];
		if (typeof(request) === 'undefined') {
			request = new TabInfo();
			request.TabId = tabId;
			request.AllSourcesInTab = true;
		}
		return request;
	};

	this.MarkVisited = function(tabId){
		try {
			if (tabId === -1)
				return;

			var foundIndex = scope._getIndexInLru(tabId);
			if (foundIndex !== -1) {
				scope.TabLruList.splice(foundIndex, 1);
			}
			scope.TabLruList.splice(0, 0, tabId); // Add current tab at the beginning of the list.
		}
		catch (ex) {
			consolewarn('MarkVisited - ' + ex);
		}
	};

	this.InitRequest = function(request){
		var requestId = scope._nextRequestId + 0;
		scope._nextRequestId++;
		msgconsolelog('Created request #' + requestId + ' - ' + request.Operation + ' - tab #' + request.TabId);
		//msgconsolelog(request);
		request.RequestId = requestId;
	};

	this.InitTabInfo = function(tab)
	{
		var tabInfo = messaging.TabInfoDict[tab.id];
		if (typeof(tabInfo === 'undefined') || (tabInfo === null)) {
			tabInfo = scope.GetTabInfoFor(tab.id);
			messaging.TabInfoDict[tab.id] = tabInfo;
		}
		tabInfo.TabPageUrl = tab.url;
		tabInfo.TabTitle = tab.title;
		tabInfo.WindowId = tab.windowId;
		tabInfo.TabPid = tab.pid;
		tabInfo.TabId = tab.id;
		tabInfo.Incognito = tab.incognito;
		tabInfo.FavIconUrl = tab.favIconUrl;
	};

	this.OnRequestAsync = function(request) // bg, async
	{
		return scope._onRequest(request, null, null, null);
	};

	this.OnRequestSync = function(request, sendResponseFunc) // bg, sync; callback should have two params, where first is request
	{
		return scope._onRequest(request, null, null, sendResponseFunc);
	};

	/////////////////////////////////////////////////////////////
	// Listeners
	/////////////////////////////////////////////////////////////
	this.InitListeners = function(){
		chrome.extension.onConnect.addListener(messaging.OnConnect);
		chrome.tabs.onRemoved.addListener(messaging.OnRemoved);
		chrome.tabs.onSelectionChanged.addListener(messaging.OnTabChanged);
		chrome.windows.onFocusChanged.addListener(messaging.OnWindowChanged);
		chrome.extension.onRequest.addListener(messaging.OnRequestListener);
	};

	this.OnConnect = function(port){
//		return; //TODO: memorytest

		msgconsolelog('connect - ' + port.portId_ + "_" + port.name);

		port.onMessage.addListener(function(msg){
			//consolelog("OnMessage");
			//consolelog(msg);
			if ((typeof(msg.request) === 'undefined') || (typeof(msg.request.RequestId) === 'undefined')) // ignore prefs.get and others
				return;
			var requestInfo = scope._getRequestInfo(msg.request.RequestId);
			//consolelog('in onmessage, # port requests = ' + _pendingPortRequests[msg.request.RequestId]);
			if (requestInfo !== null)
				requestInfo.PendingPortRequests--;
			//consolelog('for request ' + msg.request.RequestId + ': pending = ' + _pendingPortRequests[msg.request.RequestId]);

			//try {
				var frameIndex;
				consolelog("msg.request:");
				consolelog(msg.request);

				//if (!ExtDialogBg.ActOnResponse(msg.request))
				{
					if (scope._messageIsValid(msg, port.portId_)) {
						for (frameIndex = 0; frameIndex < msg.request.Frames.length; frameIndex++) {
							msg.request.Frames[frameIndex].PortId = port.portId_;
							scope._portDict[msg.request.Frames[frameIndex].PortName] = port;
						}
						scope._store(msg.request);
					}
					else {
						consolelog("Not valid:" + port.portId_);
						consolelog(msg);
					}
				}
			//} catch (ex)
			//{
			//	consolelog("connect exception for message: ");
			//	consolelog(ex);
			//	consolelog(msg);
			//}
		});

		port.onDisconnect.addListener(function(port){
			if ((port.sender !== null) && (typeof(port.sender) !== 'undefined')) {
				if ((port.sender.tab !== null) && (typeof(port.sender.tab) !== 'undefined')) {
					msgconsolelog('disconnect - ' + port.portId_ + "_" + port.name);
					consolelog(port);
					scope._removeFrame(port.sender.tab.id, port.portId_);
				}
			}
		});
	};

	this.OnRemoved = function(tabId){
		consolelog("OnRemoved(" + tabId + ")");
		//console.log(tabId);
		//console.log(scope.TabInfoDict);
		delete scope.TabInfoDict[tabId];

		var i;
		for (i = 0; i < scope.TabLruList.length; i++) {
			if (scope.TabLruList[i].TabId === tabId) {
				scope.TabLruList.splice(i, 1);
				break;
			}
		}
	};

	this.OnTabChanged = function(tabId, selectInfo){
		if (scope._prevSelectedTabId === tabId) {
			delete scope.TabInfoDict[tabId]; //TODO: recently added (12/29/2011); assuming that it is already relaoding all pages
			consolelog('same as previous tabid');
			return;
		}

		if (scope.TabChangedCommon !== null)
			scope.TabChangedCommon(tabId);
	};

	this.OnWindowChanged = function(windowId){
		if (windowId !== -1) {
			if (scope._prevSelectedWindowId === windowId)
				return;

			scope._prevSelectedWindowId = windowId;

			chrome.tabs.getSelected(windowId, function(tab){
				if (scope.TabChangedCommon !== null)
					scope.TabChangedCommon(tab.id);
			});
		}
	};

	this.OnRequestListener = function(request, sender, sendResponse) // via listener (takes tab into account); signature matches chrome.extension.onRequest
	{
		consolelog("onrequestlistener");
		consolelog(request);
		return scope._onRequest(request, sender, sendResponse, scope._sendBackResponse);
	};

	////////////////////////////////////////////////////////////////////////////////////////////////
	// Private methods
	////////////////////////////////////////////////////////////////////////////////////////////////

	// Discard messages if received out of order.  Should happen less frequently since contentscript now queues up messages before sending
	this._messageIsValid = function(msg, portId){
		if (msg.request.Frames[0].FrameRequestId <= 0) // New frame
			return true;

		var isValid = false;
		var frameFound = false;

		var tabInfo = scope.TabInfoDict[msg.request.TabId];
		if ((typeof(tabInfo) !== 'undefined') && (tabInfo !== null)) {
			var frameIndex;
			for (frameIndex = 0; frameIndex < tabInfo.Frames.length; frameIndex++) {
				if (tabInfo.Frames[frameIndex].PortId === portId) {
					frameFound = true;
					//alert("is: " + (msg.request.Frames[0].FrameRequestId));
					//alert("was: " + (tabInfo.Frames[frameIndex].FrameRequestId));

					if ((tabInfo.Frames[frameIndex].FrameRequestId) < (msg.request.Frames[0].FrameRequestId)) {
						isValid = true;
						//alert("later request is valid!");
					} else
					{
						alert("later request is NOT valid!");
					}
					break;
				}
			}
		}
		if ((isValid || (frameFound === false)) === false)
		{
			consolelog("not valid. msg, portid, tabinfo:");
			consolelog(msg);
			consolelog(portId);
			consolelog(tabInfo);
		}

		return (isValid || (frameFound === false));
	};

	this._onRequest = function(request, sender, sendResponse, sendResponseFunc){
    //console.log("**************************** onrequest *********************");
    //console.log(request);
    //console.log(request.TabId);
		//if ((typeof(sender) !== 'undefined') && (typeof(sender.tab) !== 'undefined'))
    //	console.log(sender.tab.id);
		//console.log(sendResponse);
		//console.log(sendResponseFunc);

		request.IsSync = (sendResponseFunc !== null);

//		try {
			// Do some things only if message came via listener
			if ((sender !== null) && (typeof(sender) !== 'undefined')) {
				if ((sender.tab !== null) && (typeof(sender.tab) !== 'undefined')) {
					var existingTabInfo = scope.TabInfoDict[sender.tab.id];

					// Update TabId with current one if the request came from a contentscript
					if (sender.tab.id !== -1) {
						request.TabId = sender.tab.id;
					}
					scope.InitTabInfo(sender.tab);

					if (request.Operation === Operation.None)
						request.Operation = Operation.GetTabInfo;

					request.ForceScripting = Options.ForceScripting;
					request.ShowFlashMenu = Options.IncludeMenuForFlash;
					request.FlickerYouTubeVimeoEtc = Options.FlickerEnabled;
					request.LoggingEnabled = Options.LoggingEnabled;
					request.MsgLoggingEnabled = Options.MsgLoggingEnabled;
				}
			}
			//console.log("here1");
			//console.log(request);

			if (request.Operation !== Operation.GetTabInfo) {
				consolelog("____creating request for operation " + request.Operation);
				scope.InitRequest(request);
				var requestInfo = new RequestInfo();
				scope._requestInfoDict[request.RequestId] = requestInfo;
				requestInfo.OperationCallBack = sendResponseFunc;
				requestInfo.OperationCallBackParam1 = sendResponse;
				requestInfo.OperationCallBackParam2 = request;

				scope._handleOperationRequest(request);
			} else
			{
				sendResponseFunc(sendResponse, request); // Send back response with tabinfo.
			}
//		}
//		catch (ex) {
//			consolelog('onRequest - ' + ex);
//		}
	};

	this._sendBackResponse = function(sendResponse, request){
		sendResponse({
			request: request
		});
	};

	// This runs asynchronously. Turns 'all' + exclude list into a list of tabids and runs a func with a parameter on it
	this._operateOnAllTabs = function(request, excludeDict)
	{
		function getRequest() { return request; }
		function getExcludeDict() { return excludeDict; }

		chrome.tabs.query({}, function(tabList) {
			var tabIdList = [];

			// Remove entries with certain url patterns and those that are on the exclude list
			var tabIndex;
			for (tabIndex = 0; tabIndex < tabList.length; tabIndex++)
			{
				if (scope._isInternalUrl(tabList[tabIndex].url))
					continue;

				var excludeDict = getExcludeDict();
				if (excludeDict !== null)
				{
					if (typeof(excludeDict[tabList[tabIndex].id]) !== 'undefined')
						continue;
				}

				if (scope.OnExcludedByUser(tabList[tabIndex].id))
				{
					continue;
				}

				consolelog(tabList[tabIndex].id + " - " + tabList[tabIndex].url);

				tabIdList.push(tabList[tabIndex].id);
			}
			scope._operateOnTabIdList(getRequest(), tabIdList);
		});
	};

	this._operateOnTabIdList = function(operateOnAllRequest, tabIdList){
		//alert('_operateOnAll');
		//alert(tabIdList);
		//alert(tabIdList.length);
		//console.log("operateontabidlist operateonallrequest:");
		//console.log(operateOnAllRequest);

		if ((typeof(tabIdList) === 'undefined') || (tabIdList === null))
			tabIdList = [];

		var tabIndex;
		var frameCount = 0;

		//  _pendingPortRequests[operateOnAllRequest.RequestId] = tabIdList.length;
		//  consolelog('for request ' + operateOnAllRequest.RequestId + ' - pending = ' + tabIdList.length);
		for (tabIndex = 0; tabIndex < tabIdList.length; tabIndex++) {
			//alert(tabIndex);
//			try {
				request = scope.GetTabInfoFor(tabIdList[tabIndex]);
				request.Operation = operateOnAllRequest.Operation;
				request.IsSync = true;
				request.RequestId = operateOnAllRequest.RequestId;
				if (typeof(request.Frames) !== 'undefined') {
					frameCount += request.Frames.length;
				}
				scope._handleOperationRequest(request);
//			}
//			catch (ex) {
//				alert('_operateOnAll - ' + tabIndex + ' - ' + ex);
//			}

			//consolelog('total # of frames prior to update: ' + frameCount);
		}

		scope._cleanUpForRequest(operateOnAllRequest.IsSync, operateOnAllRequest.RequestId);
	};

	// request here is for tabinfo
	this._handleOperationRequest = function(request){

		if ((request === null) || (typeof(request.Operation) === 'undefined') || (request.Operation === null))
			return;

		var requestInfo = scope._getRequestInfo(request.RequestId);
		var operation = request.Operation;

		if (request.TabId === scope.ALLTABS) {
			scope._operateOnAllTabs(request, null);
		}
		else
			if (request.TabId === scope.ALLBUTCURRENTTAB) {
				var excludeDict = {};
				excludeDict[scope._prevSelectedTabId] = true;
				scope._operateOnAllTabs(request, excludeDict);
			}
			else {

				//console.log(request.Operation);
				//alert('_handleoperationrequest(not alltabs)');
				switch (operation) {
					case Operation.Close:
						try {
							chrome.tabs.remove(request.TabId, function callback(){
								scope._cleanUpForRequest(request.IsSync, request.RequestId);
							});
						} catch (ex)
						{
							consolelog("error in tab remove");
							consolelog(chrome.extension.lastError);
							scope.OnRemoved(request.TabId); // Force remove it (always for now)
						}
						break;
					case Operation.Show:
						scope._showTab(request.TabId);
						scope._cleanUpForRequest(request.IsSync, request.RequestId);
						break;
					case Operation.Store: // Store now happens via ports
						break;
					case Operation.MarkVisited:
						scope.MarkVisited(request.TabId);
						break;
					default:
						//consolelog("for request " + request.RequestId + " - " + request.TabId + ' - _handleOperationRequest frame count: ' + request.Frames.length);

						var frameCount = Object.size(request.Frames); // TODO: not sure why I need to do this instead of request.frames.length

						if (typeof(request.Frames) === 'undefined') {
							//consolelog('no frames');
							//consolelog(request);
							request.Frames = [];
						}
						if ((frameCount === 0)) // || (operation === Operation.Update))
						{
							if (requestInfo !== null)
								requestInfo.PendingPortRequests += frameCount;
							delete scope.TabInfoDict[request.TabId];

							//TODO: this code commented out in 9/13 because it would freeze Chrome (due to recent Chrome changes).  Lots of other dead code injection attempts removed (find in github)
							//consolelog("INJECTION!");
							//InjectJS("var DisallowScriptChangesOverride = true; /*console.log('injected');*/", request.TabId, scope.InjectContentScriptsAsync, request.TabId);
						}
						else {
//								console.log("***request.Frames size = " + Object.size(request.Frames));

//								consolelog("iterating frames!");
							for (frameIndex = frameCount - 1; frameIndex >= 0 ; frameIndex--) {
								try {
									var operationRequest = new FrameInfo();
									operationRequest.Operation = operation;
									operationRequest.AudioSources = owl.deepCopy(request.Frames[frameIndex].AudioSources);

									operationRequest.AllSourcesInFrame = request.AllSourcesInTab;
									operationRequest.RequestId = request.RequestId;
									var port = scope._portDict[request.Frames[frameIndex].PortName];
									if ((typeof(port) !== 'undefined') && (port !== null)) //TODO: otherwise, should contact tab in the old way
									{
										try {
											port.postMessage(operationRequest);
										} catch (ex)
										{
											// We remove ports that we can't send messages to.  Hopefully this only happens upon a crash (when this is desired behavior.)
											scope._removeFrame(request.TabId, request.Frames[frameIndex].PortId);
										}
										if (requestInfo !== null)
											requestInfo.PendingPortRequests++;
									//consolelog('updated pendingportrequests for request ' + request.RequestId + ' - ' + _pendingPortRequests[request.RequestId]);
									}
									else // this shouldn't happen
									{
										msgconsolelog('no port for ' + request.Frames[frameIndex].PortName);
									}
								}
								catch (ex) {
									msgconsolelog("for request " + request.RequestId + " - " + request.TabId + " - _handleOperationRequest - " + request.Frames[frameIndex].PortName + ' - ' + ex);
									scope._removeFrame(request.TabId, request.Frames[frameIndex].PortId); //TODO
								}
							}
						//chrome.tabs.sendRequest(request.TabId, request, function(response) { });
						}
						scope._cleanUpForRequest(request.IsSync, request.RequestId);
					}
				}
//		}
//		catch (ex) {
//			consolelog("_handleOperationRequest - " + ex);
//		}
	};

	this._removeFrame = function(tabId, portId) {
		consolelog("_removeFrame(" + tabId + ", " + portId + ")");
		var tabInfo = scope.TabInfoDict[tabId];
		//consolelog("Remove frame for tabId " + tabId);
		//consolelog(tabInfo);
		//consolelog(portId);
		if ((typeof(tabInfo) !== 'undefined') && (tabInfo !== null)) {
			var frameIndex;
			for (frameIndex = 0; frameIndex < tabInfo.Frames.length; frameIndex++) {
				if (tabInfo.Frames[frameIndex].PortId === portId) {
					try {
						delete scope._portDict[tabInfo.Frames[frameIndex].PortName];
					} catch (ex)
					{}
					//consolelog("removing for tabId " + tabId + " frame index " + frameIndex);
					consolelog("remove match found");
					tabInfo.Frames.splice(frameIndex, 1);
					break;
				}
			}
		}
		//TODO: add to discarded dict instead for use in future lookup instead of garbage collecting it
	};

	this._getIndexInLru = function(tabId){
		var i;
		var foundIndex = -1;
		for (i = 0; i < scope.TabLruList.length; i++) {
			if (scope.TabLruList[i] === tabId) {
				foundIndex = i;
				break;
			}
		}

		return foundIndex;
	};

	this._isInternalUrl = function(url)
	{
		try
		{
			if (url.lastIndexOf("chrome://", 0) === 0)
				return true;
			if (url.lastIndexOf("chrome-extension://", 0) === 0)
				return true;
			if (url.lastIndexOf("data:text/html", 0) === 0)
				return true;
			if (url.lastIndexOf("chrome-devtools://", 0) === 0)
				return true;
			if (url.lastIndexOf("about://", 0) === 0)
				return true;
		} catch (ex)
		{}

		return false;
	};

	this._checkIfAllResponsesOccurred = function(requestId){
		//consolelog('checking status...' + _operationCallBackIntervalCount);

		var requestInfo = scope._getRequestInfo(requestId);
		var done = false;

		if (requestInfo.PendingPortRequests <= 0) {
			msgconsolelog('for request ' + requestId + ': all responses received');
			done = true;
		}
		if ((done === false) && (requestInfo.OperationCallBackIntervalCount <= 0))
		{
			msgconsolelog('for request ' + requestId + ': timing out');
			done = true;
		}
		if (done === true)
		{
			try {
				if ((typeof(requestInfo.OperationCallBack) !== 'undefined') && (requestInfo.OperationCallBack !== null)) {
					requestInfo.OperationCallBack(requestInfo.OperationCallBackParam1, requestInfo.OperationCallBackParam2);
				}
			}
			catch (ex) {
				consolelog('_checkIfAllResponsesOccurred: ' + ex);
			}
			scope._cleanUpForRequest(false, requestId);
		}
		else {
			msgconsolelog('for request ' + requestId + ' - remaining requests = ' + requestInfo.PendingPortRequests);
			requestInfo.OperationCallBackIntervalCount--;
		}
	};

	this._getRequestInfo = function(requestId)
	{
		if (requestId === -1)
			return null;

		var requestInfo;
		if ((typeof(scope._requestInfoDict[requestId]) !== 'undefined') && (scope._requestInfoDict[requestId] !== null))
		{
			requestInfo = scope._requestInfoDict[requestId];
		} else
		{
			consolelog("couldn't find requestid " + requestId + " (okay if doing a store for an async operation or if timed out) ");
			requestInfo = null;
		}

		return requestInfo;
	};

	// We clean up differently if sync vs. async.  For sync, we have to wait for a response and then call the callback.
	this._cleanUpForRequest = function(isSync, requestId)
	{
		consolelog("_cleanupforrequest(" + isSync + ',' + requestId + ")");

		var requestInfo = scope._getRequestInfo(requestId);
		if (requestInfo === null)
			return;

		if (isSync === false)
		{
			clearInterval(requestInfo.SyncIntervalName);
			delete scope._requestInfoDict[requestId];
			consolelog("clearing request #" + requestId);
			consolelog(scope._requestInfoDict[requestId]);
		} else
		{
			if ((typeof(requestInfo.SyncIntervalName) !== 'undefined') && (requestInfo.SyncIntervalName !== null) && (requestInfo.SyncIntervalName !== ''))
				return; // Don't init the interval if it already exists.  Often will happen when a request is divided into smaller requests

			requestInfo.OperationCallBackIntervalCount = 275; //used to be 25; issue if too short: if you perform an operation it might not refresh quickly enough
			clearInterval(requestInfo.SyncIntervalName);
			requestInfo.SyncIntervalName = setInterval(function() { messaging._checkIfAllResponsesOccurred(requestId); }, 25);
		}
	};


////////////////////////////////////////////////////////////////////////
// Operations
////////////////////////////////////////////////////////////////////////

	this._showTab = function(tabId){
		//TODO: in case this was unlikely run in parallel, use a closure
		chrome.windows.getCurrent(function(w){
			try {
				chrome.tabs.update(tabId, {
					'selected': true
				}); // Change tab
				var tabInfo = scope.TabInfoDict[tabId];

				if (tabInfo.WindowId !== w.id) {
					chrome.windows.update(tabInfo.WindowId, {
						'focused': true
					}, function callback(){ // Change window
					});
				}
			} catch (ex)
			{
				consolelog("error in performing show");
				consolelog(chrome.extension.lastError);
				scope.OnRemoved(tabId); // Force remove it (always for now)
			}
		});
	};

	this._store_busy = false;
	// Add/update tabinfo
	// For now, this seems to assume that tabinfo contains full information for a frameinfo.  so if just a single audio source diseappears, it is necessary to send the current status of the frame info.
	// This just means that the message size will often be larger than necessary, but simplifies the coding a bit.
	this._store = function(tabInfo){
		scope._cleanUpTabInfo(tabInfo);

		msgconsolelog("_____store - " + tabInfo.TabPageUrl + " - " + tabInfo.Frames[0].PortId + "_" + tabInfo.Frames[0].PortName + ":");
		msgconsolelog(tabInfo);
		if (scope._store_busy === true) // check if we have multiple 'threads' running here simultaneously.
		{
			consolelog("busy!"); // this should only happen if alerts are added to this method, an uncaught exception occurs, or due to debugging (i.e. showing an 'alert' dialog or using a breakpoint)
			return;
		}

		scope._store_busy = true;
		try {
			var frameIndex;
			for (frameIndex = 0; frameIndex < tabInfo.Frames.length; frameIndex++) {
				// Update audiosources to include information about the tab and frame
				var audioSourceIndex;
				for (audioSourceIndex = 0; audioSourceIndex < tabInfo.Frames[frameIndex].AudioSources.length; audioSourceIndex++) {
					tabInfo.Frames[frameIndex].AudioSources[audioSourceIndex].TabId = tabInfo.TabId;
					tabInfo.Frames[frameIndex].AudioSources[audioSourceIndex].TabPageUrl = tabInfo.TabPageUrl;
					tabInfo.Frames[frameIndex].AudioSources[audioSourceIndex].IFrameId = tabInfo.Frames[frameIndex].IFrameId;
					tabInfo.Frames[frameIndex].AudioSources[audioSourceIndex].PortName = tabInfo.Frames[frameIndex].PortName;
				}
			}

			var storedTabInfo = scope.TabInfoDict[tabInfo.TabId];
			if (typeof(storedTabInfo) === 'undefined') {
				scope.TabInfoDict[tabInfo.TabId] = tabInfo;
				storedTabInfo = scope.TabInfoDict[tabInfo.TabId];
//				consolelog('a');
			}
			else {
//				consolelog("StoredTabInfo: " + storedTabInfo.Frames.length);
//				consolelog(storedTabInfo.Frames);
				//if (storedTabInfo.TabPageUrl === tabInfo.TabPageUrl) {
//					consolelog("framecount being added: " + tabInfo.Frames.length);
//					consolelog("framecount from before: " + storedTabInfo.Frames.length);

					//TODO: copy over information about default operation(s)
					if (tabInfo.AllSourcesInTab === true) {
						if ((tabInfo.Operation === Operation.Block) || (tabInfo.Operation === Operation.Unblock)) { //TODO: support more operations
							storedTabInfo.AllSourcesInTab = true;
							storedTabInfo.Operation = tabInfo.Operation; //TODO: should only do this if relevant operation; don't want to overwrite what's there
						}
					}
					for (frameIndex = 0; frameIndex < tabInfo.Frames.length; frameIndex++) {
//						consolelog('handling from port:' + tabInfo.Frames[frameIndex].PortName);
						// Remove old results for the current frame and replace it

						var foundFrame = false;

						for (storedFrameIndex = storedTabInfo.Frames.length - 1; storedFrameIndex >= 0; storedFrameIndex--) {
							if (storedFrameIndex < 0)
								break;
//							consolelog('beginloop');
//							consolelog('storedFrameIndex = ' + storedFrameIndex + ', ' + 'frameIndex = ' + frameIndex);
							try {
//								consolelog(storedTabInfo.Frames[storedFrameIndex].IFrameId);
//								consolelog(trim(tabInfo.Frames[frameIndex].IFrameId));
								if (storedTabInfo.Frames[storedFrameIndex].PortId === tabInfo.Frames[frameIndex].PortId) {
//									consolelog('*');
//									consolelog('removing for tabid ' + tabInfo.TabId + ' and port ' + tabInfo.Frames[frameIndex].PortId);
//									consolelog('count was: ' + storedTabInfo.Frames.length);
									consolelog("Replacing frame ");
									consolelog(storedTabInfo.Frames[storedFrameIndex]);
									storedTabInfo.Frames.splice(storedFrameIndex, 1); // remove the element
//									consolelog('count is: ' + storedTabInfo.Frames.length);
//									consolelog('adding for tabid ' + tabInfo.TabId + ' and frameid ' + tabInfo.Frames[frameIndex].IFrameId);
									storedTabInfo.Frames.push(tabInfo.Frames[frameIndex]);
									consolelog("with: ");
									consolelog(tabInfo.Frames[frameIndex]);

									foundFrame = true;
									break;
								}
								else {
//									consolelog('!!');
								}
							}
							catch (ex) {
								consolewarn('store removal exception - ' + ex);
							}
						}

						if (foundFrame === false) {
							storedTabInfo.Frames.push(tabInfo.Frames[frameIndex]);
							consolelog("New frame: ");
							consolelog(tabInfo.Frames[frameIndex]);
						}
					}
					scope.TabInfoDict[tabInfo.TabId] = storedTabInfo;
			}

			//consolelog('store: frame count after store for tab ' + storedTabInfo.TabPageUrl + ': ' + storedTabInfo.Frames.length);
			//consolelog('#frames in store: ' + storedTabInfo.Frames.length);

			//Check if LRU contains it and add it if not
			var indexInLru = scope._getIndexInLru(storedTabInfo.TabId);
			if (indexInLru === -1) {
				scope.TabLruList.push(storedTabInfo.TabId);
			}

			if (scope.OnStore !== null)
				scope.OnStore(tabInfo, storedTabInfo);

			scope._store_busy = false;
			//consolelog('store end');

		}
		catch (ex) {
			consolewarn('Store - ' + ex); // + '-' + lineMarker);
		}
	};

	this._cleanUpTabInfo = function(tabInfo)
	{
		if (typeof(tabInfo.Frames) === 'undefined') {
			tabInfo.Frames = [];
		}
		var z;
		for (z = 0; z < tabInfo.Frames.length; z++)
		{
			if (typeof(tabInfo.Frames[z].AudioSources) === 'undefined')
			{
				tabInfo.Frames[z].AudioSources = [];
			}
		}
	};
};

_messaging.call(messaging);
