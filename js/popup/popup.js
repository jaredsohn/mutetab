var bg = chrome.extension.getBackgroundPage();

function consolelog(msg)
{
  if (bg.Options.EnableLogging === true)
   console.log(msg);
}

window.onload = function() {
  if (bg.Options.UpdateOnPopup === true) {
    // This code does an updateall every time the popup is shown, so that we get latest information.
    // Would be great if we used mutation events in the contentscript and removed this, especially since this can cause the UI to seem slow.
    _operateCallback = init2;
    OperateOnTab(bg.messaging.ALLTABS, Operation.Update, true);
  }
  else {
    init2();
  }
};

function init2()
{
  _operateCallback = OperateOnTab_CallBack;
  bg.GetDisplayInfo(bg.Options, OnDisplayInfo);
}

function OnDisplayInfo(displayInfo)
{
  console.log("OnDisplayInfo");
  //  bg._displayInfo = displayInfo; //TODO: temporarily cache to better measure memory usage
  var output = '';

  output += '<div id="wrap>';
  output += '  <div id="header">';
  output += '  <b>Tabs that are possibly making sound</b>';
  output += '  <div id="toprightmenu" style="text-align: right; width=25%; float: right; margin-bottom: 6px; }">';
  output += '  <a href="#" id="updateall" class="button" >refresh</a>';
//  output += '  &nbsp;&nbsp;<a id="options"  class="button" href="#">options</a>';
  output += '  &nbsp;&nbsp;<a href="#" class="button" id="documentation" href="#">documentation</a>';
  output += '  &nbsp;&nbsp;';
  output += '  </div>'; //header
  output += '  <hr>';
  output += '  <div id="main" style="padding : 0px; padding: 0px; max-height: 300px; overflow : auto; ">';
  output += getSoundStatusHtml(displayInfo);
  output += '  </div>';
  output += '</div>'; // wrap
  output += '<div id="footer" class="footer">';
  output += '  <hr>';
  output += '  <div id="bottom menu" class="mutetabbottomlinks">';
  output += '  <a href="#" class="button" id="muteall">stop all tabs</a>&nbsp;&nbsp;';
  output += '  <a href="#" class="button" id="mutebackground">stop background tabs</a>&nbsp;&nbsp;';
  output += '  <a href="#" class="button" id="showblocked">' + ((bg.Options.ShowBlocked === true) ? 'hide' : 'show') + ' stopped</a>';
  output += '  <div id="bottomrightmenu" style="text-align: right; width=25%; float: right">';
  output += '    <a href="#" class="button" id="toggleautomute">' + ((bg.Options.AutoStopMode === true) ? 'Disable' : 'Enable') + ' autostop background tabs</a>&nbsp;&nbsp;';
  output += '  </div>'; //bottomrightmenu
  output += '  </div>'; // bottommenu
  output += '</div>'; //footer

  document.getElementById('dynamicText').innerHTML = output;

  CreateEventListeners(displayInfo);

  // If something was expanded last time popup was displayed, expand it again
  Expand(bg.Options.ExpandTabId);
}

var CreateEventListeners = function(displayInfo)
{
  //console.log("createeventlisteners");
  //console.log(displayInfo);

  document.getElementById("updateall").addEventListener("click", function(evt) { OperateOnTab(bg.messaging.ALLTABS, Operation.Update, true); });
//  document.getElementById("options").addEventListener("click", function(evt) { window.open(chrome.extension.getURL("/src/js/options.html")); } );
  document.getElementById("documentation").addEventListener("click", function(evt) { window.open("http://www.mutetab.com/mutetabdoc.html"); });
  document.getElementById("showblocked").addEventListener("click", function(evt) { bg.Options.ShowBlocked = !bg.Options.ShowBlocked; bg.SaveOptions(bg.Options); location.reload(); });
  document.getElementById("muteall").addEventListener("click", function(evt) { OperateOnTab(bg.messaging.ALLTABS, Operation.SmartMute, true); });
  document.getElementById("toggleautomute").addEventListener("click", function(evt) { bg.Options.AutoStopMode = !bg.Options.AutoStopMode; bg.SaveOptions(bg.Options); if (bg.Options.AutoStopMode === true) { OperateOnTab(bg.messaging.ALLBUTCURRENTTAB, Operation.SmartMute, true); } else { location.reload(); } });
  document.getElementById("mutebackground").addEventListener("click", function(evt) { OperateOnTab(bg.messaging.ALLBUTCURRENTTAB, Operation.SmartMute, true); });

  CreateEventListenersForTabs(displayInfo.CurrentTabInfo);
  CreateEventListenersForTabs(displayInfo.OtherIndividualTabInfos);

  var ops = document.getElementsByClassName("operation");
  var i;
  if ((typeof(ops) !== 'undefined') && (ops !== null))
  {
    for (i = 0; i < ops.length; i++)
    {
      var frameIndex = -1;
      var tabId = -1;
      var operationName = "";

      var opStr = ops[i].id;
      opStrArray = opStr.split("_");

      if (opStrArray.length === 3)
      {
        frameIndex = opStrArray[2];
      }
      if (opStrArray.length >= 2)
      {
        operationName = opStrArray[0];
        tabId = opStrArray[1];
      }

      (function() {
        var id = tabId;
        var opName = operationName;
        var frIndex = frameIndex;
        if (opStrArray.length === 3)
        {
          ops[i].addEventListener("click", function(evt) { OperateOnTab(id, opName, false); });
        } else if (opStrArray.length === 2)
        {
          ops[i].addEventListener("click", function(evt) { OperateOnTab(id, opName, frIndex, false); });
        }
      })();
    }
  }
};

var CreateEventListenersForTabs = function(tabInfos)
{
  for (i = 0; i < tabInfos.length; i++)
    CreateEventListenersForTab(tabInfos[i]);
};

var CreateEventListenersForTab = function(tabInfo)
{
  //console.log("createeventlistenersfortab");
  //console.log(tabInfo);
  var tabId = tabInfo.TabId;
  var el = document.getElementById('collapseexpandfortab_' + tabInfo.TabId);

  // Ignore if element doesn't exist (such as if it is blocked and blocked tabs are hidden)
  if ((typeof(el) !== 'undefined') && (el !== null))
  {
    el.addEventListener("click", function(evt) { if (bg.Options.ExpandTabId === tabId) { Collapse(tabId); } else { Expand(tabId); } });
    document.getElementById('showTabImage_' + tabInfo.TabId).addEventListener("click", function(evt) { OperateOnTab(tabId, Operation.Show, true); });
    document.getElementById('showTabText_' + tabInfo.TabId).addEventListener("click", function(evt) { OperateOnTab(tabId, Operation.Show, true); });
  }
};
