// This file is used to pause or stop audio sources.  It includes support for other operations but MuteTab no longer exposes it.

//TODO: make audiosourcetypes into classes which indicate how to perform operations and which operations are supported (basically refactor this file to make it more OOPish; would make it easier for people to add support for other types (although contentscript would still need to be added...or i could make a framework for that part too))
// work more like mute.fm (maybe even make it compatible with same data)

function _alert(msg)
{
  //consolelog(msg);
}

function _alertException(msg)
{
  consolelog(msg);
//  if (mutetab_showexceptions === true)
//    alert(msg);
}

function PerformOperation(audiosources, operation)
{
  _alert('performoperation - ' + operation);
  _alert(audiosources);

  $(document).ready(function() {
    //alert('ready');
    //alert(audiosources.length);
    for (audioSourceIndex = 0; audioSourceIndex < audiosources.length; audioSourceIndex++)
    {
      var op = operation; // Change back to the original operation

      var audioSource = audiosources[audioSourceIndex];
      if (audioSource === null)
        continue;
      if (audioSource.IFrameAncestors.length > 0)
        continue;

      var id = audioSource.Id;
      _alert('id = ');
      _alert(id);

      var obj = document.getElementsByClassName(audioSource.Id)[0];
      var selector = null;
      try
      {
         selector = $('.' + id);
      } catch (ex) // okay to fail for grooveshark since we detect it via the URL instead of plug-in information
      {}

      // Determine operation to use if SmartMute or SmartMuteSafe
      try
      {
        switch (op)
        {
          case Operation.SmartMute:
          case Operation.SmartMuteSafe:
            _alert('smartmute!');

            if (OperationSupportedForAudioSourceType(audiosources[audioSourceIndex].AudioSourceType, Operation.Pause))
            {
              _alert('pause - ' + audiosources[audioSourceIndex].AudioSourceType + '!');
              op = Operation.Pause;
            } else if (OperationSupportedForAudioSourceType(audiosources[audioSourceIndex].AudioSourceType, Operation.Mute))
            {
              _alert('mute - ' + audiosources[audioSourceIndex].AudioSourceType + '!');
              op = Operation.Mute;
            } else if ((operation === Operation.SmartMute) && (OperationSupportedForAudioSourceType(audiosources[audioSourceIndex].AudioSourceType, Operation.Stop)))
            {
              _alert('stop - ' + audiosources[audioSourceIndex].AudioSourceType + '!');
              op = Operation.Stop;
            } else if ((op === Operation.SmartMute) && (OperationSupportedForAudioSourceType(audiosources[audioSourceIndex].AudioSourceType, Operation.Block)))
            {
              _alert('block - ' + operation + ' - ' + audiosources[audioSourceIndex].AudioSourceType + '!');
              op = Operation.Block;
            } else
            {
              _alert('none');
              op = Operation.None;
            }
            break;
        }

        // Handle all block-related logic here (doesn't depend on audiosourcetype)
        switch (op)
        {
          case Operation.Block:
            Block(audioSource, selector); continue;
          case Operation.Unblock:
            Unblock(audioSource, selector); continue;
          case Operation.Mute:
          case Operation.Pause:
            break;
          default:
            Unblock(audioSource, selector); break; // Must be unblocked for most operations to work successfully
        }

        // Now do audiosourcetype-based logic
        switch (audioSource.AudioSourceType)
        {
          case AudioSourceType.HTML5Video:
          case AudioSourceType.HTML5Audio:
            switch (op)
            {
              case Operation.Mute:
                obj.muted = true; break;
              case Operation.Unmute:
                obj.muted = false; break;
              case Operation.Play:
                obj.play(); break;
              case Operation.Pause:
                obj.pause(); break;
              case Operation.Stop:
                obj.stop(); break;
              case Operation.Restore:
                obj.play(); break;
            }
            break;
          case AudioSourceType.FlashDailyMotion:
            switch (op)
            {
              case Operation.Mute:
                obj.mute(); break;
              case Operation.Unmute:
                obj.unMute(); break;
              case Operation.Play:
                obj.playVideo(); break;
              case Operation.Pause:
                obj.pauseVideo(); break;
              case Operation.Stop:
                obj.stopVideo(); break;
              case Operation.Restore:
                obj.playVideo(); break;
            }
            break;

          case AudioSourceType.FlashMultiFrame:
            // Play/pause works only for multiframe flash that allows Javascript access.  (Works for homestarrunner, muffinfilms.).  Could also support fastforward/rewind.)
            // Can add mute/unmute/setvol using my custom swf loader (which is only working for multiframe flash at the moment.)
            switch (op)
            {
              case Operation.Mute:
              case Operation.Unmute:
                break;
              case Operation.Play:
                obj.Play(); break;
              case Operation.Pause:
                obj.StopPlay(); break;
              case Operation.Stop:
                break;
              case Operation.Restore:
                obj.Play(); break;
            }
            break;
          case AudioSourceType.FlashYouTube:
            switch (op)
            {
              case Operation.Mute:
                obj.mute(); break;
              case Operation.Unmute:
                obj.unMute(); break;
              case Operation.Play:
                obj.playVideo(); break;
              case Operation.Pause:
                obj.pauseVideo(); break;
              case Operation.Stop:
                obj.stopVideo(); break;
              case Operation.Restore:
                obj.playVideo(); break;
            }
            break;
          case AudioSourceType.FlashGrooveShark:
            switch (op)
            {
              case Operation.Mute:
                InjectScript("window.Grooveshark.setIsMuted(true);"); break;
              case Operation.Unmute:
                InjectScript("window.Grooveshark.setIsMuted(false);"); break;
              case Operation.Play:
                InjectScript("window.Grooveshark.play();"); break;
              case Operation.Pause:
                InjectScript("window.Grooveshark.pause();"); break;
              case Operation.Stop:
                InjectScript("window.Grooveshark.stop();"); break;
              case Operation.Restore:
                InjectScript("window.Grooveshark.play();"); break;
            }
            break;
          case AudioSourceType.FlashVimeo:
            switch (op)
            {
              case Operation.Mute:
                obj.api_setVolume(0); break;
              case Operation.Unmute:
                obj.api_setVolume(100); break; //TODO: should use previous volume
              case Operation.Play:
                obj.api_play(); break;
              case Operation.Pause:
                obj.api_pause(); break;
              case Operation.Stop:
                obj.api_unload(); break; // might not do what is intended. Could do a seek to beginning and then pause or something like that
              case Operation.Restore:
                obj.api_play(); break;
            }
            break;
          case AudioSourceType.QuickTime:
            switch (op)
            {
              case Operation.Mute:
                obj.SetMute(true); break;
              case Operation.Unmute:
                obj.SetMute(false); break;
              case Operation.Play:
                obj.SetRate(1); obj.Play(); break;
              case Operation.Pause:
                obj.SetRate(0); break;
              case Operation.Stop:
                obj.Stop(); break;
              case Operation.Restore:
                obj.SetRate(1); obj.Play(); break;
            }
            break;
          case AudioSourceType.FlashJustinTV:
            switch (op)
            {
              case Operation.Mute:
                obj.setVolume(0); break;
              case Operation.Unmute:
                obj.setVolume(50); break; //TODO: doesn't restore actual volume
              case Operation.Play:
                obj.resumeStream(); break;
              case Operation.Pause:
                obj.pause(); break;
              case Operation.Stop:
                obj.stopStream(); break;
              case Operation.Restore:
                obj.setVolume(50); obj.resumeStream(); break;
            }
            break;
          case AudioSourceType.FlashRdio:
            switch (op)
            {
              case Operation.Mute:
                obj.setVolume(0); break;
              case Operation.Unmute:
                obj.setVolume(50); break; //TODO: doesn't restore actual volume
              case Operation.Play:
                obj.rdio_play(); break;
              case Operation.Pause:
                obj.rdio_pause(); break;
              case Operation.Stop:
                obj.rdio_stop(); break;
              case Operation.Restore:
                obj.setVolume(50); obj.resumeStream(); break;
            }
            break;
          case AudioSourceType.FlashOther:
            switch (op)
            {
              case Operation.Mute:
              case Operation.Unmute:
              case Operation.Play:
              case Operation.Pause:
              case Operation.Stop:
              case Operation.Restore:
                break;
              case Operation.MultiframePause:
                obj.StopPlay(); break;
              case Operation.MultiframePlay:
              case Operation.Restore:
                obj.Play(); break;
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

            // For Java, it looks like I could implement a dummy wrapper that will configure sound for me (like I've worked with for Flash.  Leaving as TODO for now [don't run Java applets too much].)
            // So for now, we just allow the user to remove the object completely or add it back again (basically Operation.Stop and Operation.Play)
            switch (op)
            {
              case Operation.Mute:
              case Operation.Unmute:
              case Operation.Play:
              case Operation.Pause:
              case Operation.Stop:
                break;
            }
            break;
          }
      } catch (ex)
      {
        _alertException('performoperation - ' + ex);
      }
    }
  });
}

// Block an object.  obj should be a JQuery selector
function Block(audioSource, selector)
{
  if (audioSource.Blocked === true)
    return;

  if (audioSource.IFrameAncestors.length > 0)
    return;

  var height = selector.attr('height');
  var width = selector.attr('width');
  if (typeof height === 'undefined')
    height = 50;
  if (typeof width === 'undefined')
    width = 50;

  //TODO: allow clicking to unblock like you can with flashblock

  var iconUrl = chrome.extension.getURL("src/img/favicon.png");
  var blockDiv =  '<div id="' + audioSource.Id + '_block" style="display: block; text-align: center; width: ' + 1 * width + 'px; height: ' + 1 * height + 'px; top: auto; left: auto; position: static; ">';
  blockDiv +=     '<div style="-webkit-transition-property: opacity; -webkit-transition-duration: 150ms; -webkit-transition-timing-function: ease-out; -webkit-transition-delay: initial; text-align: left; border-top-width: 1px; border-right-width: 1px; border-bottom-width: 1px; border-left-width: 1px; border-top-style: solid; border-right-style: solid; border-bottom-style: solid; border-left-style: solid; border-top-color: rgb(0, 0, 0); border-right-color: rgb(0, 0, 0); border-bottom-color: rgb(0, 0, 0); border-left-color: rgb(0, 0, 0); width: 100%; height: 100%; background-color: rgba(193, 217, 244, 0.496094); background-image: url(' + iconUrl + '); background-size: 50px 50px; opacity: 1; background-repeat: no-repeat;  "></div>';
  blockDiv +=     '</div>';

  // Insert div prior to currently selected element
  $(blockDiv).insertBefore(selector);

  // Actually hide the current element
  selector.hide();
  audioSource.Blocked = true;
}

function Unblock(audioSource, selector)
{
  if (audioSource.Blocked === false)
    return;

  if (audioSource.IFrameAncestors.length > 0)
    return;

  selector.prev().remove(); //TODO: hopefully, we're actually blocked before user chooses this; probably need to store the id for this within the audioSource and check for that here
  selector.show();

  audioSource.Blocked = false;
}

function InjectScript(scriptText)
{
  var script = '<script type="text/javascript">' + scriptText + '</script>';
  consolelog("injecting script: " + scriptText);
  $('body').append(script);
}
