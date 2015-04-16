// Note: The selector in the paramStore for embed or attribs params is just the value itself
// Many methods ask for 'attribs' or 'params'; if it is embed and 'params' it will use 'attribs' instead since params aren't available

//TOOD: for silverlight, use 'source' instead of 'src' or 'movie'
// Should work reliably for { flash, youtube }.  More work required for { vimeo, dailymotion, quicktime }


function consolelog(msg)
{
  if (LoggingEnabled)
    console.log(msg);
}

function msgconsolelog(msg)
{
  if (Options.MsgLoggingEnabled === true)
    console.log(msg);
}

function GetAudioSourceType(classid, defaultSourceType)
{
  var audioSourceType = defaultSourceType;
  if (classid !== undefined)
  {
    //alert(classid);
    // Popularity of clsids for opera: http://devfiles.myopera.com/articles/589/classidlist-url.htm
    switch (classid.toLowerCase())
    {
      case 'clsid:02bf25d5-8c17-4b23-bc80-d3488abddc6b':
      case 'video/quicktime':
      case 'audio/midi'://TODO: assumes that quicktime is used for this; don't absolutely know
        audioSourceType = AudioSourceType.QuickTime; break;
      case 'clsid:6bf52a52-394a-11d3-b153-00c04f79faa6':
      case 'clsid:22d6f312-b0f6-11d0-94ab-0080c74c7e95': //older version
      case 'clsid:05589Fa1-c356-11ce-bf01-00aa0055595a': //even older
        audioSourceType = AudioSourceType.WindowsMediaPlayer; break; //http://www.w3schools.com/media/media_playerref.asp
      case 'cfcdaa03-8be4-11cf-b84b-0020afbbccfa':
        audioSourceType = AudioSourceType.RealPlayer; break;
      case 'application/x-silverlight':
      case 'application/x-silverlight-2':
        audioSourceType = AudioSourceType.Silverlight; break;
      case 'application/x-shockwave-flash':
      case 'clsid:d27cdb6e-ae6d-11cf-96b8-444553540000':
        audioSourceType = AudioSourceType.FlashOther;
        break;
    }
  }

  return audioSourceType;
}

var _queryRegExp = /([^&=]+)=?([^&]*)/g;
var _flashvarsRegExp = /([^&=]+)=?([^&]*)/g; // the same right now.  reason for making this separate is i've noticed that sometimes tokens are separated by semicolons

function GetParamStore(obj, objectOrEmbed)
{
  var paramStore = {};
  paramStore.Attribs = {};
  paramStore.Params = {};
  paramStore.FlashVars = {};
  paramStore.SrcVars = {};
  paramStore.ObjectOrEmbed = objectOrEmbed;
  paramStore.SrcVar = (objectOrEmbed === "object") ? "data" : "src"; // could get changed later to movie, though

// http://www.donatofurlani.it/category/webdesign/31/from_html_to_xhtml
// seems like <object> has data as an attribute and movie as a param and that embed has 'src' as an attribute.  Not sure what happens when both data and movie exist and have different values.
// TODO: need code to use this logic everywhere

//consolelog("obj");
//consolelog(obj);

  $(obj).find("param").each(function(j) {

    try
    {
      var paramName = $(this).attr('name').toLowerCase();
      paramStore.Params[paramName] = $(this);
      if (paramName === 'flashvars')
        paramStore.FlashVars = _parseParams(GetParamStoreValue(paramStore, paramName, 'params', objectOrEmbed));
      else {
        if (paramName === "movie") {
          paramStore.SrcVar = "movie";
          paramStore.SrcVars = _parseParams(GetParamStoreValue(paramStore, paramName, 'params', objectOrEmbed));
        }
      }
    } catch (ex)
    {
      consolelog('GetObjectEmbedParamDict exception: ' + ex);
    }
  });

//consolelog("paramstore");
//consolelog(paramStore);
//consolelog("attribs");
//consolelog(obj.attributes);

  $.each(obj.attributes, function(i, attrib) {

    var paramName = attrib.name.toLowerCase();
    paramStore.Attribs[paramName] = attrib.value;
    if (paramName === 'flashvars')
      paramStore.FlashVars = _parseParams(GetParamStoreValue(paramStore, paramName, 'attribs', objectOrEmbed));
    else if (paramName === paramStore.SrcVar)
      paramStore.SrcVars = _parseParams(GetParamStoreValue(paramStore, paramName, 'attribs', objectOrEmbed));
  });

  return paramStore;
}

function GetParamStoreValue(paramStore, key, storeType)
{
//  consolelog("getobjectembedvalue - " + key);
    if ((paramStore.ObjectOrEmbed !== "object") && (paramStore.ObjectOrEmbed !== "embed"))
    throw "paramStore.ObjectOrEmbed must be object or embed";

  if ((storeType !== "params") && (storeType !== "attribs") && (storeType !== "flashvars") && (storeType !== "srcvars"))
    throw "storeType must be params, attribs, flashvars, or srcvars";

    var value = null;
    var selector = null;

  if ((paramStore.ObjectOrEmbed === "object") && (storeType === "params"))
  {
    selector = paramStore.Params[key.toLowerCase()];
    if ((typeof selector === 'undefined') || (selector === null)) {
      // Fall back to attribs if not found in params
      selector = paramStore.Attribs[key.toLowerCase()];

      if ((typeof selector === 'undefined') || (selector === null))
        return null;

      value = selector;
    }
    else {
      value = selector.attr('VALUE');
    }
  } else if (storeType === "flashvars")
  {
    // Prioritize srcvars when doing lookup
    selector = paramStore.SrcVars[key.toLowerCase()];
    if ((typeof selector === 'unknown') || (selector === null))
      selector = paramStore.FlashVars[key.toLowerCase()];

    if ((typeof selector === 'undefined') || (selector === null))
      return null;

    value = selector;
  } else if (storeType === "srcvars")
  {
    selector = paramStore.SrcVars[key.toLowerCase()];

    if ((typeof selector === 'undefined') || (selector === null))
      return null;

    value = selector;
  }
  else // So if user chose 'params' for an embed, it will really use 'attribs'
  {
    selector = paramStore.Attribs[key.toLowerCase()];

    if ((typeof selector === 'undefined') || (selector === null))
      return null;

    value = selector;
  }

  return value;
}

function UpdateParamStoreValue(paramStore, obj, key, value, storeType)
{
  if ((paramStore.ObjectOrEmbed !== "object") && (paramStore.ObjectOrEmbed !== "embed"))
  throw "paramStore.ObjectOrEmbed must be object or embed";

    if ((storeType !== "params") && (storeType !== "attribs") && (storeType !== "flashvars") && (storeType !== "srcvars"))
    throw "storeType must be params, attribs, flashvars, or srcvars";

  if (storeType === "flashvars") {
    // if flash var exists in srcvars, then update it there instead
    var val = GetParamStoreValue(paramStore, 'srcvars', 'attribs', paramStore.ObjectOrEmbed);
    if ((typeof val !== null) && (val !== null))
      storeType = 'srcvars';
  }

  if (storeType === "flashvars") {
    paramStore.FlashVars[key] = value;
    var flashVars = _dictToString(paramStore.FlashVars, '&');
    _updateValue(paramStore, obj, 'flashvars', flashVars, 'attribs');
  } else if (storeType === "srcvars") {
    paramStore.SrcVars[key] = value;
    var src = _dictToString(paramStore.SrcVars, '&');
    _updateValue(paramStore, obj, paramStore.SrcVar, src, 'attribs');
  }
  else {
    _updateValue(paramStore, obj, key, value, storeType);
  }
}

function _dictToString(dict, separator)
{
  var str = "";

  for (var key in dict)
    str += key + "=" + dict[key] + separator;

  // Remove last semicolon
  if (str.length > 0)
    str = str.substr(0, str.length - separator.length);

  return str;
}

//From http://stackoverflow.com/questions/901115/get-query-string-values-in-javascript
function _parseParams(paramString) {
  var dict = {};

  if (typeof paramString === 'undefined')
    return dict;

  var urlParams = {};
  (function() {
    var e,
    a = /\+/g,  // Regex for replacing addition symbol with a space
    r = /([^&=]+)=?([^&]*)/g,
    d = function(s) { return decodeURIComponent(s.replace(a, " ")); },
    q = paramString;

    while (e = r.exec(q)) {
      //consolelog(e);
      dict[d(e[1])] = d(e[2]);
    }
  })();

  return dict;
}

function _updateValue(paramStore, obj, key, value, storeType)
{
  if ((paramStore.ObjectOrEmbed === "object") && (storeType === "params")) {
    var selector = paramStore.Params[key.toLowerCase()];
    if ((typeof selector === 'undefined') || (selector === null))
      selector = $(obj).append('<param NAME="' + key + '" VALUE="' + value + '"/>');

    selector.attr('VALUE', value);
    paramStore.Params[key.toLowerCase()] = value;
  }
  else // So if user chose 'params' for an embed, it will really use 'attribs'
  {
    $(obj).attr(key, value);
    paramStore.Attribs[key.toLowerCase()] = value;

    // Regenerate flashvars or src if needed
    if (key.toLowerCase() === 'flashvars')
      paramStore.FlashVars = _parseParams(GetParamStoreValue(paramStore, 'flashvars', 'attribs', paramStore.ObjectOrEmbed));
    else if (key.toLowerCase() === paramStore.SrcVar)
      paramStore.SrcVars = _parseParams(GetParmaStoreValue(paramStore, paramStore.SrcVar, 'attribs', paramStore.ObjectOrEmbed));
  }
}
