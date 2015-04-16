// The code in this file gets included in the popup page.  Other versions exist for the mutetab dialog and for the mixer.  Needs to better support CSS though.
//TODO: for mixer, perhaps have this use different urls.  Likely should put images into a folder other than 'popup' and have this file be generic (with a flag that indicates that operations should not be shown for dialog)

var soundstatusdisplay_popup_loaded = true;
//<html xmlns="http://www.w3.org/1999/xhtml">
function GetOperationHtml(operation, classname)
{
  return '<img class="' + classname + '" src="' + ImageBaseUrl + 'src/img/operations/' + operation.toLowerCase() + '.png" title="' + operation + '">';
}

/* Code is now dead but use of this is not consistent with operations
function GetAudioSourceTypeHtml(audioSourceType)
{
  var fileName = GetAudioSourceTypeImageUrl(audioSourceType);
  return '<img class="audiosourcetype" src="' + fileName + '" title="' + audioSourceType + '">';
}*/

function CreateOperationHyperLinksForTab(tabInfo, operations) {
  var output = "";
  var i;
  var includedMuteUnsafeOperation = false;

  for (i = 0; i < operations.length; i++) {
    if (operations[i] === Operation.SmartMute)
      includedMuteUnsafeOperation = true;
    if ((operations[i] === Operation.SmartMuteSafe) && (includedMuteUnsafeOperation === true)) // Don't include both mute safe and mute unsafe
      continue;

    if (operations[i] !== Operation.Show) {
      output += ' <a href="#" class="operation"  id="' + operations[i] + '_' + tabInfo.TabId + '">' + GetOperationHtml(operations[i], 'taboperationicon') + '</a>';
    }
  }

  output += "&nbsp;&nbsp;";

  return output;
}

function CreateOperationHyperLinksForAudioSource(tabInfo, frameIndex, audioSourceIndex, operations) {
  var output = "";
  var i;
  var includedMuteUnsafeOperation = false;

  for (i = 0; i < operations.length; i++) {
    if (operations[i] === Operation.SmartMute)
      includedMuteUnsafeOperation = true;
    if ((operations[i] === Operation.SmartMuteSafe) && (includedMuteUnsafeOperation === true)) // Don't include both mute safe and mute unsafe
      continue;

    output += ' <a href="#" class="operation" id="' + operations[i] + '_' + tabInfo.TabId + '_' + frameIndex + '">' + GetOperationHtml(operations[i], 'audiosourceoperationicon') + '</a>';
  }

  output += "&nbsp;&nbsp;";

  return output;
}
