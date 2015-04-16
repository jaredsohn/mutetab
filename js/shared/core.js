// Note: not all values in enumerations or fields in structs are actually used by MuteTab

// String must be unique for each entry here
AudioSourceType =
{
  Unknown: 'Unknown',
  HTML5Video: 'HTML5 Video',
  HTML5Audio: 'HTML5 Audio',
  QuickTime: 'QuickTime',               // http://developer.apple.com/library/mac/#documentation/QuickTime/Conceptual/QTScripting_JavaScript/bQTScripting_JavaScri_Document/QuickTimeandJavaScri.html#//apple_ref/doc/uid/TP40001526-CH001-SW5
  UnknownObject: 'Unknown object',
  UnknownEmbed: 'Unknown embed',
  JavaApplet: 'Java Applet',
  LegacySound: 'Legacy Sound',
  Silverlight: 'Silverlight',           // http://msdn.microsoft.com/en-us/library/bb979679(VS.95).aspx  / person asking questions about this and hulu, etc.: http://forums.boxee.tv/showthread.php?t=15714; http://programming4.us/website/254.aspx
  RealPlayer: 'RealPlayer',
  WindowsMediaPlayer: 'Windows Media Player', ////http://www.w3schools.com/media/media_playerref.asp

  FlashMultiFrame: 'Flash (multiframe)',
  FlashOther: 'Flash',
  FlashYouTube: 'YouTube',
  FlashYouTubeNoJsApi: 'YouTube (Javascript disabled)',
  FlashVimeo: 'Vimeo',
  FlashVimeoNoJsApi: 'Vimeo (JavaScript disabled)',
  FlashSoundManager2: 'SoundManager2', // http://www.schillmania.com/projects/soundmanager2/doc/#api.   Just implementing for 'all' right now.
  FlashDailyMotion: 'DailyMotion',  // http://www.dailymotion.com/doc/api/player/javascript_api#DailymotionPlayerTools-enabling-api
  FlashDailyMotionNoJsApi: 'DailyMotion (JavaScript disabled)',
  FlashJWPlayer: 'JWPlayer',  // http://developer.longtailvideo.com/trac/wiki/Player5Api

  // Add support for these:
  FlashGrooveShark: 'Grooveshark',
  FlashJustinTV: 'Justin TV',
  FlashGoogleMusic: 'Google Music',
  FlashLastFM: 'last.fm',
  FlashRdio: 'Rdio', //http://developer.rdio.com/docs/Web_Playback_API
  FlashSpotify: 'Spotify'
  // Primary sites that don't seem to be supported (most flash is ads and can be ignored here):
  // -- hulu
  // -- netflix (I think)
  // -- many games
  // -- many streaming music sites
  // -- video players used on espn, abcnews.com, cnn.com, msnbc.com, etc. [update 9/13: at least espn is possible]
  // -- some aspects of flash videos (i.e. homestarrunner can make noise that isn't easily mutable)
};

//Note: strings are displayed to user and used to determine image filenames and also must be unique since they are used for comparison internally
Operation =
{
  None: 'None',

  Mute: 'Mute',
  Unmute: 'Unmute',
  Play: 'Play',
  Pause: '_Pause', // renamed since we're using this verbage for smartmutesafe
  Stop: '_Stop', // renamed since we're using this verbage for smartmute

  Close: 'Close',
  Show: 'Show',

  Block: 'Block',       //TODO: implement these soon.  basically when i 'hide' or 'show' a video element, use this instead of other actions
  Unblock: 'Unblock',

  //Used internally
  Store: 'Store',
  MarkVisited: 'Markvisited',
  GetTabInfo: 'GetTabInfo',

  Update: 'Refresh',

  // TODO: below aren't supported yet
  FastForward: 'Fastforward',
  Rewind: 'Rewind',
  GoToTime: 'Gototime',

  Louder: 'Louder',
  Quieter: 'Quieter',
  SetVolumeTo: 'SetVolumeTo',

  MultiframePause: 'FlashStopPlay',
  MultiframePlay: 'FlashPlay',

  SmartMute: 'Stop',
  SmartMuteSafe: 'Pause',

  Restore: 'Restore',
  DialogResponse: 'DialogResponse'
};

AudioSource = function()
{
  this.TabId = -1;
  this.TabPageUrl = "";
  this.AudioSourceType = AudioSourceType.Unknown;
  this.MetaData = {};

  // state
  this.Muted = false;
  this.Playing = false;
  this.Blocked = false; // track changes made by plugin
  //this.Paused = false;
  //this.Stopped = false;

  this.IFrameId = "";
  this.Id = "";
  this.Src = "";
  this.SrcParams = "";
  this.ClassId = "";
  //this.Port = null;
  this.Pid = -1;

  this.FlickerStartTime = 0;

  this.Tag = "";

  this.IFrameAncestors = [];

  //TODO: TimePos, MaxTimePos, Volume
};

TabInfo = function()
{
  this.TabId = -1;
  this.WindowId = -1;
  this.TabPageUrl = "";
  this.TabTitle = "";
  this.Frames = [];
  this.TabPid = -1;
  this.Operation = Operation.None;
  this.Incognito = false;
  this.Removed = false;

  // Specific to MuteTab
  this.AllSourcesInTab = false;
  this.FavIconUrl = "";
};

TabDisplayInfo = function()
{
  this.TabId = -1;
  this.FriendlyName = ""; // HTML describing domain and title
  this.FullUrl = "";  // favicon url can be derived from this (using chrome://favicon)

  this.AudioSources = null; //TODO array of AudioSourceDisplayInfos
  this.Operations = null;
};
AudioSourceDisplayInfo = function()
{
  this.Id = "";
  this.AudioSourceType = AudioSourceType.Unknown;
  this.AudioSourceTypeImageUrl = "";
  this.FriendlySrc = "";
  this.Src = "";
  this.CanMuteSafe = false;
  this.Operations = null;
  this.Blocked = false;
  this.FrameIndex = -1;
  this.FrameAudioSourceIndex = -1;
};

FrameInfo = function()
{
  this.IFrameId = "";
  this.Port = null;

  // Specific to MuteTab
  this.AudioSources = [];
  this.AllSourcesInFrame = false;
  this.FrameRequestId = -1;
};

// This is sent to the content-level to perform operations on a frame
FrameOperationRequest = function()
{
  var Operation = Operation.None;
  var AudioSources = []; // use this and set AllSourcesInFrame to false to only apply to these audio sources
  var AllSourcesInFrame = false;  // If set, applies to all sources in the frame (after doing an update)
  var RequestId = 0;
};

/////////////////////////////////////////////////////////////////////////////////////////
// General utilities
/////////////////////////////////////////////////////////////////////////////////////////

//http://ivan-gandhi.livejournal.com/942493.html; get an error when i run it though
function stacktrace() {
  function st2(f) {
    return !f ? [] :
        st2(f.caller).concat([f.toString().split('(')[0].substring(9) + '(' + f.arguments.join(',') + ')']);
  }
  return st2(arguments.callee.caller);
}

// get jQuery selector (from web)
function jq(myid) {
  return '#' + myid.replace(/(:|\.)/g,'\\$1');
}
