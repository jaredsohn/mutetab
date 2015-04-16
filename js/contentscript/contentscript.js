// MuteTab-specific portion of contentscript
//
// MuteTab uses the contentscript to detect audio sources and perform operations


var mutetab = {};
var _mutetab = function() {
  var scope = this;

  this.TabOperation = Operation.None; //test site: http://ezswag.com/swagbucks/watcher/

  this._audioSourceCache = {}; // Dictionary for 'id', audiosource.
  this._sendToBgQueue = [];
  this._sendTimerInit = false;

  this._checkBlockStatusInterval = 500; // How frequently to check if flicker is done

  this._flickerMonitorList = [];
  this._flickerInterval = null;

  this.UpdateAudioSourceQueue = function()
  {
    var audioSources = detectAudioSources.GetAudioSources();
    var audioSourceIndex;
    for (audioSourceIndex = 0; audioSourceIndex < audioSources.length; audioSourceIndex++)
    {
      scope.AddAudioSource(audioSources[audioSourceIndex]);
    }

    return audioSources;
  };

  this.OnPerformOperation = function(portOnMessageRequest)
  {
    var operationRequest;

    if (portOnMessageRequest.AllSourcesInFrame === true)
    {
      //TODO: an issue with this is that it doesn't maintain multiple states, although that shouldn't be an issue in practice.
      switch (portOnMessageRequest.Operation)
      {
        case Operation.None:
        case Operation.SmartMute:
        case Operation.SmartMuteSafe:
        case Operation.Restore:
        case Operation.Pause:
        case Operation.Play:
        case Operation.Stop:
        case Operation.MultiframePause:
        case Operation.MultiframePlay:
        case Operation.Block:
        case Operation.Unblock:
        case Operation.Mute:
        case Operation.Unmute:
          scope.TabOperation = portOnMessageRequest.Operation; break;
        default:
          scope.TabOperation = Operation.None; break;
      }
    }

    consolelog(portOnMessageRequest.Operation);

    delete scope._audioSourceCache;
    scope._audioSourceCache = {}; // Necessary because this has to send everything even if there is no change
    scope._sendTimerInit = true; // don't let the timer run
    //TODO: do a clearinterval if something is pending (but need to know the name first...)

    if (portOnMessageRequest.Operation !== Operation.Update)
    {
      consolelog('performing operation: ' + portOnMessageRequest.Operation);

      var audioSources = portOnMessageRequest.AudioSources;

      // If AllSourcesInFrame was selected, then use the audiosources from detectaudiosources
      if ((typeof portOnMessageRequest.AllSourcesInFrame !== 'undefined') && (portOnMessageRequest.AllSourcesInFrame === true))
      {
        audioSources = scope.UpdateAudioSourceQueue();
      }
      PerformOperation(audioSources, portOnMessageRequest.Operation);
    }
    scope.UpdateAudioSourceQueue(); //TODO: perhaps fix this so we don't have to run this twice when doing it for all tabs [at the moment am doing it because i want to detect if state changed]

    scope.SmartSendTabInfo(portOnMessageRequest.RequestId);

    return operationRequest;
  };

  this.AddAudioSource = function(audioSource)
  {
    if ((typeof audioSource === 'unknown') || (audioSource === null))
      return;

    var changed = false;

    // TODO: determine if anything relevant has changed
    var oldAudioSource = scope._audioSourceCache['___' + audioSource.Id];
    if ((typeof oldAudioSource !== 'undefined') && (typeof oldAudioSource !== 'unknown') && (oldAudioSource !== null))
    {
      if (oldAudioSource.Blocked !== audioSource.Blocked)
      {
        changed = true;
      }
    } else
    {
      changed = true;
    }

    if (changed === false)
      return;

    scope._audioSourceCache['___' + audioSource.Id] = audioSource;
    var audioSourceIndex;
    var found = false;
    for (audioSourceIndex = 0; audioSourceIndex < scope._sendToBgQueue.length; audioSourceIndex++)
    {
      if (scope._sendToBgQueue[audioSourceIndex].Id === audioSource.Id) {
        scope._sendToBgQueue[audioSourceIndex] = audioSource;
        found = true;
        break;
      }
    }
    if (found === false) {
      scope._sendToBgQueue.push(audioSource);
    }
    if (scope._sendTimerInit === false)
    {
      scope._sendTimerInit = true;
      setTimeout("mutetab.SmartSendTabInfo(-1)", 1000);
    }

    // Update flicker-related queue if necessary
    if (detectAudioSources.FlickerEnabled === true) {
      if ((typeof audioSource.FlickerStartTime !== 'undefined') && (audioSource.FlickerStartTime !== null) && (audioSource.FlickerStartTime !== 0)) {
      // Don't flicker if we're going to block it anyway.  Otherwise it gets confused.
        //if (defaultOperationIsBlock())
        //{
        //  return;
        //} //TODO

        var flickerIndex;
        found = false;
        for (flickerIndex = 0; flickerIndex < scope._flickerMonitorList.length; flickerIndex++) {
          if (scope._flickerMonitorList[flickerIndex].Id === audioSource.Id)
            found = true;
        }
        if (found === false)
          scope._flickerMonitorList.push(audioSource);

        if (scope._flickerInterval === null) {
          scope._flickerInterval = setInterval("mutetab.CheckBlockStatus();", scope._checkBlockStatusInterval);
        }
      }
    }
  };

  // We send all information, since background requires it.  Could reduce size of message here by sending _sendToBgQueue instead.  Don't care about 'Removed' property because of this. (but need something here that removes it from the cache)
  this.GetAudioSourceArray = function()
  {
    var audioSources = [];
    for (var key in scope._audioSourceCache)
    {
      audioSources.push(scope._audioSourceCache[key]);
    }

    return audioSources;
  };

  // Sends information to background page but waits to combine messages and in the future would only send what is different
  this.SmartSendTabInfo = function(requestId)
  {
    var frameInfo = new FrameInfo();
    frameInfo.AudioSources = scope.GetAudioSourceArray();

    var tabInfo = messaging.CreateTabInfo(frameInfo);
    messaging.SendTabInfo(tabInfo, requestId);
    consolelog("Audiosources that are different: " + scope._sendToBgQueue.length); // doesn't really matter at the moment.

    scope._sendToBgQueue = [];
    scope._sendTimerInit = false;
  };

  // Check if flickering has completed.  Will keep checking for up to 5 seconds or until all audio sources have finished flickering.
  this.CheckBlockStatus = function() {

    consolelog("Checkblockstatus");

    for (flickerIndex = scope._flickerMonitorList.length - 1; flickerIndex >= 0; flickerIndex--) {
      var flickerId = scope._flickerMonitorList[flickerIndex].Id;
  //    consolelog("flicker.id = " + flickerId);
  //    consolelog("audiosource cache = ");
  //    consolelog(_audioSourceCache);

      var audioSource = scope._audioSourceCache["___" + flickerId];
  //    consolelog("audiosource.id = " + audioSource.Id);
      var now = new Date();
      if (((now.getTime() - audioSource.FlickerStartTime) / 1000) > scope._checkBlockStatusInterval * 20 / 1000) { // convert to seconds and allow twenty intervals
        // took longer than 5 seconds. remove it
        scope._flickerMonitorList.splice(flickerIndex, 1);
        consolelog("flicker timed out");
        continue;
      }

      //TO_DO: why is it necessary to use 'find' here for the selector to have .attributes?  This code works but don't understand why I have to do it this way.
      $(document).find('.' + audioSource.Id).each(function(i) {
        //consolelog("jquery selector: ");
        //var selector = $(jq(audioSource.Id));
        //consolelog(selector);
        audioSource = detectAudioSources.CreateAudioSourceForTag(audioSource.Tag, this);
        consolelog("flicker check blocked: " + audioSource.Blocked);

        if (audioSource.Blocked === false) {
          scope._flickerMonitorList.splice(flickerIndex, 1);
          audioSource.FlickerStartTime = null;
          scope.AddAudioSource(audioSource);
        }
      });
    }

    if (scope._flickerMonitorList.length === 0) {
      clearInterval(scope._flickerInterval);
      scope._flickerInterval = null;
      consolelog("done waiting for flickering!");
    }
  };


  this.HandleAudioDomChanges = function(summaries)
  {
    consolelog("HANDLEAUDIODOMCHANGES!!!");

    var summary = summaries[0];
    consolelog(summary);
    summary.added.forEach(function(newEl) {
      consolelog("added!");
    // do setup work on new elements with data-h-tweet
    });

    summary.reparented.forEach(function(changeEl) {
//      var oldValue = hTweetChanges.getOldAttribute(changeEl);
//      var currentValue = changeEl.getAttribute();
      // handle value changed.

      consolelog("reparented!");
    });

    summary.removed.forEach(function(removedEl) {
    // do tear-down or cleanup work for elements that had
    // data-h-tweet.

      consolelog("removed!");
    });
  };

  //maybe move into messaging and have a mutetab-specific callback in this file
  //TODO: for now this will rebuild the entire list whenever anything changed.  Need to fix that. (have it maintain a dict...)
  //TODO: have it also just check again after ~3 sec (without requiring dom changes)
  this.DetectChanges = function() {
  };
};
_mutetab.call(mutetab);

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Callbacks for messaging
////////////////////////////////////////////////////////////////////////////////////////////////////////////
messaging.OnInit = function(response) {
  consolelog("received information from background:");
  consolelog(response);

  detectAudioSources.ForceScripting = response.request.ForceScripting;

  if ((typeof DisallowScriptChangesOverride !== 'undefined') && (DisallowScriptChangesOverride === true)) {
    consolelog("MuteTab: setting forcescripting to false due to injectjs");
    detectAudioSources.ForceScripting = false;
  }

  detectAudioSources.ShowFlashMenu = response.request.ShowFlashMenu;
  detectAudioSources.FlickerEnabled = response.request.FlickerYouTubeVimeoEtc && (detectAudioSources.ForceScripting === true);
  // clear out state (but leaving some things alive.)
  mutetab._audioSourceCache = {};
  mutetab._sendToBgQueue = [];

  if (response.request.AllSourcesInFrame === true)
    mutetab.TabOperation = response.request.Operation; //TODO: shouldn't always replace this.

    consolelog("tabOperation = " + mutetab.TabOperation);
    //consolelog("ForceScripting=" + detectAudioSources.ForceScripting + ', FlickerEnabled=' + detectAudioSources.FlickerEnabled);

    mutetab.UpdateAudioSourceQueue(); // Collect information about this tab/frame
    //setTimeout("DetectAudioSources();", 5000); // run it again delayed (specifically for fb video
    mutetab.DetectChanges();
};

// This will perform operations on the frame
// Here, request contains an Operation and list of audiosources for the frame and if it should include AllSourcesInFrame
messaging.OnPortMessage = function(request)
{
  msgconsolelog('initial portonmessagerequest requestid = ' + request.RequestId);
  //try
  {
    //consolelog('portonmessage');

  if ((request === null) || (typeof request.Operation === 'undefined') || (request.Operation === null))
    {
      consolelog('invalid inputs to onportmessage');
      return;
    }

    mutetab.OnPerformOperation(request);

  //} catch (ex)
  //{
  //  consoleerror('PortOnMessage - ' + ex);
  }
};

//TO_DO: perhaps move this into code that gets audiosources instead and store it as a part of the frame...(so callback isn't needed)
messaging.OnCreateTabInfo = function(tabInfo)
{
  //TO_DO: could do this only for head to improve performance; could also make module level var to check if it has been determined yet so we don't check upon reload
  //tabInfo.FavIconUrl = mutetab.GetFavIconUrl($(this));

  return tabInfo;
};
