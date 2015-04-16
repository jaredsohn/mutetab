// This file could be injected into mutetab popup, mutetab dialog, and desktop-based mixer ui.  (Only popup uses it right now.)
// soundstatusdisplay_popup.js will be included in popup.html as well; soundstatusdisplay_dialog will be injected into the dialog (and a third version will exist for the mixer)

var soundstatusdisplay_loaded = true;
var ImageBaseUrl = '';

//TODO: test if Options isn't defined.  Determine if I want to include all of Options
function getSoundStatusHtml(displayInfo)
{
  ImageBaseUrl = displayInfo.ImageBaseUrl;
  var output = "";
  displayInfo.Options.ShowTabInfoIfBlocked = true;
  output += GetHtmlForTabInfos("Current tab", displayInfo.CurrentTabInfo, false, displayInfo.Options);
  displayInfo.Options.ShowTabInfoIfBlocked = false;
  //  output += "<HR>" + GetHtmlForTabInfos("All other tabs", displayInfo.AllOtherTabInfo, true, displayInfo.Options);
  //  output += "<HR>" + GetHtmlForTabInfos("All tabs", displayInfo.AllTabInfo, true, displayInfo.Options);
  //not ready yet  output += "<HR>" + GetHtmlForTabInfos("Background music (or videos)", displayInfo.BackgroundTabInfo, true, displayInfo.Options);

  output += '<hr>' + GetHtmlForTabInfos("Background tabs (most recent first)", displayInfo.OtherIndividualTabInfos, false, displayInfo.Options);
//  output += '<HR><div id="manuallyspecified" class="tabType"><b>Manually specified individual tabs</b></div>'; // TODO; only show if there are some; and then don't try to show audiosources

  output += '<hr><div id="caveat" class="tabType"><b>Note: Sounds from blocked popup windows and web audio are undetectable.&nbsp;</b></div>';

  return output;
}

function GetHtmlForTabInfos(title, tabDisplayInfos, sectionOnly, options)
{
  var output = '<div><div class="tabType" style="text-align: left; float: left"><b>' + title + '</b></div>';
  var visibleTabInfoCount = 0;
  if (sectionOnly === true) {
    if (tabDisplayInfos.length > 0)
    {
      output += '<div style="text-align: right; float: right">' + CreateOperationHyperLinksForTab(tabDisplayInfos[0], tabDisplayInfos[0].Operations) + '</div>';
      output += '<div style="clear:both;"></div></div>';
    }
  }
  else {
    output += '<div style="clear:both;"></div></div>';
    var tabDisplayInfoCount = tabDisplayInfos.length;
    var tabIndex;
    for (tabIndex = 0; tabIndex < tabDisplayInfoCount; tabIndex++) {
      var htmlForTabInfo = GetHtmlForTabInfo(tabDisplayInfos[tabIndex], options);
      if (htmlForTabInfo !== '')
      {
        visibleTabInfoCount += 1;

        output += htmlForTabInfo;
      }
    }
    if (visibleTabInfoCount === 0) {
      output += '<div>';
      output += '<div class="audiosourcedescblocked" style="text-align: left; float: left">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(None)</div>';
      output += '<div style="clear:both;"></div></div>';
    }
  }

    return output;
}

function AllAudioSourcesAreBlocked(tabInfo)
{
  var audioSourceCount = tabInfo.AudioSources.length;
//if (audioSourceCount === 0)
//  return false;
  for (j = 0; j < audioSourceCount; j++) {
    if (tabInfo.AudioSources[j].Blocked === false)
      return false;
  }

  return true;
}

// Just creates HTML that shows information about and operations for the tab and each audio source
function GetHtmlForTabInfo(tabInfo, options) {
  var tabDescCss = "tabdesc";
  if (AllAudioSourcesAreBlocked(tabInfo)) {
    tabDescCss += "blocked";
    if ((bg.Options.ShowBlocked === false) && (bg.Options.ShowTabInfoIfBlocked === false))
    {
      return "";
    }
  }
  var output = '<div>'; // tab
  output += '<div style="text-align: left; float: left">';
  output += '<img id="collapseexpandfortab_' + tabInfo.TabId + '" class="tabexpandcollapseicon" src="img/operations/plus2.png" style="cursor:pointer; padding-right: 10px; text-align: left; float: left">';

  output += '<a id="showTabImage_' + tabInfo.TabId + '" style="cursor:pointer;float: left" href="#" title="Click to show tab">' + '<img style="padding-right: 5px;" class="favicon" src="chrome://favicon/' + tabInfo.FullUrl + '">' + '</a>';
  //  output += '<img class="favicon" src="http://geticon.org/of/' + tabInfo.FullUrl + '">';
  output += '<a class="' + tabDescCss + '" style="text-align: left; float: left; text-decoration:none; cursor:pointer;" id="showTabText_' + tabInfo.TabId + '"  href="#"  title="' + tabInfo.FullUrl + '&#10;' + tabInfo.Title + '&#10;&#10;Click to show tab&#10;Click \'+/-\' to see/hide possible audio sources">' + tabInfo.FriendlyName + '</a>';

  output += '</div>'; // end clickable area
  output += '</div>'; // end left text-align

  output += '<div style="text-align: right; float: right">' + CreateOperationHyperLinksForTab(tabInfo, tabInfo.Operations) + '</div><br>';
  output += '<div style="clear:both;"></div>';

  //  if (options.ShowAllAudioSources === true) {
  if (true) {
    output += '<div id="audiosourcesfortab_' + tabInfo.TabId + '" style="display:none">'; //TODO: set style based on collapse/expand state

    var audioSourceCount = tabInfo.AudioSources.length;
    var audioSourceDisplayedCount = 0;
    for (j = 0; j < audioSourceCount; j++) {
      if ((tabInfo.AudioSources[j].Blocked === true) && (options.ShowBlocked === false))
        continue;

      audioSourceDisplayedCount++;

      output += '<div>';
      // On the left we show the audio source type and source
      var descCssClass;
      if (tabInfo.AudioSources[j].Blocked === false)
        descCssClass = "audiosourcedesc";
      else
        descCssClass = "audiosourcedescblocked";
      output += '<div class="' + descCssClass + '" style="text-align: left; float: left">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
      output += '<img class="audiosourcetypeicon" src="' + tabInfo.AudioSources[j].AudioSourceTypeImageUrl + '" title="' + tabInfo.AudioSources[j].AudioSourceType + '">&nbsp;&nbsp;&nbsp;';

      //    if (tabInfo.AudioSources[j].Blocked === true)
      //      output += 'Blocked: ';

      output += tabInfo.AudioSources[j].FriendlySrc + '&nbsp;&nbsp;';
      output += '</div>';

      // On the right we show operation icons
      output += '<div style="text-align: right; float: right">' + CreateOperationHyperLinksForAudioSource(tabInfo, tabInfo.AudioSources[j].FrameIndex, tabInfo.AudioSources[j].FrameAudioSourceIndex, tabInfo.AudioSources[j].Operations) + '</div><br>';

      output += '<div style="clear:both;"></div></div>';
    }
    if (audioSourceDisplayedCount === 0) {
      output += getNoAudioSourcesHtml();
    }
    output += "</div>"; // audio source list
    output += "</div>"; // tab
  }

  return output;
}

function getNoAudioSourcesHtml()
{
  var output = '';
  output += '<div><div class="audiosourcedescblocked" style="text-align: left; float: left">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(No audio sources)</div><br>';
  output += '<div style="clear:both;"></div></div>';
  return output;
}
