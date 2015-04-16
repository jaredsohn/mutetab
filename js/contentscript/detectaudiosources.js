var detectAudioSources = {};
var _detectAudioSources = function() {
  var scope = this;

  this.FlickerEnabled = true;
  this.ForceScripting = true;

  ////////////////////////////////////////////////////////////////////

  // Get audiosources found in this frame
  this.GetAudioSources = function() {
    var audioSources = [];

    $(document).ready(function() {
      consolelog("__begin getaudiosources");
      scope._getAudioSources($(document), audioSources, [], true);
      consolelog("__end getaudiosources");
    }); // ready

    return audioSources;
  };

  this._getAudioSources = function(selector, audioSources, iFrameAncestors, createAudioSources)
  {
    if (createAudioSources === true) {
      //TODO: need to store the 'path' within each audio source for later lookup
      selector.find("object").each( function(i) { audioSources.push(scope.CreateAudioSourceForTag("object", this, iFrameAncestors));});
      selector.find("embed").each(  function(i) { audioSources.push(scope.CreateAudioSourceForTag("embed",  this, iFrameAncestors));});
      selector.find("video").each(  function(i) { audioSources.push(scope.CreateAudioSourceForTag("video",  this, iFrameAncestors));});
      selector.find("audio").each(  function(i) { audioSources.push(scope.CreateAudioSourceForTag("audio",  this, iFrameAncestors));});
      selector.find("applet").each( function(i) { audioSources.push(scope.CreateAudioSourceForTag("applet", this, iFrameAncestors));});
      // For IE, should also detect bgsound
    }

    // Also do the same if within a same-site iframe
    $(selector).find("iframe").each(function(i) {
      try {
        consolelog("0");
        consolelog(iFrameAncestors);

        var clonedAncestors = $.extend(true, [], iFrameAncestors);
        var includeAudioSources = false;
        var src = '';
        try
        {
          src = ($(this).attr('src'));
        } catch (ex)
        {
          consolelog("inner exception!");
          consolelog(ex);
        }
        consolelog("iframe src: " + src);
        consolelog("1");
        if ((typeof src === 'undefined') || (src === '') || (src === null) || (src === "about:blank"))
        {
          includeAudioSources = true;
          consolelog("no source");
        }
        else
        {
          consolelog('hasasource');
        }

        //includeAudioSources = true;

        consolelog("2");
        clonedAncestors.push("someiframe"); //TODO: need to include an id/class and might have to create it
        consolelog("3");
        scope._getAudioSources($(this).contents(), audioSources, clonedAncestors, includeAudioSources);
        consolelog("4");
      } catch (ex)
      {
        consolelog("iframe exception!");
        consolelog(ex);
      }
    });
  };

  this._getSelectorForIframePath = function(id, ancestors)
  {
    //TODO: keep getting the contents() of iframes until we end up with the desired selector.  Store in an array each of the parent selectors (since we'll need them if we make changes
  };

  this._saveSelector = function(selector, ancestors)
  {
    //TODO: keep updating the contents of ancestors until we eventually change the dom
  };

  //TODO: modify other code (flickering, performing operations) to use these iframe paths.  Concern: does this technique lose state and affect other running plug-ins?

  this.CreateAudioSourceForTag = function(tag, selector, iFrameAncestors)
  {
    var audioSource = null;

    consolelog(tag + "!");
    //consolelog($(selector).clone().wrap('<div>').parent().html());

    switch (tag)
    {
      case "object":
        audioSource = scope.CreateAudioSource(selector, AudioSourceType.UnknownObject);
        scope.UpdateObjectEmbed(selector, audioSource, "object");
        break;
      case "embed":
        audioSource = scope.CreateAudioSource(selector, AudioSourceType.UnknownEmbed);
        scope.UpdateObjectEmbed(selector, audioSource, "embed");
        break;
      case "video":
        audioSource = scope.CreateAudioSource(selector, AudioSourceType.HTML5Video);
        break;
      case "audio":
        audioSource = scope.CreateAudioSource(selector, AudioSourceType.HTML5Audio);
        break;
      case "applet":
        audioSource = scope.CreateAudioSource(selector, AudioSourceType.JavaApplet);
        break;
      default:
        break;
    }

    if (audioSource !== null) {
      audioSource.IFrameAncestors = $.extend(true, [], iFrameAncestors);
      //console.log("iframe ancestor length: " + audioSource.IFrameAncestors.length)
      audioSource.Tag = tag;
    }

    return audioSource;
  };

  var audioSource = null;
  // Initializes an AudioSource object for a selector
  this.CreateAudioSource = function(selector, audioSourceType)
  {
    try {
      audioSource = new AudioSource();
      audioSource.AudioSourceType = audioSourceType;
      audioSource.Id = scope.GetClassName(selector);
      audioSource.OrigId = $(selector).attr('id');
      if ((typeof audioSource.Id === 'undefined') || (audioSource.Id === null) || (audioSource.Id === '')) {
        audioSource.Id = scope.GetUniqueClassName(selector);
        AddClassName(selector, audioSource.Id, false); // It doesn't seem that this change requires flickering; otherwise would have to indicate that
        //console.log(GetClassesWithPrefix(selector, 'mutetabId_'));
      }
      audioSource.Blocked = scope.IsBlocked($(selector));
    } catch (ex) {
      consoleerror('detectaudiosources-' + audioSourceType + ': ' + ex);
      audioSource = null;
    }
    return audioSource;
  };

  this.GetUniqueClassName = function(selector)
  {
    var className = "";
    var isUnique = false;
    while (isUnique === false)
    {
      className = scope.GetRandomId();

      var matches = $("." + className, selector);
      if (matches.length === 0)
        isUnique = true;
    }
    //console.log("new classname = " + className);
    return className;
  };

  // Returns the first unique class name that start with 'mutetabId_' for the selector, or null if none found.
  this.GetClassName = function(selector)
  {
    //console.log("GetClassName");
    var className = null;
    var mutetabClasses = GetClassesWithPrefix(selector, "mutetabId_");
    //console.log("existing classes");
    //console.log(mutetabClasses);
    var i;

    if (mutetabClasses.length > 0)
      className = mutetabClasses[0];

    //TODO: this code is broken since it can't find the existing element of the class
    /*
    for (i = 0; i < mutetabClasses.length; i++)
    {
      var elementsOfClass = $('.' + mutetabClasses[i], selector);
      //console.log("found matches:");
      //console.log(elementsOfClass);
      if (elementsOfClass.length === 1)
      {
        className = mutetabClasses[i];
        break;
      }
    } */
    //console.log("found classname = " + className);
    return className;
  };

  this.GetRandomId = function() {
    return "mutetabId_" + Math.floor(Math.random() * 10000001);
  };

  this.IsBlocked = function(jqselector) {
    var style = jqselector.attr('style');
    return ((style !== undefined) && (style.indexOf('display: none') !== -1));
  };

  ////////////

  // Finds the source, determines the specific audiosourcetype if possible, and optionally enables Javascript scripting
  this.UpdateObjectEmbed = function(obj, audioSource, objectOrEmbed)
  {
    if ((objectOrEmbed !== "object") && (objectOrEmbed !== "embed"))
      throw "objectOrEmbed must be object or embed";

    //consolelog(obj);

    var changeMade = false;
    //  try
    //  {
    if (audioSource === null)
      return;

    var paramStore = GetParamStore(obj, objectOrEmbed);
    var noJsApi = false;
    //consolelog(paramStore);

    //TODO: try to move this block of code inside of objectembed.js
    audioSource.ClassId = $(obj).attr('classid');
    if (typeof audioSource.ClassId === "undefined")
      audioSource.ClassId = $(obj).attr('type'); // useful for rdio.  Should research more to figure out exactly how this should work
    //consolelog(audioSource.ClassId);
    var defaultAudioSourceType = AudioSourceType.UnknownObject;
    if (objectOrEmbed === "embed")
      defaultAudioSourceType = AudioSourceType.UnknownEmbed;
    audioSource.AudioSourceType = GetAudioSourceType(audioSource.ClassId, defaultAudioSourceType);

    if ((audioSource.AudioSourceType === AudioSourceType.FlashOther) || (audioSource.AudioSourceType === defaultAudioSourceType)) //TODO: shouldn't assume flash by default
    {
      var allowScriptAccess = GetParamStoreValue(paramStore, 'allowscriptaccess', "params");
      if ((typeof allowScriptAccess === 'undefined') || (allowScriptAccess === null))
        allowScriptAccess = 'never';

      if (allowScriptAccess.toLowerCase() !== 'always') // todo: samedomain could be okay in some cases
      {
        if (scope.ForceScripting === true) {
          UpdateParamStoreValue(paramStore, obj, "AllowScriptAccess", "always", "params"); //TO_DO: samedomain should be okay in some cases and ideally should leave it alone
          //consolelog("Change made for allowscriptaccess");
          //changeMade = true; // Flicker doesn't seem to be necessary here.  (Tested using flashstopplay at homestarrunner.com)
        }
        else
          noJsApi = true;
      }

      //consolelog(paramStore);
      audioSource.Src = GetParamStoreValue(paramStore, paramStore.SrcVar, "params");

      //consolelog(audioSource.Src);
      //TODO if (audioSource.Src === null)
      //TODO  audioSource.Src = GetParamStoreValue(paramStore, 'data', "attribs");

      var changeMadeForFlash = scope.HandleFlashPlayers(paramStore, obj, audioSource, noJsApi);
      //consolelog("changemadeforflash = " + changeMadeForFlash);
      changeMade = changeMade | changeMadeForFlash;

    } else if (audioSource.AudioSourceType === AudioSourceType.QuickTime) {     //TODO: will evaluate quicktime later
      var enableJavaScript = GetParamStoreValue(paramStore, 'EnableJavaScript', "params");
      //console.log(enableJavaScript);

      if ((typeof enableJavaScript === 'undefined') || (enableJavaScript === null))
      {
        if (scope.ForceScripting === true)
        {
          UpdateParamStoreValue(paramStore, obj, "EnableJavaScript", "true", "params"); //TO_DO: could perhaps do samedomain sometimes
          changeMade = true;
          consolelog("Change made for enablejavascript - quicktime");
        } else
          noJsApi = true;
      } else if (enableJavaScript === "true")
      {
        // do nothing
      } else
      {
        if (scope.ForceScripting === true)
        {
          UpdateParamStoreValue(paramStore, obj, "EnableJavaScript", "true", "params"); //TO_DO: could perhaps do samedomain sometimes
          changeMade = true;
          consolelog("Change made for enablejavascript");
          consolelog(paramStore);
        } else
          noJsApi = true;
      }
    }

    /* //TODO: fix for 'swagabuck'; disabled for now
        var frameInfo = new FrameInfo();
        frameInfo.AudioSources.push(audioSource);
        var tabInfo = new CreateTabInfo(frameInfo);
        PerformOperation(tabInfo, _tabOperation);

    */
        //consolelog("after performing operation ");
        //consolelog(_tabOperation);
        //consolelog(tabInfo);

    //      alert(changeMade);
    //    alert(scope.FlickerEnabled);
    //    alert(audioSource.Blocked);

    if ((changeMade === true) && (scope.FlickerEnabled === true) && (audioSource.Blocked === false)) {
      //console.log("changemade = " + changeMade);
      scope.Flicker(audioSource, $(obj));
    }
  //  } catch (ex)
  //  {
  //  consolelog('detectaudiosources-updateforobject-' + audioSource.Src + ': ' + ex);
  //  }

    audioSource.Src = "(" + objectOrEmbed + ") " + audioSource.Src;
  //  alert(audioSource.Blocked);

    consolelog(audioSource.Id);
    consolelog(paramStore);
    consolelog(audioSource);
  };

  this.Flicker = function(audioSource, selector)
  {
    if (scope.FlickerEnabled === true) {
      //consolelog("flickering...");

      if (audioSource.IFrameAncestors.length > 0)
        return;

      Block(audioSource, selector);

      // Unblock after a delay
  //    try {
        // We don't just use the id here, because some ids can have characters that are invalid in a varname (such as ':')
        //TODO: try to encapsulate this javascript into a mutetab var
        var script = '<script type="text/javascript">function unblock_' + audioSource.Id + '() { var selector = document.getElementsByClassName("' + audioSource.Id + '")[0]; var block_selector = document.getElementById("' + audioSource.Id + '_block"); block_selector.parentNode.removeChild(block_selector); selector.style.display="block";} setTimeout("unblock_' + audioSource.Id + '();", 400);</script>';
        $("body").append(script);
        //document.body.appendChild(script); // does not work for google analytics page (and neither does next line)
  //      document.insertBefore( script, document.lastChild );
  //    } catch (ex)
  //    {
  //      consoleerror(ex);
  //    }
      var date = new Date();
      audioSource.FlickerStartTime = date.getTime();
    }
  };

  // Return true if change made to DOM
  // iterate through each audiosourcetype {youtube, vimeo, dailymotion} and check if it matches the found fields
  // Reference: http://kb2.adobe.com/cps/164/tn_16417.html
  this.HandleFlashPlayers = function(paramStore, obj, audioSource, noJsApi) {
    var changeMade = false;

    if ((typeof audioSource.Src === 'undefined') || (audioSource.Src === null))
      return changeMade;

    if (((audioSource.Src).indexOf('http://www.youtube.com') === 0) || ((audioSource.Src).indexOf('https://www.youtube.com') === 0) || ((audioSource.Src).indexOf('ytimg') !== -1))
    {
      audioSource.AudioSourceType = AudioSourceType.FlashYouTube;

      var enableJsApi = GetParamStoreValue(paramStore, 'enablejsapi', 'flashvars');
      var playerApiId = GetParamStoreValue(paramStore, 'playerapiid', 'flashvars');

      if ((typeof enableJsApi === 'undefined') || (enableJsApi === null))
        enableJsApi = 0;
      if (enableJsApi !== 1) {
        if ((scope.ForceScripting === true) && (noJsApi === false)) {
          UpdateParamStoreValue(paramStore, obj, 'enablejsapi', '1', 'flashvars');

          if ((typeof playerApiId === 'unknown') || (playerApiId === null))
            UpdateParamStoreValue(paramStore, obj, 'playerapiid', audioSource.Id, 'flashvars');

          audioSource.Src = GetParamStoreValue(paramStore, paramStore.SrcVar, 'params');
          changeMade = true; // Verified that flicker is necessary for this change via youtubedoubler.com
        }
        else
          audioSource.AudioSourceType = AudioSourceType.FlashYouTubeNoJsApi;
      }
    }
    else if (audioSource.Src.indexOf('moogaloop') !== -1) //TODO: use better logic for detecting vimeo
    {
      audioSource.AudioSourceType = AudioSourceType.FlashVimeoNoJsApi;
      return changeMade; //disabled for now
    }
    else if (audioSource.Src.indexOf('dmplayer') !== -1) //TODO: use better logic for detecting dailymotion
    {
      //TODO: add support for flashvars and swf query string, too  http://kb2.adobe.com/cps/164/tn_16417.html#main_Additional_Information
      audioSource.AudioSourceType = AudioSourceType.FlashDailyMotionNoJsApi;
      return changeMade; // disable for now...
    }
    return changeMade;
  };
};
_detectAudioSources.call(detectAudioSources);
