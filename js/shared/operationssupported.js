var allOperationsDetailed = new Array(Operation.SmartMute, Operation.SmartMuteSafe, Operation.Restore, Operation.Play, Operation.MultiframePlay, Operation.Pause, Operation.MultiframePause, Operation.Stop, Operation.Mute, Operation.Unmute, Operation.Block, Operation.Unblock);
var allOperationsBasic = new Array(Operation.SmartMute, Operation.SmartMuteSafe, Operation.Restore, Operation.MultiframePlay, Operation.MultiframePause); //play/pause should show only for flash

GetAllowedOperationsForAudioSource = function(audioSource, options)
{
  var allowedOperations;
  if (options.ShowDetailedOperations)
    allowedOperations = allOperationsDetailed;
  else
    allowedOperations = allOperationsBasic;

  var opIndex;
  var supportedOperationsArray = [];
  for (opIndex = 0; opIndex < allowedOperations.length; opIndex++)
  {
    var op = allowedOperations[opIndex];
    if (OperationSupportedForAudioSourceType(audioSource.AudioSourceType, op, options) === true) {
      if ((audioSource.IFrameAncestors.length > 0) && (OperationAlwaysSupported(op) === false))
        continue;

      if (OperationSupportedForState(audioSource, op, options) === true)
        supportedOperationsArray.push(op);
    }
  }

  return supportedOperationsArray;
};

GetAllowedOperationsForTabId = function(tabId, excludeShow, options)
{
  var allowedOperations = [];

  if (((tabId !== messaging.ALLTABS) && (tabId !== messaging.ALLBUTCURRENTTAB)) && (excludeShow === false))
  {
    allowedOperations.push(Operation.Show);
  }

  var mainOperationsList;
  if (options.ShowDetailedOperations === true)
    mainOperationsList = allOperationsDetailed;
  else
    mainOperationsList = allOperationsBasic;

  var tabInfo = null;
  if (tabId >= 0)
  {
    tabInfo = messaging.TabInfoDict[tabId];
	//consolelog(tabInfo);
  }
//consolelog(tabId);
//consolelog(tabInfo);
  var operationIndex;
  for (operationIndex = 0; operationIndex < mainOperationsList.length; operationIndex++)
  {
    if (options.ShowMultiFrameFlashOperations !== true)
    {
      if ((mainOperationsList[operationIndex] === Operation.MultiframePlay) || (mainOperationsList[operationIndex] === Operation.MultiframePause))
        continue;
    }

    if ((typeof tabInfo !== 'undefined') && (tabInfo !== null)) // we leave all operations available for all tabs and all but current
    {
      if (!OperationSupportedForTabInfo(tabInfo, mainOperationsList[operationIndex], options))
        continue;
    }

    allowedOperations.push(mainOperationsList[operationIndex]);
  }
  allowedOperations.push(Operation.Close);

  //consolelog(allowedOperations);
  return allowedOperations;
};


// Returns true iff the operation is supported for at least one audio source on a tab
//TODO: current logic is that operation shows if useful for one source. could change it to only when useful for all sources
OperationSupportedForTabInfo = function(tabInfo, operation, options)
{
  try
  {
    // These are supported even if no audiosources
    switch (operation)
    {
        case Operation.Update:
        case Operation.Show:
        case Operation.Close:
          return true;
    }
    var frameIndex = 0;
    for (frameIndex = 0; frameIndex < tabInfo.Frames.length; frameIndex++)
    {
      for (audioSourceIndex = 0; audioSourceIndex < tabInfo.Frames[frameIndex].AudioSources.length; audioSourceIndex++)
      {
        var audioSource = tabInfo.Frames[frameIndex].AudioSources[audioSourceIndex];
        var audioSourceType = audioSource.AudioSourceType;

        if (OperationSupportedForAudioSourceType(audioSourceType, operation, options))
        {
          if ((audioSource.IFrameAncestors.length > 0) && (OperationAlwaysSupported(operation) === false))
            continue;

          if (OperationSupportedForState(audioSource, operation, options) === true) {
            return true;
          }
        }
      }
    }
  } catch (ex)
  {
    consolelog('OperationSupportedForTabInfo - ' + ex);
  }
  return false;
};

OperationAlwaysSupported = function(operation)
{
  // These operations are supported for all audio source types
  var supported = false;
  switch (operation)
  {
      case Operation.Update:
      case Operation.Show:
      case Operation.Close:
         supported = true;
  }

  return supported;
};

OperationAlwaysSupportedAssumingState = function(operation)
{
  // These operations are supported for all audio source types if they are also supported for the current state
  var supported = false;
  switch (operation)
  {
      case Operation.Restore:
      case Operation.Block:
      case Operation.Unblock:
         supported = true;
  }

  return supported;
};

OperationSupportedForAudioSourceType = function(audioSourceType, operation, options)
{
  //consolelog('OperationSupportedForAudioSourceType - ' + audioSourceType + '-' + operation);

  //consolelog('audiosourcetype = ' + audioSourceType);
  //consolelog('operation = ' + operation);

  if (OperationAlwaysSupported(operation) === true)
    return true;

  if (OperationAlwaysSupportedAssumingState(operation) === true)
    return true;

  // Also always supported
  if (operation === Operation.Restore)
    return true;

  switch (audioSourceType)
  {
    case AudioSourceType.HTML5Video:
    case AudioSourceType.HTML5Audio:
    case AudioSourceType.FlashYouTube:
    case AudioSourceType.FlashVimeo:
    case AudioSourceType.FlashSoundManager2:
    case AudioSourceType.FlashDailyMotion:
    case AudioSourceType.QuickTime:
    case AudioSourceType.FlashGrooveShark:
    case AudioSourceType.FlashRdio:
      switch (operation)
      {
        case Operation.Mute:
        case Operation.Unmute:
        case Operation.Play:
        case Operation.Pause:
        case Operation.Stop:
        case Operation.SmartMuteSafe:
        //case Operation.SmartMute:
          return true;
      }
      break;

    case AudioSourceType.FlashMultiFrame:
      // Can add mute/unmute/setvol using my custom swf loader (which requires swf is uploaded to another server)
      switch (operation)
      {
        case Operation.Mute:
        case Operation.Unmute:
        case Operation.Stop:
          return false;
        case Operation.Play:
        case Operation.Pause:
        case Operation.SmartMuteSafe:
          return true;
      }
      break;
    case AudioSourceType.FlashOther:
      switch (operation)
      {
        case Operation.Mute:
        case Operation.Unmute:
        case Operation.Stop:
        case Operation.Play:
        case Operation.Pause:
          return false;
        case Operation.MultiframePause:
        case Operation.MultiframePlay:
        case Operation.SmartMuteSafe:
          //var bg = chrome.extension.getBackgroundPage();
          return (options.ShowMultiFrameFlashOperations === true);
        case Operation.SmartMute:
          //var bg = chrome.extension.getBackgroundPage();
          return (options.ShowMultiFrameFlashOperations === false);
      }
      break;

    case AudioSourceType.UnknownObject:
    case AudioSourceType.UnknownEmbed:
    case AudioSourceType.JavaApplet:
    case AudioSourceType.WindowsMediaPlayer:
    case AudioSourceType.Silverlight:
    case AudioSourceType.LegacySound:
    case AudioSourceType.RealPlayer:
    case AudioSourceType.FlashYouTubeNoJsApi:
    case AudioSourceType.FlashVimeoNoJsApi:
    case AudioSourceType.FlashDailyMotionNoJsApi:
    case AudioSourceType.FlashJWPlayer:
      switch (operation)
      {
        case Operation.SmartMute:
          return true;
      }
      break;
  }

  return false;
};

// At the moment, the only state we can detect is 'blocked'
OperationSupportedForState = function(audioSource, operation, options)
{
	var supported = true;

	switch (operation)
	{
		case Operation.Restore:
			if ((audioSource.Blocked === false) && (OperationSupportedForAudioSourceType(audioSource.AudioSourceType, Operation.SmartMuteSafe, options)) === false)
				supported = false;
			break;
		case Operation.Unblock:
			if (audioSource.Blocked === false)
				supported = false;
			break;
		case Operation.SmartMuteSafe:
		case Operation.SmartMute:
		case Operation.Block:
			if (audioSource.Blocked === true)
				supported = false;
			break;
	}

	return supported;
};
