// This file creates JSON that describes data to be displayed.  Run from background page.
// TODO: perhaps add an entry for audio based on URL (i.e. grooveshark, etc.)

var _options = null;
var _callback = null;

// This accumulates data to be displayed in popup, dialog, or mixer
GetDisplayInfo = function(options, callback)
{
  _options = options;
  _callback = callback;
//  consolelog("_currentTabIdUnknown");
//  consolelog(_currentTabIdUnknown);
  // ideally shouldn't do markvisited here but want to ensure that this always happens before displaying information
  if (messaging._currentTabIdUnknown === true)
    chrome.tabs.getSelected(null, _getDisplayInfo);
  else {
    var tab = {};
    if (messaging.TabLruList.length > 0)
      tab.id = messaging.TabLruList[0];
    else
      tab.id = messaging.UNKNOWNTABID;
    _getDisplayInfo(tab);
  }
};

_getDisplayInfo = function(tab)
{
//  consolelog("_getdisplayinfo");
//  consolelog(tab);
//  consolelog("done");
  var tabId = messaging.UNKNOWNTABID;
  if (typeof tab !== 'undefined')
    tabId = tab.id;
  messaging.MarkVisited(tabId);

  var displayInfo = {};
  if (messaging.TabLruList.length > 0) {
    //alert(messaging.TabLruList[0]);
    displayInfo.CurrentTabInfo = GetDisplayTabInfos([messaging.TabLruList[0]], false, _options);
  }
  else
    displayInfo.CurrentTabInfo = [];

  displayInfo.AllOtherTabInfo = GetDisplayTabInfos([messaging.ALLBUTCURRENTTAB], false, _options);
  displayInfo.AllTabInfo = GetDisplayTabInfos([messaging.ALLTABS], false, _options);
  displayInfo.OtherIndividualTabInfos = GetDisplayTabInfos(GetOtherTabIds(), true, _options);
  displayInfo.BackgroundTabInfo = GetDisplayTabInfos(messaging.BACKGROUNDAUDIOTABS, false, _options); //TODO: this won't work yet...
  displayInfo.Options = _options; //TO_DO: maybe don't pass them all along; code also needs to verify options are defined before using them
  displayInfo.ImageBaseUrl = chrome.extension.getURL('');

//  consolelog("finishing...");
//  consolelog(displayInfo);
//  consolelog(_callback);
  _callback(displayInfo);
};

GetOtherTabIds = function()
{
  if (messaging.TabLruList.length < 2)
    return [];

  return messaging.TabLruList.slice(1);
};

// Get data ready for display.  Will preformat strings to simplify logic of JavaScript on display page.
GetDisplayTabInfos = function(tabIds, requireAudioSources, options) // tabids should be in display order.
{
  var displayTabInfos = [];
  var tabIdIndex;
  for (tabIdIndex = 0; tabIdIndex < tabIds.length; tabIdIndex++)
  {
    var displayTabInfo = new TabDisplayInfo();
    displayTabInfo.TabId = tabIds[tabIdIndex];

    switch (tabIds[tabIdIndex])
    {
      case messaging.ALLBUTCURRENTTAB:
      case messaging.ALLTABS:
      case messaging.BACKGROUNDAUDIOTABS:
        if (tabIds[tabIdIndex] === messaging.ALLBUTCURRENTTAB)
          displayTabInfo.FriendlyName = 'All other tabs';
        else if (tabIds[tabIdIndex] === messaging.ALLTABS)
          displayTabInfo.FriendlyName = 'All tabs';
        else if (tabIds[tabIdIndex] === messaging.BACKGROUNDAUDIOTABS)
          displayTabInfo.FriendlyName = 'Background music (or videos)';
        displayTabInfo.Operations = GetAllowedOperationsForTabId(tabIds[tabIdIndex], true, options);
        displayTabInfo.AudioSources = [];
        break;

      default:
        var tabInfo = messaging.TabInfoDict[tabIds[tabIdIndex]];
        if ((typeof tabInfo === 'undefined') || (tabInfo === null))
          continue;

        displayTabInfo.FriendlyName = '<b>' + GetHtmlForTruncatedUrl(tabInfo.TabPageUrl, false, tabInfo.TabId) + '</b>: ' + tabInfo.TabTitle;
//        displayTabInfo.FriendlyName = GetHtmlForTruncatedUrl(tabInfo.TabPageUrl, false, tabInfo.TabId) + ': ' + tabInfo.TabTitle;
        displayTabInfo.FullUrl = tabInfo.TabPageUrl;
        displayTabInfo.Title = tabInfo.TabTitle;
        displayTabInfo.Operations = GetAllowedOperationsForTabId(tabInfo.TabId, false, options);
        displayTabInfo.AudioSources = [];
        var frameIndex;
        for (frameIndex = 0; frameIndex < tabInfo.Frames.length; frameIndex++)
        {
          var audioSourceIndex;
          for (audioSourceIndex = 0; audioSourceIndex < tabInfo.Frames[frameIndex].AudioSources.length; audioSourceIndex++)
          {
            var audioSource = tabInfo.Frames[frameIndex].AudioSources[audioSourceIndex];
            var audioSourceDisplayInfo = new AudioSourceDisplayInfo();

            audioSourceDisplayInfo.Id = audioSource.Id;
            audioSourceDisplayInfo.AudioSourceType = audioSource.AudioSourceType;
            audioSourceDisplayInfo.AudioSourceTypeImageUrl = GetAudioSourceTypeImageUrl(audioSource.AudioSourceType);
            audioSourceDisplayInfo.FriendlySrc = GetAudioSourceFriendlySrc(audioSource);
            audioSourceDisplayInfo.Src = audioSource.Src;
            audioSourceDisplayInfo.CanMuteSafe = OperationSupportedForAudioSourceType(audioSource.AudioSourceType, Operation.SmartMuteSafe, options);
            audioSourceDisplayInfo.Operations = GetAllowedOperationsForAudioSource(audioSource, options);
            audioSourceDisplayInfo.Blocked = audioSource.Blocked;
            audioSourceDisplayInfo.FrameIndex = frameIndex;
            audioSourceDisplayInfo.FrameAudioSourceIndex = audioSourceIndex; //TODO: should perhaps include id here, too (otherwise if audio source order changes, it will behave on the wrong sound)

            displayTabInfo.AudioSources.push(audioSourceDisplayInfo);
          }
        }
        break;
    }
    if ((requireAudioSources === false) || (displayTabInfo.AudioSources.length > 0)) //TODO: should still return results if current tab id
      displayTabInfos.push(displayTabInfo);
  }

  return displayTabInfos;
};

GetAudioSourceTypeImageUrl = function(audioSourceType)
{
  var fileName = "";
  if (typeof audioSourceType === 'undefined')
    fileName = chrome.extension.getURL('src/img/audiosourcetypes/unknown.png');
  else {
    fileName = chrome.extension.getURL('src/img/audiosourcetypes/' + audioSourceType.toLowerCase());
    if ((audioSourceType.toLowerCase() === 'dailymotion') || (audioSourceType.toLowerCase() === 'realplayer'))
      fileName += '.jpg';
    else
      fileName += '.png';
  }

  return fileName;
};

// Return the domain name only.  Don't show www if that is the first part.
GetDomainNameFromUrl = function(url)
{
  if ((typeof url === 'undefined') || (url === null))
    return "";
  var parts = url.split("/");
  if (parts.length < 3)
    return url;
  else
  {
    var periodIndex = parts[2].indexOf('www.');
    if (periodIndex === 0)
      return parts[2].substring(4);

    return parts[2];
  }
};

GetFileNameFromUrl = function(url)
{
  if ((typeof url === 'undefined') || (url === null))
    return "";

  var parts = url.split(/[&?]/);
  if (parts.length >= 1)
  {
    var fullPath = parts[0];
    //console.log(fullPath);
    var parts2 = fullPath.split('/');
    //console.log(parts2);
    if (parts2.length >= 1) {
      return parts2[parts2.length - 1];
    }
  }

  return null;
};

GetAudioSourceFriendlySrc = function(audioSource) {
  var src = '';

  var trimmed = audioSource.Src.trim();
  if ((trimmed !== '') && (trimmed !== "(object)") && (trimmed !== "(embed)")) {
    src = GetHtmlForTruncatedUrl(audioSource.Src, true, null);
  }
  else {
    var classid = "";
    if ((audioSource.AudioSourceType === "Unknown") || (audioSource.AudioSourceType === "UnknownObject") || (audioSource.AudioSourceType === "UnknownEmbed"))
      classid = audioSource.ClassId + " ";

    var id = audioSource.Id;
    if (typeof audioSource.OrigId !== 'undefined')
      id = audioSource.OrigId;

    src = classid + id;

    if (audioSource.Src.indexOf('(object)') === 0)
      src = '(object) ' + src;

    if (audioSource.Src.indexOf('(embed)') === 0)
      src = '(embed) ' + src;
  }

  return src;
};

GetHtmlForTruncatedUrl = function(url, showFileName, tabId)
{
  if ((typeof url === 'undefined') || (url === null))
    url = '(unknown)';

  var sourceString = GetDomainNameFromUrl(url);
  if (showFileName === true) {
    var fileName = GetFileNameFromUrl(url);
    if ((fileName !== null) && (fileName !== sourceString))
      sourceString += ', ' + fileName;
  }
  sourceString = sourceString.replace('(embed) ', '');
  sourceString = sourceString.replace('(object) ', '');

  if (url.indexOf('(object)') === 0)
    sourceString = '(object) ' + sourceString;

  if (url.indexOf('(embed)') === 0)
    sourceString = '(embed) ' + sourceString;

    var onClick = '';
/*  if (tabId !== null)
  {
    onClick = 'onClick="OperateOnTab(' + tabId + ', \'' + 'Show' + '\', true)';
  }
  console.log("onclick:");
  console.log(onClick);*/

    return sourceString;
//TODO  return '<a ' + onClick + ' title="' + url +'">' + sourceString  + '</a>';
};
