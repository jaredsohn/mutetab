"use strict";

let Q = require('q');
let windowManager = require('./background/window_manager')(chrome);
let chromeMisc = require('./background/chrome_misc')(chrome);
let musicControllers = require('./background/music_controllers')(chrome);
let prefsStore = require('./prefs_store')(chrome);

let URL_OPTIONS = chrome.runtime.getURL('build/html/options.html');
let URL_WEBSTORE = 'https://chrome.google.com/webstore/detail/acofndgbcimipbpeoplfjcapdbebbmca';
let URL_SUPPORT = 'http://www.github.com/jaredsohn/mutetab/issues';

// UI constants; not used right now (requires ui shown via keyboard shortcuts)
let PADDING_TOP = 50;
let PADDING_BOTTOM = 50;
let EXTENSION_UI_WIDTH = 300;

// other constants
let PLAY_PAUSE_WAIT = 4; // we wait this long in seconds after asking a tab to play or be paused before we expect to be notified that it did
let URL_CHANGE_WAIT = 10;
let DUCKED_TIMEOUT_EXTRA_WAIT = 60; // wait this additional length before clearing something that is ducked.  Otherwise it gets unducked too quickly.

let hideDucking_ = false;
let injectingEnabled_ = false;

// globals
let prefs_ = {}; // User preferences
let tabState_ = {}; // Current state.
let updateContextMenusTimeout_ = null;
let refreshUiTimeout_ = null;
let isFirstTime_ = true;
let updateContextMenusBusy_ = false;
let browserActionTitle_ = 'MuteTab';
let browserActionUnduckMessage_ = '';
let browserActionMode_ = '';
let checkMaybeAudibleCount_ = 0;
let privacyModeToggleInProgress_ = false;
let prevDuckingTabState_ = null;

// Turn on/off logging; can be set via console
let loggingEnabled_;
let logTypes_ = ['duckingReasoning', 'injected', 'events', 'music', 'ui'];
let logTypeEnabled_; // a dict that indicates if each logtype is enabled or not

// Music ducking state
let musicDuckingIntervalId_ = null;
let duckingCountDown_ = null;
let unduckingOrder_ = []; // tabs that are ducked, in order.  We'll skip over entries if not audible, though.
let unduckedTabId_ = -1;
let unduckedShortTimeTabId_ = -1;
let updateDuckingCount_ = 0;

// Field names that start with '_' are should only be used for debugging purposes
let fields_ = ['mutedCached', 'audibleCached', 'domainCached', 'hasCustomMusicController', 'nonPrivateMuteStatus',
               'nonPrivatePlayStatus', 'musicStateData', 'musicStateForFrame', 'tabCaptured', 'mutingError',
               'lastAudibleStart', 'lastAudibleEnd', 'lastAudibleEndBackup', 'lastUnmuted', 'lastPlayed', 'lastPaused',
               'lastAudibleAndUnmuted', 'playInProgress', 'pauseInProgress', 'checkMaybeAudible', 'urlChanged',
               'playInProgressExpired', 'pauseInProgressExpired', 'playInProgressReason', 'pauseInProgressReason',
               'mutedReason', 'playPauseReason', 'url', 'longestPrevDuration', 'ducked',
               '_audibleTooShortCached', '_inaudibleTooLongCached', '_prevAudibleDuration', '_timeSinceAudibleBecameFalse'];

let monitoredFields_ = ['lastAudibleStart', 'audibleCached', 'lastPlayed', 'lastPaused', 'urlChanged', 'musicStateData', 'nonPrivateMuteStatus'];

///////////////////////////////////////////////////////////////////////////////////////////////////
// Tab State
///////////////////////////////////////////////////////////////////////////////////////////////////

let getDefaultState = function(fieldName) {
  switch (fieldName) {
    case 'mutedCached':
    case 'audibleCached':
    case 'ducked':
    case 'hasCustomMusicController':
    case 'nonPrivateMuteStatus':
    case 'nonPrivatePlayStatus':
    case 'mutingError':
    case 'pauseInProgressExpired':
    case 'playInProgressExpired':
      return false;
    case 'lastPaused':
    case 'lastPlayed':
    case 'lastAudibleStart':
    case 'lastAudibleEnd':
    case 'lastUnmuted':
    case 'lastAudibleEndBackup':
    case 'lastAudibleAndUnmuted':
    case 'playInProgress':
    case 'pauseInProgress':
    case 'urlChanged':
      return new Date(0);
    case 'musicStateForFrame':
      return {};
    case 'mutedReason':
    case 'playPauseReason':
      return '';
    case 'longestPrevDuration':
      return 0;
    default:
      return null;
  }
};

let getState = function(tabId, fieldName) {
  if (fields_.indexOf(fieldName) === -1) {
    console.error('Invalid field: ' + fieldName);
    return null;
  }

  return (!tabState_.hasOwnProperty(tabId) || !tabState_[tabId].hasOwnProperty(fieldName))
    ? getDefaultState(fieldName) 
    : tabState_[tabId][fieldName];
};

let setState = function(tabId, fieldName, val, reason) {
  if (fields_.indexOf(fieldName) === -1) {
    console.error('Invalid field: ' + fieldName);
    return;
  }

  let defaultFieldName = getDefaultState(fieldName);

  if (!tabState_.hasOwnProperty(tabId))
    tabState_[tabId] = {};

  if ((val === null) && (defaultFieldName !== null)) {
    console.warn(tabId, fieldName, 'Trying to set null to a field that has another default value');
    tabState_[tabId][fieldName] = defaultFieldName;
  } else {
    tabState_[tabId][fieldName] = val;
  }

  if (monitoredFields_.indexOf(fieldName) >= 0)
    console.log(tabId, 'monitored', fieldName, val, typeof reason !== 'undefined' ? reason : '');
};

let getAllTabIds = function() {
  return Object.keys(tabState_).map(function(tabId) { return parseInt(tabId, 10); });
};

// Returns an object consisting of a list of tabIds with fieldName populated
// Only does so if actual data is stored.
let getStateForAllTabs = function(fieldName) {
  let obj = {};
  Object.keys(tabState_).forEach(function(tabId) {
    if ((tabState_[tabId].hasOwnProperty(fieldName))) {
      obj[tabId] = {};
      obj[tabId][fieldName] = getState(tabId, fieldName);
    }
  });

  return obj;
};

let getFullState = function(tabId) {
  return (tabState_.hasOwnProperty(tabId))
    ? tabState_[tabId]
    : {};
};

let getFullStateForAllTabs = function() {
  return tabState_;
};

let clearState = function(tabId) {
  console.log(tabId, 'clearing state');
  delete tabState_[tabId];
};

let clearStateFieldForAllTabs = function(fieldName) {
  if (fields_.indexOf(fieldName) === -1) {
    console.error('Invalid field: ' + fieldName);
    return;
  }

  Object.keys(tabState_).forEach(function(tabId) {
    delete tabState_[tabId][fieldName];
  });
};

///////////////////////////////////////////////////////////////////////////////////////////////////
// Mute commands
///////////////////////////////////////////////////////////////////////////////////////////////////

// Mute everything (including whitelist and music)
// Do not update setting for saved mute and play status from before privacy mode
let muteEverything = function() {
  return windowManager.getTabs()
  .done(function(historyData) {
    console.log('muteeverything!');

    let mutePromises = historyData.map(function(tabInfo) {
      return updateMuted(tabInfo.id, true, {saveNonPrivate: false}, 'Muted due to privacy mode.');
    });
    let pausePromises = historyData.map(function(tabInfo) {
      return pauseMusic(tabInfo.id, 'Paused due to privacy mode.');
    });

    return Q.allSettled(mutePromises)
    .then(Q.allSettled(pausePromises));
  });
};

// Excludes music list
let muteAll = function(excludeWhiteListedTabs) {
  return windowManager.getTabs()
  .then(function(tabs) {
    if (typeof excludeWhiteListedTabs === 'undefined')
      excludeWhiteListedTabs = true;

    let filtered = tabs.filter(function(tabInfo) {
      let domain = getDomain(tabInfo.url);
      return (((!excludeWhiteListedTabs) || (!prefsStore.domainInList(domain, prefs_.whitelist))) &&
              (!prefsStore.domainInList(domain, prefs_.musiclist)));
    });
    let mutePromises = filtered.map(function(tabInfo) { return updateMuted(tabInfo.id, true, {}, 'Muted by \'Mute all tabs\'.'); });
    let pausePromises = filtered.map(function(tabInfo) {
      return pauseMusic(tabInfo.id, 'Paused by \'Mute all tabs\'.');
    });

    return Q.allSettled(mutePromises)
    .then(Q.allSettled(pausePromises));
  });
};

let unmuteAll = function() {
  return windowManager.getTabs()
  .then(function(tabs) {
    let mutePromises = tabs.map(function(tabInfo) {
      return updateMuted(tabInfo.id, false, {}, 'Unmuted by \'Unmute all tabs\'');
    });

    return Q.allSettled(mutePromises);
  });
};

let muteBackground = function() {
  return Q.all([windowManager.getTabs(), windowManager.getCurrentTab()])
  .spread(function(tabs, currentTabInfo) {
    let filtered = tabs.filter(function(tabInfo) {
      let domain = getDomain(tabInfo.url);
      return ((tabInfo.id !== currentTabInfo.id) && (!prefsStore.domainInList(domain, prefs_.musiclist)));
    });
    let mutePromises = filtered.map(function(tabInfo) { return updateMuted(tabInfo.id, true, {}, 'Muted by \'Mute background tabs\'.'); });
    let pausePromises = filtered.map(function(tabInfo) {
      return pauseMusic(tabInfo.id, 'Paused by \'Mute background tabs\'.');
    });

    return Q.allSettled(mutePromises)
    .then(Q.allSettled(pausePromises));
  });
};

let toggleCurrentMuted = function() {
  return windowManager.getCurrentTab()
  .then(function(currentTabInfo) {
    return updateMuted(currentTabInfo.id, !currentTabInfo.mutedInfo.muted, {}, (!currentTabInfo.mutedInfo.muted ? 'Unmuted' : 'Muted') + ' via keyboard shortcut');
  });
};

let setCurrentMuted = function(mute) {
  return windowManager.getCurrentTab()
  .then(function(currentTabInfo) {
    let reason = mute ? 'Muted by user via MuteTab context menu.' : 'Unmuted by user via MuteTab context menu';
    return updateMuted(currentTabInfo.id, mute, {}, reason);
  });
};

// We mute all audible unmuted tabs.  If ducking is active, this will cause the next sound to start up.
// Note: This is a legacy method only used by a single test; TODO: change test so this isn't needed any more.
let muteAudible = function() {
  return windowManager.getTabs()
  .then(function(tabs) {
    let filtered = tabs.filter(function(tabInfo) {
      return ((!getState(tabInfo.id, 'mutedCached')) && getState(tabInfo.id, 'audibleCached'));
    });
    let promises = filtered.map(function(tabInfo) {
      return updateMuted(tabInfo.id, true, null, 'Muted because tab is audible (done via a test.)');
    });

    return Q.all(promises);
  });
};

///////////////////////////////////////////////////////////////////////////////////////////////////
// Event listeners
///////////////////////////////////////////////////////////////////////////////////////////////////

// The muted flag doesn't really matter for created tabs but we do so for consistency reasons
let onCreated = function(tab) {
  if (prefs_.disableAutomuting)
    return;
  chromeMisc.ensureMutedInfo(tab);

  let muteInfo = null;

  try {
    if (prefs_.muteAllTabs)
      muteInfo = {should: true, save: true, reason: 'Muted by default'};
    else if (tab.incognito && prefs_.muteNewIncognito)
      muteInfo = {should: true, save: true, reason: 'Incognito muted by default'};
    else
      muteInfo = {should: false, save: true, reason: ''};

    updateMuted(tab.id, muteInfo.should, {shouldUpdateDucking: false, saveNonPrivate: (prefs_.privacyMode === false)}, muteInfo.reason).done();
  } catch (ex) {
    console.error(ex);
  }
};

let onReplaced = function(addedTabId, removedTabId) {
  console.log("ONREPLACED!");
  if (logTypeEnabled_.events)
    console.log('onReplaced', addedTabId, removedTabId);
  if (windowManager.getLastTabIdSync() === removedTabId)
    windowManager.setLastTabId(addedTabId); // Update this so that we don't mute the wrong tab in mute background

  setState(addedTabId, 'domainCached', getState(removedTabId, 'domainCached')); // copy this over so we can maybe not change muted state (assuming domain is same and pref is set)
  clearState(removedTabId);
  let duckedTabIndex = unduckingOrder_.indexOf(removedTabId);
  if (duckedTabIndex !== -1)
    unduckingOrder_[duckedTabIndex] = addedTabId;

  windowManager.getTabInfo(addedTabId)
  .then(function(tabInfo) {
    updateStateForUrlChange(tabInfo);
  }).done();
};

let onUpdated = function(tabId, changeInfo, tab) {
  if (tabId === windowManager.extensionWindowIdSync)
    return;
  chromeMisc.ensureMutedInfo(tab);
  chromeMisc.ensureMutedInfo(changeInfo);

  let urlChanged = false;
  let oldUrl = getState(tab.id, 'url') || null;
  if (oldUrl !== tab.url) {
    urlChanged = true;
  }

  if (changeInfo.hasOwnProperty('status') && (changeInfo.status === 'loading')) {
    if (urlChanged) {
      if (logTypeEnabled_.events)
        console.log('onUpdated (status=loading)', tabId, tab.url, changeInfo, tab);
      updateStateForUrlChange(tab).done();
    } else {
      if (logTypeEnabled_.events)
        console.log('(status=loading) but url did not change.', tabId, tab.url, changeInfo, tab);
    }
  } else if (urlChanged) {
    if (logTypeEnabled_.events)
      console.log('onUpdated urlchanged', tabId, tab.url, changeInfo, tab);
    updateStateForUrlChange(tab).done();
  }

  if (changeInfo.hasOwnProperty('audible')) {
    if (logTypeEnabled_.events)
      console.log(tabId, 'onUpdated - audible', (changeInfo.audible === true), getState(tabId, 'mutedCached'), (getState(tabId, 'lastAudibleStart').getTime() === 0));
    if ((changeInfo.audible === true) &&
        getState(tabId, 'mutedCached') &&
        (getState(tabId, 'lastAudibleStart').getTime() === 0)) {
      localStorage.noisesPrevented = parseInt(localStorage.noisesPrevented || 0, 10) + 1;
    }
    if (logTypeEnabled_.events)
      console.log('onUpdated', tabId, tab.url, changeInfo, tab);
    updateAudible(tabId, changeInfo.audible, 'onUpdated');

    if (!tab.audible && !tab.mutedInfo.muted) {
      setState(tabId, 'lastAudibleAndUnmuted', new Date());
      refreshUi();
    }
  }

  // If muted by user, tab capture, or another extension
  if (changeInfo.hasOwnProperty('mutedInfo')) {
    if (tab.audible && tab.mutedInfo.muted) {
      setState(tabId, 'lastAudibleAndUnmuted', new Date());
      refreshUi();
    }

    if (changeInfo.mutedInfo.extensionId !== chrome.runtime.id) {
      if (logTypeEnabled_.events)
        console.log('onUpdated', tabId, tab.url, changeInfo, tab);
      let mutedCauseText = changeInfo.mutedInfo.reason;
      if (mutedCauseText === 'extension')
        mutedCauseText = 'another extension. (id=' + changeInfo.mutedInfo.extensionId + ')';
      else if (mutedCauseText === 'user')
        mutedCauseText = 'user through Chrome.';
      else
        mutedCauseText += '.';

      updateMuted(tabId, changeInfo.mutedInfo.muted, {saveNonPrivate: true}, (tab.mutedInfo.muted ? 'Muted by ' : 'Unmuted by ') + mutedCauseText).done();
    }
  }
};

let onActivated = function(activeInfo) {
  windowManager.getCurrentTab()
  .then(function(currentTab) {
    console.log("onActivated", activeInfo, currentTab);
    if ((currentTab === null) || (currentTab.windowId !== activeInfo.windowId)) {
      console.log("onActivated - ignoring since not in active window", activeInfo, activeInfo.windowId, windowManager.getExtensionWindowIdSync());
      return;
    }

    console.log("onActivated", activeInfo, activeInfo.windowId, windowManager.getExtensionWindowIdSync());

    if (activeInfo.windowId === windowManager.getExtensionWindowIdSync())
      return;

    let prevTabId = windowManager.getLastTabIdSync();

    if (activeInfo.tabId === prevTabId) {
      return;
    }

    moveToFrontOfUnduckingOrder(activeInfo.tabId);

    // if (logTypeEnabled_.events)
    //   console.log(activeInfo.tabId, "onActivated");

    windowManager.setLastWindowId(activeInfo.windowId);
    windowManager.setLastTabId(activeInfo.tabId);

    windowManager.getTabInfo(activeInfo.tabId)
    .then(function(tabInfo) {
      setState(activeInfo.tabId, 'domainCached', getDomain(tabInfo.url));

      // console.log("just tabbed away from (will mute if not music)", prevTabId);
      if ((!prefs_.disableAutomuting) && (prefs_.muteBackgroundTabs)) {
        let isMusic = prefsStore.domainInList(getState(prevTabId, 'domainCached'), prefs_.musiclist);
        console.log(prevTabId, 'bgdebug data', prefs_.disableAutomuting, prefs_.muteBackgroundTabs, getState(prevTabId, 'domainCached'), prefs_.musiclist, isMusic);

        if (!isMusic)
          updateMuted(prevTabId, true, {}, 'Background muted by default.').done();
      }

      if (getState(activeInfo.tabId, 'ducked')) {
        let timeToCheck = Math.min(getCountdownForUnducking(activeInfo.tabId, false), prefs_.minTimeBeforeUnducking);
        addMaybeAudibleCheck(activeInfo.tabId, timeToCheck, true);

        unduckTabIds([activeInfo.tabId]).done();
      }

      updateContextMenus();
    });
  });
};

// When the user closes a tab, remove all of that tab's history.
let onRemoved = function(tabId) {
  //if (logTypeEnabled_.events)
  // console.log("OnRemoved", tabId);

  let domainText = '';
  let domainCached = getState(tabId, 'domainCached');
  if (domainCached !== null)
    domainText = ' (' + domainCached + ')';
  clearState(tabId);
  removeFromArray(unduckingOrder_, tabId);
  if (prefs_.enableDucking)
    updateDucking('removed tab: ' + tabId + domainText).done(); // don't worry about race conditions with this
  if (logTypeEnabled_.events)
    console.log(tabId, 'tab closed');
  refreshUi();
};

// All actions run by user-defined keys are here; we reuse some of the code for context menus
// and actions requested via the UI
let onCommand = function(command) {
  onCommandAsPromise(command).done();
};
let onCommandAsPromise = function(command) {
  if (logTypeEnabled_.events)
    console.log('onCommand:', command);

  let promise = Q.when(null); // our default promise, used when calling sync code
  switch (command) {
    case 'show_tabs_window': return showTabsWindow();
    case 'mute_all': return muteAll(false);
    case 'unmute_all': return unmuteAll();
    case 'mute_background': return muteBackground();
    case 'mute_current': return setCurrentMuted(true);
    case 'unmute_current': return setCurrentMuted(false);
    case 'mute_audible': return muteAudible();
    case 'toggle_current_muted': return toggleCurrentMuted();
    case 'blacklist_remove': return updateListForCurrentTab('neither');
    case 'blacklist_add': return updateListForCurrentTab('black');
    case 'whitelist_remove': return updateListForCurrentTab('neither');
    case 'whitelist_add': return updateListForCurrentTab('white');
    case 'musiclist_remove': return updateListForCurrentTab('notmusic');
    case 'musiclist_add': return updateListForCurrentTab('music');
    case 'manualduckinglist_remove': return updateListForCurrentTab('notmanualduckinglist');
    case 'manualduckinglist_add': return updateListForCurrentTab('manualducking');
    case 'change_privacy_mode': return togglePrivacyMode();
    case 'change_disable_automuting': prefs_.disableAutomuting = !prefs_.disableAutomuting; if (!prefs_.disableAutomuting) { updateDucking('automuting reenabled'); setFavicon(); } else { setFavicon(); } return prefsStore.save(prefs_);
    case 'show_options': return windowManager.openUrl(URL_OPTIONS);
    case 'show_webstore': return windowManager.openUrl(URL_WEBSTORE);
    case 'show_support': return windowManager.openUrl(URL_SUPPORT);
    case 'load_settings': return loadSettings();
    case 'pause_current': return pauseCurrent();
    case 'play_current': return playCurrent();
    case 'mute_unducked': return updateMuted(unduckedTabId_, true, {}, 'Muted by user as \'unducked tab\' via MuteTab context menu.');
    case 'pause_unducked': return pauseMusic(unduckedTabId_, 'Paused by user as \'unducked tab\' via MuteTab context menu.');
    case 'close_unducked': return windowManager.closeTab(unduckedTabId_);
    case 'show_unducked': return windowManager.switchToTab(unduckedTabId_);
    case 'mute_unducked': return muteOrPauseUnducked();

    default: console.warn('Unsupported command requested: ' + command);
  }

  return promise;
};

// onMessage gets called from the popup.  Note that when we call respond,
// we get an error re: a no longer existing port object in the background page console.
let onMessage = function(request, sender, respond) {
  let keys = Object.keys(request);
  let showMessageInConsole = true;
  let doNotLogKeys = ['created', 'action', 'send_tab_data'];
  doNotLogKeys.forEach(function(doNotLogKey) {
    if (request.hasOwnProperty(doNotLogKey))
      showMessageInConsole = false;
  });
  if ((showMessageInConsole) && (logTypeEnabled_.events))
    console.log('onMessage: ' + keys, request, sender);

  keys.forEach(function(key) {
    switch (key) {
      case 'mute_all':
      case 'unmute_all':
      case 'mute_background':
      case 'show_options':
      case 'show_webstore':
      case 'show_share':
      case 'show_support':
      case 'load_settings':
      case 'change_disable_automuting':
      case 'change_privacy_mode':
      case 'toggle_current_muted':
      case 'mute_audible':
        onCommandAsPromise(key).done(function(data) { respond(data); }); break; // If no parameters, then use onCommand code.

      case 'change_enableDucking': prefs_.enableDucking = request[key]; return prefsStore.save(prefs_).then(updateDucking('change_enableDucking')).done(respond);
      case 'switch_to_tab': windowManager.switchToTab(request[key]).done(respond); break;
      case 'switch_to_tabs': windowManager.switchToTabs(request[key]).done(respond); break;
      case 'close_tab': windowManager.closeTab(request[key]).done(respond); break;
      case 'create_tab': windowManager.createTab({url: request[key]}).done(respond); break;
      case 'create_tabs': windowManager.createTabs(request[key]).then(windowManager.switchToTab(sender.tab.id)).done(respond); break;
      case 'change_url': windowManager.changeUrl(request[key].tabId, request[key].url).done(respond); break;
      case 'change_all_urls': windowManager.changeAllUrls().done(respond); break;
      case 'set_muted': updateMuted(request[key].tabId, request[key].muted, {}, (request[key].muted ? 'Muted' : 'Unmuted') + ' by user via MuteTab.').done(respond); break;
      case 'set_audible': updateAudible(request[key].tabId, request[key].audible, 'tests'); respond({}); return false;
      case 'send_tab_data': sendTabData((sender.hasOwnProperty('tab')) ? sender.tab.id : -1).done(respond); break;
      case 'update_listtype': prefsStore.updateListAndSave(prefs_, request[key].listType, request[key].domain).then(updateContextMenus()).done(respond); break;
      case 'change_show_other_tabs': prefs_.showOtherTabs = request[key]; return prefsStore.save(prefs_).done(respond);
      case 'play_music': /*ignore jslint start*/ playMusic(request[key], 'Played by user via MuteTab.').then(updateMuted(request[key], false, {skipPlay: true}, 'Unmuted by user when playing via MuteTab.')).done(respond); break; /*ignore jslint end*/ // Note: cannot depend on this alerting when operation done; linting broken since catch here is from q
      case 'pause_music': /*ignore jslint start*/ pauseMusic(request[key], 'Paused by user via MuteTab.').done(respond); break; /*ignore jslint end*/ // Note: same as for play_music
      case 'setup_test_scenario': setupTestScenario((sender.hasOwnProperty('tab')) ? sender.tab.id : -1, (sender.hasOwnProperty('tab')) ? sender.tab.windowId : -1, request[key]).done(respond); break;
      case 'set_properties_multiple': setPropertiesMultiple(request[key].tabIds, request[key].properties).done(respond); break;
      case 'get_prefs': respond(prefs_); return false;
      case 'set_prefs': prefs_ = request[key]; console.log('prefs set (in memory) to', prefs_); afterLoadSettings().then(setFavicon()).done(respond); break;
      // These messages come from music controllers (which originated with StreamKeys).
      case 'stateData': updateMusicStateData((sender.hasOwnProperty('tab')) ? sender.tab.id : -1, request[key]).done(function() { }); return false;
      case 'created':
      case 'action':
        return false; // ignore these messages
      default: console.warn('Unsupported onMessage key: ' + key, request[key]); break;
    }
    return false;
  });

  // For async responses, we return true to tell Chrome to wait. If method is sync, then return false earlier.
  return true;
};

/* 
  // TODO - Didn't work correctly in Chrome when checked in Fall 2015
  let onCaptured = function(captureInfo) {
  console.log('CAPTURED CHANGE!', captureInfo);
  setState(captureInfo.tabId, 'tabCaptured', (captureInfo.status === 'active'));
};*/

let onContextMenuClicked = function(info) {
  onCommand(info.menuItemId);
};

////////////////////////////////////////////////////////////////////////
// Update tab's non-music UI-based state
////////////////////////////////////////////////////////////////////////

// Mute/unmute, update context menus, update data for when private mode is left, and record to history

// options is some boolean flags: {saveNonPrivate, shouldUpdateDucking, skipPlay};
// we assume they are true unless specified otherwise.
let updateMuted = function(tabId, shouldMute, options, reason) {
  tabId = parseInt(tabId, 10); // ensure it is integer
  return windowManager.getCurrentTab()
  .then(function(currentTabInfo) {
    options = options || {};
    let skipPlay = options.skipPlay || false;

    let maybeMutePromise = chromeMisc.setMuted(tabId, shouldMute);
    let maybePlayPromise = ((!skipPlay) && (shouldMute === false) && (getState(tabId, 'ducked'))) ? playMusic(tabId, 'Played because unmuted.') : Q.when(null);

    return Q.allSettled([maybeMutePromise, maybePlayPromise])
    .then(function(output) {

      if (output[0].value === undefined)
        return Q.when(null);

      chromeMisc.ensureMutedInfo(output[0].value);
      setState(tabId, 'mutingError', (output[0].value.mutedInfo.muted !== shouldMute));
      shouldMute = output[0].value.mutedInfo.muted; // maintain internal state

      let saveNonPrivate = options.hasOwnProperty('saveNonPrivate') ? options.saveNonPrivate : true;
      let shouldUpdateDucking = options.hasOwnProperty('shouldUpdateDucking') ? options.shouldUpdateDucking : true;
      let recordLastUnmuted = options.hasOwnProperty('recordLastUnmuted') ? options.recordLastUnmuted : true;

      let muteChanged = getState(tabId, 'mutedCached') !== shouldMute;

      console.log(tabId, 'updateMuted', shouldMute, options, reason);
      let now = new Date();

      if ((!shouldMute) && (recordLastUnmuted)) {
        setState(tabId, 'lastUnmuted', now);
      }

      setState(tabId, 'mutedCached', shouldMute);
      if (muteChanged)
        setState(tabId, 'mutedReason', reason);

      if (saveNonPrivate)
        setState(tabId, 'nonPrivateMuteStatus', shouldMute);

      refreshUi();

      if ((currentTabInfo.id === tabId) || (unduckedTabId_ === tabId))
        updateContextMenus();

      if (shouldUpdateDucking && muteChanged) {
        if ((getState(tabId, 'ducked')) && (!shouldMute)) {
          console.log(tabId, "moveToFrontOfUnduckingOrder via updatemuted");
          moveToFrontOfUnduckingOrder(tabId);
        }
        updateDucking(tabId + ' muted is ' + shouldMute).done();
      }

      return Q.when(null);
    });
  });
};

// Marks it as audible in the simulator and updates history
// Unlike most methods in this file, this does _not_ return a promise
let updateAudible = function(tabId, audible, reason) {
  let timeToCheck;
  let now = new Date();

  if (logTypeEnabled_.events)
    console.log(tabId, 'updateAudible', audible, reason);

  if (!audible) {
    setState(tabId, 'audibleCached', audible);
    if (okayToUpdateAudibleOrPlaying(tabId)) {
      setState(tabId, 'lastAudibleEndBackup', getState(tabId, 'lastAudibleEnd')); // Make a backup in case silence is short and we need to reverse it
      setState(tabId, 'lastAudibleEnd', now);
    }
  } else {
    if (getCountdownForUnducking(tabId, true) > 0) {
      setState(tabId, 'lastAudibleEnd', getState(tabId, 'lastAudibleEndBackup')); // ignore the lul in the history
      // we maintain the old lastAudibleStart time, too, unless it doesn't exist or is out of date
      if ((getState(tabId, 'lastAudibleStart')) <= (getState(tabId, 'lastAudibleEnd')))
        setState(tabId, 'lastAudibleStart', now);
    } else {
      setState(tabId, 'lastAudibleStart', now);
    }
    setState(tabId, 'audibleCached', audible);

    if ((!getState(tabId, 'mutedCached')) &&
        maybeAudible(unduckedTabId_) &&
        (tabId !== windowManager.getLastTabIdSync())
    ) {
      if ((unduckingOrder_.indexOf(tabId) > unduckingOrder_.indexOf(unduckedTabId_)) && (tabId !== unduckedShortTimeTabId_)) {
        console.log(tabId, 'ducking this to not interrupt what is currently unducked');
        duckTabIds([tabId]).done();
      }

      addMaybeAudibleCheck(tabId, PLAY_PAUSE_WAIT, true);
    }
  }

  refreshUi();

  // let duckingIsActive = ((prefs_.enableDucking) && (!prefs_.privacyMode) && (!prefs_.disableAutomuting))
  // if (unduckingOrder_.indexOf(tabId) || duckingIsActive) {
  // The Math.min prevents us from passing in MAX_SAFE_INTEGER
  timeToCheck = audible ?
      prefs_.minTimeBeforeDucking :
      Math.min(getCountdownForUnducking(tabId, false), prefs_.minTimeBeforeUnducking);

  addMaybeAudibleCheck(tabId, timeToCheck, false);
//  } else {
//    console.log(tabId, "ducking is not active (but would normally check audible here"); //TO_DO (going to try it this way for a bit)
//  }
};

let updateListForCurrentTab = function(listType) {
  return windowManager.getCurrentTab()
  .then(function(currentTabInfo) {
    let domainToUpdate = getDomain(currentTabInfo.url);
    if ((listType == 'white') || (listType == 'black')) {
      let blackOrWhiteListDomain = prefsStore.getDomainRuleForDomainInList(domainToUpdate, prefs_[listType + 'list']);
      if (blackOrWhiteListDomain !== null)
        domainToUpdate = blackOrWhiteListDomain;
    }
    return prefsStore.updateListAndSave(prefs_, listType, domainToUpdate)
    .then(updateContextMenus())
    .done();
  });
};

////////////////////////////////////////////////////////////////////////
// Update internal state
////////////////////////////////////////////////////////////////////////

let togglePrivacyMode = function() {
  if (privacyModeToggleInProgress_)
    return Q.when(null);

  privacyModeToggleInProgress_ = true;
  sendTabData(windowManager.getExtensionTabIdSync()).done();

  return (!prefs_.privacyMode) ? setPrivacyModeOn() : setPrivacyModeOff();
};
let setPrivacyModeOn = function() {
  return Q.when(null, function() {

    let mutePromises = [];
    let playPromises = [];

    clearStateFieldForAllTabs('nonPrivateMuteStatus');
    clearStateFieldForAllTabs('nonPrivatePlayStatus');
    console.log("~start");
    // Save what was muted or playing
    Object.keys(getStateForAllTabs('mutedCached')).forEach(function(tabId) {
      setState(tabId, 'nonPrivateMuteStatus', getState(tabId, 'mutedCached'));
    });
    console.log("~end");
    Object.keys(getStateForAllTabs('musicStateData')).forEach(function(tabId) {
      if (getMusicState(tabId, 'isPlaying'))
        setState(tabId, 'nonPrivatePlayStatus', true);
    });

    // Mute/pause all tabs for privacy mode
    mutePromises.push(muteEverything());

    prefs_.privacyMode = true;
    return prefsStore.save(prefs_)
    .then(Q.allSettled(mutePromises))
    .then(Q.allSettled(playPromises))
    .then(updateDucking('privacy mode enabled')) // shouldn't do anything here
    .then(updateContextMenus())
    .then(setFavicon())
    .then(function() {
      privacyModeToggleInProgress_ = false;
      sendTabData(windowManager.getExtensionTabIdSync()).done();
      console.log('privacy mode turn on done');
    });
  });
};

let setPrivacyModeOff = function() {
  return Q.when(null, function() {

    let mutePromises = [];
    let playPromises = [];
    let needToDuckIds = [];

    console.log('nonprivatemutestatus', getStateForAllTabs('nonPrivateMuteStatus'));
    console.log('nonprivateplaystatus', getStateForAllTabs('nonPrivatePlayStatus'));

    // If a tqb is already audible while privacy mode is on, then do not
    // restore sound to the old unducked tab.
    // If the user has multiple unducked tabs open during privacy mode, then ending
    // privacy mode will duck all but one (via normal ducking logic)
    return windowManager.getTabs()
    .then(function(tabs) {
      let maybeAudibleUnmutedFound = false;
      tabs.forEach(function(tab) {
        if ((maybeAudible(tab.id)) && (!getState(tab.id, 'mutedCached'))) {
          maybeAudibleUnmutedFound = true;
          console.log(tab.id, 'maybeAudibleUnmutedFound', tab, unduckedTabId_);
        }
      });
      if (maybeAudibleUnmutedFound)
        needToDuckIds.push(unduckedTabId_);

      // Restore muted state
      Object.keys(getStateForAllTabs('nonPrivateMuteStatus')).forEach(function(tabId) {
        if (!((unduckedTabId_ === parseInt(tabId, 10)) && maybeAudibleUnmutedFound)) {
          mutePromises.push(updateMuted(tabId, getState(tabId, 'nonPrivateMuteStatus'), {saveNonPrivate: false, recordLastUnmuted: false, skipPlay: true}, 'Unmuted while restoring from privacy mode.'));
        } else {
          console.log(tabId, 'not unmuting since no longer should be unducked');
        }
      });
      // Restore play state
      Object.keys(getStateForAllTabs('nonPrivatePlayStatus')).forEach(function(tabId) {
        if (!((unduckedTabId_ === parseInt(tabId, 10)) && maybeAudibleUnmutedFound)) {
          playPromises.push(playMusic(tabId, 'Played while restoring from privacy mode.'));
        } else {
          console.log(tabId, 'not playing since no longer should be unducked');
        }
      });

      // We make sure that we update muting/playing prior to enabling privacy mode (so that it unducks the proper tab)
      return Q.allSettled(mutePromises)
      .then(Q.allSettled(playPromises))
      .then(Q.allSettled(duckTabIds(needToDuckIds)))
      .then(function() {
        prefs_.privacyMode = false;
        return prefsStore.save(prefs_)
        .then(updateDucking('privacy mode disabled'))
        .then(updateContextMenus())
        .then(setFavicon())
        .then(function() {
          privacyModeToggleInProgress_ = false;
          sendTabData(windowManager.getExtensionTabIdSync()).done();
          console.log('privacy mode turn off done');
        });
      });
    });
  });
};

let updateStateForUrlChange = function(tab) {
  chromeMisc.ensureMutedInfo(tab);
  console.log(tab.id, 'updateStateForUrlChange', tab.url);
  let promise = Q.when(null);
  if (prefs_.muteBackgroundTabs)
    promise = windowManager.getLastTabId();

  return promise
  .then(function(lastTabId) { // Note that this async can cause tab muting do vary in order (which can break tests)
    let muteInfo = null;
    let domain = getDomain(tab.url);
    let oldDomain = getState(tab.id, 'domainCached');
    let oldDucked = getState(tab.id, 'ducked');
    let oldAudible = getState(tab.id, 'audibleCached');
    let oldMuted = getState(tab.id, 'mutedCached');
    let oldAudibleStart = getState(tab.id, 'lastAudibleStart');

    // console.log("domain: ", domain, getState(tab.id, "domainCached"));

    if (domain !== null) {
      let wasMuted = getState(tab.id, 'mutedCached');
      //console.log("~~~", prefs_.mutedRememberSameDomain, (domain === oldDomain), (!prefs_.disableAutomuting), domain, oldDomain);
      if (prefs_.mutedRememberSameDomain && (domain === oldDomain) && (!prefs_.disableAutomuting)) {
        muteInfo = {should: wasMuted, reason: 'Remember muted for same domain.'};
      } else {
        clearState(tab.id);

        let isWhiteList = prefsStore.domainInList(domain, prefs_.whitelist);
        let isBlackList = prefsStore.domainInList(domain, prefs_.blacklist);
        let isMusic = prefsStore.domainInList(domain, prefs_.musiclist);

        console.log(tab.id, 'onupdate_debug', domain, prefs_, isWhiteList, isBlackList, isMusic, prefs_.muteAllTabs);

        //console.log("lists", isMusic, isWhiteList, isBlackList);
        //console.log(tab, prefs_);
        //console.log((tab.incognito && prefs_.muteNewIncognito && (!isWhiteList) && (!isMusic)));

        if ((prefs_.disableAutomuting) || (getState(tab.id, 'ducked'))) {
          // do nothing
        } else if (tab.incognito && prefs_.muteNewIncognito) {
          muteInfo = {should: true, reason: 'Incognito muted by default.'};
        } else if (prefs_.muteAllTabs) {
          if (isMusic)
            muteInfo = {should: false, reason: 'Not muted by default since on music list.'};
          else if (isWhiteList)
            muteInfo = {should: false, reason: 'Not muted by default since on whitelist.'};
          else
            muteInfo = {should: true, reason: 'Muted by default.'};
        } else if (prefs_.muteBackgroundTabs) { // mute background
          if (tab.id === lastTabId) {
            if (isBlackList)
              muteInfo = {should: true, reason: 'Muted because on blacklist.'};
            else
              muteInfo = {should: false, reason: 'Not muted by default since foreground tab.'};
          } else {
            if (isMusic)
              muteInfo = {should: false, reason: 'Not muted by default since on music list.'};
            else
              muteInfo = {should: true, reason: 'Background muted by default.'};
          }
        } else if (prefs_.unmuteAllTabs) { // unmuted by default
          if (isBlackList)
            muteInfo = {should: true, reason: 'Muted because on blacklist.'};
          else
            muteInfo = {should: false, reason: 'Unmuted by default.'};
        }
      }

      // We set these here rather than earlier to ensure they don't get cleared
      setState(tab.id, 'url', tab.url);
      setState(tab.id, 'urlChanged', new Date());
      setState(tab.id, 'domainCached', domain);
      setState(tab.id, 'audibleCached', oldAudible);
      setState(tab.id, 'mutedCached', oldMuted);
      setState(tab.id, 'ducked', oldDucked);
      setState(tab.id, 'lastAudibleStart', oldAudibleStart); // needed because we don't have an audible event happen to set it if it starts out audible from previous url

      // The purpose of this 'maybe audible' check is determine when a tab is no longer considered to have a recent url change (since it is considered audible before then)
      if (unduckedTabId_ === tab.id)
        addMaybeAudibleCheck(tab.id, URL_CHANGE_WAIT, true); //TODO: set to false if handle multiple untils properly
    }

    let maybeMutePromise = muteInfo ? updateMuted(tab.id, muteInfo.should, {}, muteInfo.reason) : Q.when(null);
    maybeMutePromise
    .then(function() {
      if ((prefs_.privacyMode) && !((prefs_.mutedRememberSameDomain && (domain === oldDomain)))) // mute because of privacy mode unless same domain and remembersamedomain is active
        updateMuted(tab.id, true, {saveNonPrivate: false}, 'Muted due to privacy mode.').done();
    })
    .then(injectMusicApi(tab.id, tab.url, false))
    .then(function() {
      updateContextMenus(); // We update context menus even if it wasn't the active tab that was updated; a little inefficient but there was bug when trying to compare the current tabId
    })
    .done();
  });
};

////////////////////////////////////////////////////////////////////////
// UI-related code (for background page)
////////////////////////////////////////////////////////////////////////

// We batch up requests to improve performance and schedule updating context menus to run in the background
// Does not return a promise.
//
// A tradeoff of this it generates the full context menu from scratch every time.  A reason why
// we don't just use 'update' is there doesn't seem to be a clean way to hide the 'unducked' section
// when ducking isn't enabled instead of greying it out.
let updateContextMenus = function() {
  clearTimeout(updateContextMenusTimeout_);
  updateContextMenusTimeout_ = setTimeout(function() {
    updateContextMenusTimeout_ = null;

    return windowManager.getCurrentTab()
    .then(function(currentTabInfo) {
      if (currentTabInfo === null) {
        console.error("currentTabInfo is null");
        return Q.when(null);
      }
      // console.log("updateContextMenus", currentTabInfo.id, currentTabInfo.url, unduckedTabId_);

      if (updateContextMenusBusy_) {
        console.log(currentTabInfo.id, 'context menus busy');
        return Q.when(null);
      }
      updateContextMenusBusy_ = true;

      return chromeMisc.contextMenusRemoveAll()
      .then(function() {
        try {
          let domain = getDomain(currentTabInfo.url);
          let listType = ((prefs_.muteAllTabs) || ((currentTabInfo.incognito) && prefs_.muteNewIncognito)) ? 'white' : 'black';
          let inList = prefsStore.domainInList(domain, prefs_[listType + 'list']);
          let blackOrWhiteListDomain = prefsStore.getDomainRuleForDomainInList(domain, prefs_[listType + 'list']);
          let inMusicList = prefsStore.domainInList(domain, prefs_.musiclist);
          let inManualDuckingList = prefsStore.domainInList(domain, prefs_.manualduckinglist);
          let unduckedTabContextId;
          
          if (blackOrWhiteListDomain === null)
            blackOrWhiteListDomain = domain;

          let currentTabContextId = chrome.contextMenus.create({
            'title': 'Current tab',
            'contexts': ['page']
          });

          let backgroundTabsContextId = chrome.contextMenus.create({
            'title': 'Background tabs',
            'contexts': ['page']
          });

          let allTabsContextId = chrome.contextMenus.create({
            'title': 'All tabs',
            'contexts': ['page']
          });

          if (!hideDucking_) {
            if (duckingEffectivelyEnabled() && (unduckedTabId_ > 0)) {
              unduckedTabContextId = chrome.contextMenus.create({
                'id': 'unducked_tab',
                'title': 'Unducked tab',
                'contexts': ['page']
              });
            }
          }

          chrome.contextMenus.create({
            'type': 'separator',
            'contexts': ['page']
          });

          chrome.contextMenus.create({
            'id': 'change_privacy_mode',
            'type': 'checkbox',
            'checked': prefs_.privacyMode,
            'title': 'Privacy Mode',
            'contexts': ['page'],
            'enabled': !prefs_.disableAutomuting
          });

          chrome.contextMenus.create({
            'id': 'change_disable_automuting',
            'type': 'checkbox',
            'checked': prefs_.disableAutomuting,
            'title': 'Disable automuting',
            'contexts': ['page'],
            'enabled': !prefs_.privacyMode
          });

          chrome.contextMenus.create({
            'type': 'separator',
            'contexts': ['page']
          });

          chrome.contextMenus.create({
            'id': 'show_options',
            'title': 'Options',
            'contexts': ['page']
          });

          if (getState(currentTabInfo.id, 'mutedCached')) {
            chrome.contextMenus.create({
              'id': 'unmute_current',
              'title': 'Unmute',
              'contexts': ['page'],
              'parentId': currentTabContextId
            });
          } else {
            chrome.contextMenus.create({
              'id': 'mute_current',
              'title': 'Mute',
              'contexts': ['page'],
              'parentId': currentTabContextId
            });
          }

          let isPlaying = getMusicState(currentTabInfo.id, 'isPlaying');
          if (isPlaying !== '') {
            chrome.contextMenus.create({
              'id': isPlaying ? 'pause_current' : 'play_current',
              'title': isPlaying ? 'Pause' : 'Play',
              'contexts': ['page'],
              'parentId': currentTabContextId
            });
          }

          let blackWhiteListCommand = (listType === 'black') ?
                (inList ? 'blacklist_remove' : 'blacklist_add') :
                (inList ? 'whitelist_remove' : 'whitelist_add');

          chrome.contextMenus.create({
            'id': blackWhiteListCommand,
            'title': (inList ? 'Remove ' : 'Add ') + blackOrWhiteListDomain + (inList ? ' from ' : ' to ') + listType + 'list',
            'contexts': ['page'],
            'parentId': currentTabContextId
          });

          chrome.contextMenus.create({
            'id': inMusicList ? 'musiclist_remove' : 'musiclist_add',
            'title': (inMusicList ? 'Remove ' : 'Add ') + getDomain(currentTabInfo.url) + (inMusicList ? ' from ' : ' to ') + 'music list',
            'contexts': ['page'],
            'parentId': currentTabContextId
          });

          if (!hideDucking_) {
            chrome.contextMenus.create({
              'id': inManualDuckingList ? 'manualduckinglist_remove' : 'manualduckinglist_add',
              'title': (inManualDuckingList ? 'Remove ' : 'Add ') + getDomain(currentTabInfo.url) + (inManualDuckingList ? ' from ' : ' to ') + 'manual ducking controls list',
              'contexts': ['page'],
              'parentId': currentTabContextId
            });
          }

          chrome.contextMenus.create({
            'id': 'mute_all',
            'title': 'Mute',
            'contexts': ['page'],
            'parentId': allTabsContextId
          });

          chrome.contextMenus.create({
            'id': 'unmute_all',
            'title': 'Unmute',
            'contexts': ['page'],
            'parentId': allTabsContextId
          });

          chrome.contextMenus.create({
            'id': 'mute_background',
            'title': 'Mute',
            'contexts': ['page'],
            'parentId': backgroundTabsContextId
          });

          if (duckingEffectivelyEnabled() && (unduckedTabId_ > 0)) {
            chrome.contextMenus.create({
              'id': 'show_unducked',
              'title': 'Show',
              'contexts': ['page'],
              'parentId': unduckedTabContextId
            });

            chrome.contextMenus.create({
              'id': 'pause_unducked',
              'title': 'Pause',
              'contexts': ['page'],
              'parentId': unduckedTabContextId,
              'enabled': (getMusicState(unduckedTabId_, 'isPlaying') === true)
            });

            chrome.contextMenus.create({
              'id': 'mute_unducked',
              'title': 'Mute',
              'contexts': ['page'],
              'parentId': unduckedTabContextId,
              'enabled': !(getState(unduckedTabId_, 'mutedCached'))
            });

            chrome.contextMenus.create({
              'id': 'close_unducked',
              'title': 'Close',
              'contexts': ['page'],
              'parentId': unduckedTabContextId
            });
          }
        } catch (ex) {
          console.error(ex);
        }
        updateContextMenusBusy_ = false;

        return Q.when(null);
      });
    });
  }, 50); // delay before actually updating context menus so that we don't do it a bunch of times in a row
};

let showTabsWindow = function() {
  return Q.all([windowManager.getLastFocusedWindow(), windowManager.getExtensionWindowId()])
  .spread(function(currentWindow, extensionWindowId) {
    // Don't activate the extension UI from an existing extension window.
    if (currentWindow.id == extensionWindowId) return null;

    // When the user opens the UI in a separate window (not the popup) and
    // doesn't have "show from all windows" enabled, we need to know which
    // was the last non-extension UI window that was active.
    windowManager.setLastWindowId(currentWindow.id);
    let left = currentWindow.left +
      Math.round((currentWindow.width - EXTENSION_UI_WIDTH) / 2);
    let top = currentWindow.top + PADDING_TOP;
    let height = Math.max(currentWindow.height - PADDING_TOP - PADDING_BOTTOM, 600);
    let width = EXTENSION_UI_WIDTH;

    return windowManager.showExtensionUi(width, height, left, top);
  });
};

let updateTabInfoWithMetaData = function(tabInfo) {
  try {
    let domain = getDomain(tabInfo.url);
    tabInfo.mutedInfo.muted = getState(tabInfo.id, 'mutedCached');
    tabInfo.audible = getState(tabInfo.id, 'audibleCached');
    tabInfo.mutedReason = getState(tabInfo.id, 'mutedReason');
    tabInfo.playPauseReason = getState(tabInfo.id, 'playPauseReason');
    tabInfo.maybeAudible = (tabInfo.audible || maybeAudible(tabInfo.id)) && ((getState(tabInfo.id, 'lastAudibleStart').getTime()));
    tabInfo.isMusic = (prefsStore.domainInList(domain, prefs_.musiclist));
    tabInfo.isManualDucking = (prefsStore.domainInList(domain, prefs_.manualduckinglist));
    tabInfo.ducked = tabInfo.ducked || false;
    tabInfo.domainForWhiteList = prefsStore.getDomainRuleForDomainInList(domain, prefs_.whitelist);
    tabInfo.domainForBlackList = prefsStore.getDomainRuleForDomainInList(domain, prefs_.blacklist);
    tabInfo.isWhiteList = (prefsStore.domainInList(domain, prefs_.whitelist));
    tabInfo.isBlackList = (prefsStore.domainInList(domain, prefs_.blacklist));
    tabInfo.isPlaying = getMusicState(tabInfo.id, 'isPlaying');
    tabInfo.song = getMusicState(tabInfo.id, 'song');
    tabInfo.artist = getMusicState(tabInfo.id, 'artist');
    tabInfo.captured = getState(tabInfo.id, 'tabCaptured');
    tabInfo.mutingError = getState(tabInfo.id, 'mutingError');
    tabInfo.supportedPlayer = getState(tabInfo.id, 'hasCustomMusicController');
    //console.log("tabinfo with domain for lists", tabInfo);
  } catch (ex) {
    console.error(ex);
  }
};

let sendTabData = function(senderTabId) {
  try {
    return windowManager.getTabs()
    .then(function(tabs) {

      let listType = (prefs_.muteAllTabs || prefs_.muteBackgroundTabs) ? 'white' : 'black';
      let tabIdDict = {};
      let currentTabs = [];
      let mostRecentlyAudibleTabs = [];
      let audibleTabs = [];
      let recentlyAudibleTabs = [];
      let duckedTabs = [];
      let musicTabs = [];
      let otherTabs = [];

      tabs.forEach(function(tab) {
        tabIdDict[tab.id] = tab;
      });

      unduckingOrder_.forEach(function(tabId) {
        if (!getState(tabId, 'ducked'))
          return;
        let tabInfo = tabIdDict[tabId];
        updateTabInfoWithMetaData(tabInfo);
        tabInfo.ducked = true;
        tabInfo.category = 'Ducked';
        duckedTabs.push(tabInfo);
      });

      if ((tabs || []).length) {
        tabs.forEach(function(tabInfo) {
          try {
            updateTabInfoWithMetaData(tabInfo);

            if (tabInfo.id === windowManager.getLastTabIdSync()) {
              let currentTabInfo = JSON.parse(JSON.stringify(tabInfo));

              console.log("currenttabinfo", currentTabInfo);

              currentTabInfo.isCurrent = true;
              currentTabInfo.category = 'Current tab';
              currentTabs = [currentTabInfo];
            }

            if (tabInfo.ducked || false) // Ducked tabs were included earlier
              return;

            // order here matters for setting categories
            if ((((tabInfo.audible) || (tabInfo.isPlaying)) &&
                (!tabInfo.mutedInfo.muted)) &&
                (((getState(tabInfo.id, 'lastAudibleStart').getTime())))) {
              tabInfo.category = 'Noisy or playing tabs';
              audibleTabs.push(tabInfo);
            } else if (((!tabInfo.mutedInfo.muted) && (tabInfo.maybeAudible)) && duckingEffectivelyEnabled()) {
              tabInfo.category = 'Most recently noisy or playing tab';
              mostRecentlyAudibleTabs.push(tabInfo);
            } else if (wasRecentlyAudible(tabInfo.id)) {
              tabInfo.category = 'Recently noisy or playing tabs';
              recentlyAudibleTabs.push(tabInfo);
            } else {
              if ((prefs_.showOtherTabs) && (tabInfo.id !== windowManager.getLastTabIdSync())) {
                tabInfo.category = 'Other tabs';
                otherTabs.push(tabInfo);
              }
            }
          } catch (ex) {
            console.error(ex);
          }
        });
      }

      // combine tabs back together in order that will be used in UI
      let tabLists = [currentTabs, audibleTabs, mostRecentlyAudibleTabs, duckedTabs, recentlyAudibleTabs, musicTabs, otherTabs];

      let newData = {};
      newData.tabs = [];
      tabLists.forEach(function(tabList) {
        newData.tabs = newData.tabs.concat(tabList);
      });
      newData.listType = listType;
      newData.incognitoListType = prefs_.muteNewIncognito ? 'white' : newData.listType;
      newData.activeListType = prefs_.muteBackgroundTabs ? 'black' : listType;
      newData.showOtherTabs = prefs_.showOtherTabs;
      newData.simulationMode = false;
      newData.privacyMode = prefs_.privacyMode;
      newData.disableAutomuting = prefs_.disableAutomuting;
      newData.senderTabId = senderTabId;
      newData.noisesPrevented = parseInt(localStorage.noisesPrevented || 0, 10);
      newData.duckingEffectivelyEnabled = duckingEffectivelyEnabled();
      newData.loggingEnabled = loggingEnabled_;
      newData.privacyModeToggleInProgress = privacyModeToggleInProgress_;

      if (logTypeEnabled_.ui)
        console.log('sendTabData data', newData);
      return newData;
    });
  } catch (ex) {
    console.error(ex);
    return Q.when(null);
  }
};

// We refresh the UI from the background when our state changes
// and the user might have the UI already open.  This happens when:
// we detect an audible or muted change from a tab or when music
// ducking/unducking.  Normally the UI will be updated by calling this
// method from the ReactJS code.
let refreshUi = function() {
  clearTimeout(refreshUiTimeout_);
  refreshUiTimeout_ = setTimeout(function() {
    let popupFound = false;
    let views = chrome.extension.getViews();
    views.forEach(function(view) {
      if (view.location.href === chrome.extension.getURL('build/html/popup.html'))
        popupFound = true;
    });
    if (popupFound) {
      // console.log("refresh ui!");
      if (typeof reactUi_ !== 'undefined')
        reactUi_.refreshTabs();
    }
    refreshUiTimeout_ = null;
  }, 10); // delay before actually updating UI so that we don't do it a bunch of times in a row
};

// Note that this method does not return a promise or use a callback but is async (we don't care about waiting for it right now)
let refreshUiCountDown = function() {
  let displayedCountDownVal = duckingCountDown_;
  displayedCountDownVal = Math.ceil(displayedCountDownVal);
  let alreadyAudibleOrPlaying = ((unduckedTabId_ !== -1) && (getAudibleOrPlaying(unduckedTabId_) || false));
  // console.log("refreshuicountdown", unduckedTabId_, unduckingOrder_, displayedCountDownVal, alreadyAudibleOrPlaying, getState(tabId, "audibleCached"), getMusicState(unduckedTabId_, "isPlaying"), getState(unduckedTabId_, "playInProgress"));
  if ((prefs_.minTimeBeforeUnducking >= prefs_.audioNotifierDelay + 1) && 
      (!alreadyAudibleOrPlaying) && getFirstDuckedTabId() && 
      (displayedCountDownVal > 0) && (displayedCountDownVal !== Number.MAX_SAFE_INTEGER))
  {
    browserActionUnduckMessage_ = ': Your music will be unducked in ' + displayedCountDownVal + ' seconds.';
    chrome.browserAction.setBadgeText({text: displayedCountDownVal + ' s'});
  } else {
    browserActionUnduckMessage_ = '';
    chrome.browserAction.setBadgeText({text: ''});
  }
  chrome.browserAction.setTitle({
    title: browserActionTitle_ + browserActionMode_ + browserActionUnduckMessage_
  });
};

let getMutingBehaviorString = function() {
  let str = '';
  if (prefs_.disableAutomuting) {
    str += '\n(Automuting is disabled)';
  } else if (prefs_.privacyMode) {
    str += '\n(Privacy mode)';
  } else {
    if (prefs_.muteAllTabs)
      str += ', mutes tabs by default';
    else if (prefs_.muteBackgroundTabs)
      str += ', mutes background tabs by default';
    if (prefs_.muteNewIncognito)
      str += ', mutes incognito tabs by default';
    if (prefs_.mutedRememberSameDomain)
      str += ', remembers muted for same domain';
    if (prefs_.enableDucking)
      str += ', ducks music';

    if (str.length) {
      str = str.substr(2); // Remove first comma and space
      str = '\nAutomuting behavior: ' + str + '.';
    }

    let inManualDuckingList = false;
    if ((unduckedTabId_ !== -1) && duckingEffectivelyEnabled())
      inManualDuckingList = prefsStore.domainInList(getState(unduckedTabId_, 'domainCached'), prefs_.manualduckinglist);
    if (inManualDuckingList && getState(unduckedTabId_, 'lastAudibleStart').getTime())
      str += '\nManual intervention required to return to music in another tab.';
  }
  return str;
};

let setFavicon = function() {
  return Q.fcall(function() {
    let faviconFileName = 'build/img/favicon.png';

    let inManualDuckingList = false;
    if (unduckedTabId_ !== -1) {
      inManualDuckingList = prefsStore.domainInList(getState(unduckedTabId_, 'domainCached'), prefs_.manualduckinglist);
    }

    if (prefs_.privacyMode) {
      faviconFileName = 'build/img/privacymode.png';
    } else if (prefs_.disableAutomuting) {
      faviconFileName = 'build/img/disableautomuting.png';
    } else if (inManualDuckingList && (!getState(unduckedTabId_, 'mutedCached')) && getState(unduckedTabId_, 'lastAudibleStart').getTime()) {
      faviconFileName = 'build/img/manualmode_favicon.png';
    }

    browserActionMode_ = getMutingBehaviorString();
    chrome.browserAction.setTitle({
      title: browserActionTitle_ + browserActionMode_ + browserActionUnduckMessage_
    });
    return chromeMisc.setBrowserActionIcon({
      path: faviconFileName
    });
  });
};

////////////////////////////////////////////////////////////////////////
// Music Controls
////////////////////////////////////////////////////////////////////////

let clearPlayAndPauseInProgressIfExpired = function(tabId) {
  let playInProgressTimestamp = getState(tabId, 'playInProgress');
  if ((playInProgressTimestamp !== new Date(0)) && ((new Date().getTime() - playInProgressTimestamp.getTime()) > PLAY_PAUSE_WAIT * 1000)) {
    // console.log(tabId, "clearing playinprogress");
    setState(tabId, 'playInProgress', new Date(0));
    setState(tabId, 'playInProgressExpired', true);
  }
  let pauseInProgressTimestamp = getState(tabId, 'pauseInProgress');
  if ((pauseInProgressTimestamp !== new Date(0)) && ((new Date().getTime() - pauseInProgressTimestamp.getTime()) > PLAY_PAUSE_WAIT * 1000)) {
    // console.log(tabId, "clearing pauseinprogress");
    setState(tabId, 'pauseInProgress', new Date(0));
    setState(tabId, 'pauseInProgressExpired', true);
  }
};

let playMusic = function(tabId, reason) {
  if (prefs_.disablePlayPause)
    return Q.when(null);

  return Q.fcall(function() {
    if (isPlayingOrPlayInProgress(tabId))
      return Q.when(null);

    if (logTypeEnabled_.music)
      console.log(tabId, 'playMusic', reason, getMusicState(tabId, 'isPlaying'));

    setState(tabId, 'playInProgress', new Date());
    setState(tabId, 'pauseInProgress', new Date(0));
    setState(tabId, 'playInProgressReason', reason);
    setState(tabId, 'playInProgressExpired', false);

    addMaybeAudibleCheck(tabId, PLAY_PAUSE_WAIT, false);
    chromeMisc.tabsSendMessage(parseInt(tabId, 10), {'action': 'playPause',
                                       'customOnly': getState(tabId, 'hasCustomMusicController'),
                                       'intendedCommand': 'play'},
                                      {});
    return null;
  });
};

let pauseMusic = function(tabId, reason) {
  if (prefs_.disablePlayPause)
    return Q.when(null);

  return Q.fcall(function() {
    if (!isPausedOrPauseInProgress(tabId)) {
      if (logTypeEnabled_.music)
        console.log(tabId, 'pauseMusic', reason);

      setState(tabId, 'pauseInProgress', new Date());
      setState(tabId, 'playInProgress', new Date(0));
      setState(tabId, 'pauseInProgressReason', reason);
      setState(tabId, 'pauseInProgressExpired', false);

      addMaybeAudibleCheck(tabId, PLAY_PAUSE_WAIT, false);
      chromeMisc.tabsSendMessage(parseInt(tabId, 10), {'action': 'playPause',
                                         'customOnly': getState(tabId, 'hasCustomMusicController'),
                                         'intendedCommand': 'pause'},
                                        {});
    }
    return Q.when(null);
  });
};

let pauseCurrent = function() {
  return windowManager.getCurrentTab()
  .then(function(tabInfo) {
    return pauseMusic(tabInfo.id, 'Paused by user via MuteTab context menu.');
  });
};

let playCurrent = function() {
  return windowManager.getCurrentTab()
  .then(function(tabInfo) {
    return updateMuted(tabInfo.id, false, {}, 'Unmuted by user when playing via MuteTab context menu.')
    .then(playMusic(tabInfo.id, 'Played by user via MuteTab context menu.'));
  });
};

let muteOrPauseUnducked = function() {
  if (unduckedTabId_ !== -1) {
    return (getMusicState(unduckedTabId_, 'isPlaying'))
      ? pauseMusic(unduckedTabId_, 'Paused by user as \'unducked tab\' via keyboard shortcut.')
      : updateMuted(unduckedTabId_, true, {}, 'Muted by user as \'unducked tab\' via keyboard shortcut.');
  }
  return Q.when(null);
};

let injectMusicApi = function(tabId, url, injectDefault) {
  if (!injectingEnabled_) {
    return Q.when(null);
  }

  // Note: it is now okay to inject multiple times into the same tab.
  // We do this rarely and the script makes sure it doesn't run more
  // than once (used to check here if it already injected and bail if so)
  if (url.startsWith('chrome://'))
    return Q.when(false);
  if (url.startsWith('chrome-devtools://'))
    return Q.when(false);
  if (url.startsWith('chrome-extension://'))
    return Q.when(false);
  if (url.startsWith('https://chrome.google.com/webstore'))
    return Q.when(false);
  if (url.startsWith('data:'))
    return Q.when(false);

  if (logTypeEnabled_.injected)
    console.log(tabId, 'injectMusicApi', url, injectDefault);

  return Q.when(null)
  .then(function() {
    let promises = [Q.when(null)];

    let disableDefaultController = false;
    let allFrames = false;
    let controllerFileName = musicControllers.getController(url);

    if (controllerFileName !== null)
      setState(tabId, 'hasCustomMusicController', true);

    if (controllerFileName !== null) {
      //disableDefaultController = (controllerFileName === "YoutubeController.js");
      disableDefaultController = true;
      if (logTypeEnabled_.injected)
        console.log(tabId, 'controllerFileName', controllerFileName);
      controllerFileName = './build/js/music_controllers/' + controllerFileName;
      promises.push(chromeMisc.executeScript(tabId, {file: controllerFileName, allFrames: allFrames}));
    } else if (injectDefault) {
      // We only load the default controller into tabs that don't have a custom one since we'll just disable it
      // and ignore it's messages anyway. Move this code before the if block if this requirement changes.
      // The reason we use it as a contentscript in the manifest is that this ensures it is loaded within
      // all frames (especially useful for reddit and facebook).
      promises.push(chromeMisc.executeScript(tabId, {file: './build/js/DefaultController.js', allFrames: true}));
    }
    return Q.allSettled(promises)
    .then(function() {
      // console.log(tabId, "injectMusicApi promises finished");
      return (disableDefaultController)
        ? chromeMisc.tabsSendMessage(parseInt(tabId, 10), {'action': 'disable'}, {})
        : Q.when(true);
    });
  }).catch(function(err) {
    console.error(err);
  });
};

// We set isPlaying to true if at least one frame is playing
// Otherwise, if at least one frame is paused we set it to false
// And if we have no playing or paused, we set it as null
let computeStateDataAcrossFrames = function(tabId) {
  // console.log(tabId, "computeStateDataAcrossFrames", musicStateForFrame_[tabId]);
  let playCount = 0;
  let pauseCount = 0;
  let savePausedCount = 0;
  let noContentCount = 0;
  let siteName = null;
  let musicStateForFrame = getState(tabId, 'musicStateForFrame');
  let keys = Object.keys(musicStateForFrame);
  keys.forEach(function(key) {
    playCount += getState(tabId, 'musicStateForFrame')[key].playCount;
    pauseCount += getState(tabId, 'musicStateForFrame')[key].pauseCount;
    savePausedCount += getState(tabId, 'musicStateForFrame')[key].savePausedCount;
    noContentCount += getState(tabId, 'musicStateForFrame')[key].noContentCount || 0;
    if (siteName === null)
      siteName = getState(tabId, 'musicStateForFrame')[key].siteName;
  });
  if (logTypeEnabled_.injected)
    console.log(tabId, 'computeAcrossFrames', playCount, pauseCount, savePausedCount, noContentCount);

  let musicStateData = {};
  if (playCount > 0)
    musicStateData.isPlaying = true;
  else if ((savePausedCount > 0) || ((pauseCount === 1))) // only allow clicking play if there is just one source
    musicStateData.isPlaying = false;
  else
    musicStateData.isPlaying = null;

  musicStateData.siteName = siteName;
  musicStateData.artist = null;
  musicStateData.song = null;

  // console.log(tabId, "computed across frames", musicStateData);
  return musicStateData;
};

// We don't update audible or playing if ducking is enabled, a site has been audible at least once for the
// current url, and a site is on the 'manual ducking controls list'
//
// This lets us not constantly duck/unduck a site that doesn't play audio consistently
// It is okay to update audibleCached, though.
let okayToUpdateAudibleOrPlaying = function(tabId) {
  return !prefs_.enableDucking ||
        (getNeverAudibleForUrl(tabId) ||
        !prefsStore.domainInList(getState(tabId, 'domainCached'), prefs_.manualduckinglist));
};

let updateMusicStateData = function(tabId, musicStateData) {
  if (tabId === windowManager.getExtensionTabIdSync())
    return Q.when(null);

  if (prefs_.disablePlayPause)
    return Q.when(null);

  // Ignore HTML5 player state data for sites that have a custom player
  if ((getState(tabId, 'hasCustomMusicController') === true) && (musicStateData.fromDefaultController || null))
    return Q.when(null);

  return windowManager.getCurrentTab()
  .then(function(tabInfo) {
    if (musicStateData.hasOwnProperty('frameId')) {
      let musicStateForFrames = getState(tabId, 'musicStateForFrame');

      musicStateForFrames[musicStateData.frameId] = musicStateData;
      setState(tabId, 'musicStateForFrame', musicStateForFrames);
      musicStateData = computeStateDataAcrossFrames(tabId);
    }

    let firstInfo = false;

    let storedMusicStateData = getState(tabId, 'musicStateData');

    if (!storedMusicStateData) {
      // Set if first info for tab
      firstInfo = true;
      setState(tabId, 'musicStateData', musicStateData);
    } else if ((storedMusicStateData.isPlaying !== musicStateData.isPlaying) ||
               (storedMusicStateData.artist !== musicStateData.artist) ||
               (storedMusicStateData.song !== musicStateData.song) ||
               (storedMusicStateData.autoplayCountdown !== musicStateData.autoplayCountdown)
              ) {
      // Update state, UI if changed
      setState(tabId, 'musicStateData', musicStateData);
      refreshUi();
    }

    if (firstInfo || (storedMusicStateData.isPlaying !== musicStateData.isPlaying)) {
      if (musicStateData.isPlaying === true) {
        // Don't treat it as ducked if played and unmuted (before it would pause again via pauseAllUnmutedDucked)
        if (!getState(tabId, 'mutedCached')) {
          removeFromArray(unduckingOrder_, tabId);
        }

        if (okayToUpdateAudibleOrPlaying(tabId)) {
          let now = new Date();
          if (now.getTime() - (getState(tabId, 'playInProgress').getTime()) < PLAY_PAUSE_WAIT * 1000) {
            setState(tabId, 'lastPlayed', getState(tabId, 'playInProgress'));
            setState(tabId, 'playPauseReason', getState(tabId, 'playInProgressReason'));
          } else {
            setState(tabId, 'lastPlayed', now);
            setState(tabId, 'playPauseReason', 'Played via webpage.');
          }
          setState(tabId, 'playInProgress', new Date(0));
          setState(tabId, 'playInProgressExpired', false);
        }
      } else if (musicStateData.isPlaying === false) {
        if (okayToUpdateAudibleOrPlaying(tabId)) {
          setState(tabId, 'lastPaused', new Date());
          if (getState(tabId, 'lastPaused').getTime() - (getState(tabId, 'pauseInProgress').getTime()) < PLAY_PAUSE_WAIT * 1000) {
            setState(tabId, 'lastPaused', getState(tabId, 'pauseInProgress'));
            setState(tabId, 'playPauseReason', getState(tabId, 'pauseInProgressReason'));
          } else {
            setState(tabId, 'playPauseReason', 'Paused via webpage.');
          }
          setState(tabId, 'pauseInProgress', new Date(0));
          setState(tabId, 'pauseInProgressExpired', false);
        }
      }

      if (prefs_.enableDucking) {
        let timeToCheck = (musicStateData.isPlaying) ? prefs_.minTimeBeforeDucking : prefs_.minTimeBeforeUnducking;
        addMaybeAudibleCheck(tabId, timeToCheck, true);
      }
      refreshUi();
      if (logTypeEnabled_.music)
        console.log(tabId, 'updateMusicStateData done', new Date(), musicStateData);
    }

    if ((tabInfo.id === tabId) || (tabId === unduckedTabId_))
      updateContextMenus();

    return Q.when(null);
  });
};

let getMusicState = function(tabId, field) {
  let musicStateData = getState(tabId, 'musicStateData');
  if ((musicStateData === null) ||
      (!musicStateData.hasOwnProperty(field)) ||
      (musicStateData[field] === null)) {
    return '';
  }

  return musicStateData[field];
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Music Ducking
////////////////////////////////////////////////////////////////////////////////////////////////

let moveToFrontOfUnduckingOrder = function(tabId) {
  console.log(tabId, "moveToFrontOfUnduckingOrder");
  let index = unduckingOrder_.indexOf(tabId);
  if (index >= 0) {
    removeFromArray(unduckingOrder_, tabId);    
  }
  unduckingOrder_.unshift(tabId);
};

// Returns when most recently became silent or paused (or new Date(0) if neither)
let getLastSilentOrPaused = function(tabId) {
  let lastAudibleEnd = getState(tabId, 'lastAudibleEnd');
  let lastPaused = getState(tabId, 'lastPaused');
  let results = (lastAudibleEnd > lastPaused) ? lastAudibleEnd : lastPaused;
  return results;
};

// Returns when most recently became audible or played (or new Date(0) if neither)
let getLastAudibleOrPlayed = function(tabId) {
  let lastAudibleStart = getState(tabId, 'lastAudibleStart');
  let lastPlayed = getState(tabId, 'lastPlayed');
  let lastPlayInProgress = getState(tabId, 'playInProgress');
  return new Date(Math.max.apply(null, [lastAudibleStart, lastPlayed, lastPlayInProgress]));
};

let getAudibleOrPlaying = function(tabId) {
  let audible = getState(tabId, 'audibleCached') || false;
  // let isPlaying = isPlayingOrPlayInProgress(tabId);
  let isPlaying = ((getMusicState(tabId, 'isPlaying') === true) ||
                   ((new Date().getTime() - getState(tabId, 'playInProgress').getTime()) < (PLAY_PAUSE_WAIT * 1000)));
  return ((audible || isPlaying));
};

let isPlayingOrPlayInProgress = function(tabId) {
  clearPlayAndPauseInProgressIfExpired(tabId);

  return ((getMusicState(tabId, 'isPlaying') === true) || getState(tabId, 'playInProgress').getTime());
};

let isPausedOrPauseInProgress = function(tabId) {
  clearPlayAndPauseInProgressIfExpired(tabId);

  let result = ((getMusicState(tabId, 'isPlaying') === false) || getState(tabId, 'pauseInProgress').getTime());
  return result;
};

let getNeverAudibleForUrl = function(tabId) {
  // console.log(tabId, "going to check never audible for url", !getState(tabId, "audibleCached"), (!(getState(tabId, "lastAudibleStart").getTime()), (getState(tabId, "urlChanged").getTime() > getState(tabId, "lastAudibleEnd").getTime())));
  return ((!getState(tabId, 'audibleCached')) &&
           (!(getState(tabId, 'lastAudibleStart').getTime()) ||
           (getState(tabId, 'urlChanged').getTime() > getState(tabId, 'lastAudibleEnd').getTime())));
};

// Returns countdown in seconds
let getUrlChangeCountdown = function(tabId) {
  return (URL_CHANGE_WAIT) - (new Date().getTime() - getState(tabId, 'urlChanged').getTime()) / 1000;
};

// Return how many more seconds of silence must occur before we allow unducking another tab.
// (Reason: tab might be in a 'lul' in a video and we don't want it to jump back.)
let getCountdownForUnducking = function(tabId, ignoreAudibleOrPlaying) {
  if (tabId == -1)
    return 0;

  // If it ever played and is on the manual ducking controls list, then it will stay unducked until the url is no longer active
  let domainIsInList = prefsStore.domainInList(getState(tabId, 'domainCached'), prefs_.manualduckinglist);
  if ((getState(tabId, 'lastAudibleStart').getTime()) && (domainIsInList)) {
    if (logTypeEnabled_.duckingReasoning)
      console.log(tabId, 'reason: has been audible and is on manual ducking controls list');
    return Number.MAX_SAFE_INTEGER;
  }

  // If url was just changed on unducked tab, then apply the normal countdown from the tab's load time.
  // Means that if it was unducked before, it will stay that way.
  let urlChangeCountdown = getUrlChangeCountdown(tabId);
  if ((urlChangeCountdown > 0) && (tabId === unduckedTabId_)) {
    if (logTypeEnabled_.duckingReasoning)
      console.log(tabId, 'reason: urlchanged; full state is ', getFullState(tabId));

    return urlChangeCountdown;
  }

  // No countdown if it never played audio for current url. (Lets us ignore silent ads and similar.)
  if (getNeverAudibleForUrl(tabId)) {
    if (logTypeEnabled_.duckingReasoning)
      console.log(tabId, 'reason: never audible');
    return 0;
  }

  if (!ignoreAudibleOrPlaying) {
    // If audible, wait is potentially forever.
    if ((tabId === -1) || getAudibleOrPlaying(tabId)) {
      if (logTypeEnabled_.duckingReasoning)
        console.log(tabId, 'reason: audible or playing');
      return Number.MAX_SAFE_INTEGER;
    }
  }

  let now = new Date();
  let countDown;
  let prevAudibleDuration = getPrevAudibleDuration(tabId);

  if (prevAudibleDuration > 0) {
    prevAudibleDuration -= prefs_.audioNotifierDelay; // Subtract out the time we have waited for the audio indicator to go away
    if (prevAudibleDuration < 0)
      prevAudibleDuration = 0;
  }

  // Use the user's preference after subtracting away the audio indicator time
  let unduckWait = prefs_.minTimeBeforeUnducking;

  if ((getState(tabId, 'hasCustomMusicController')) &&
      (!getState(tabId, 'audibleCached')) && (!isPlayingOrPlayInProgress(tabId)) &&
      (getState(tabId, 'lastPlayed').getTime())) {

    unduckWait = prefs_.minTimeBeforeUnduckingPaused; // use different (likely shorter) delay for supported sites
  }

  if (tabId !== unduckedTabId_)
    unduckWait += DUCKED_TIMEOUT_EXTRA_WAIT; // It doesn't make sense to clear ducked tabs right away in case they need to play sound again.
  let duckWait = prefs_.minTimeBeforeDucking - prefs_.audioNotifierDelay;
  let timeSinceAudibleBecameFalse = (now.getTime() - getLastSilentOrPaused(tabId).getTime()) / 1000 + prefs_.audioNotifierDelay;
  setState(tabId, '_timeSinceAudibleBecameFalse', timeSinceAudibleBecameFalse);
  if ((prevAudibleDuration < unduckWait - prefs_.audioNotifierDelay) || (prevAudibleDuration < duckWait))
    countDown = 0; // If it isn't audible long, then unduck after we know it isn't audible anymore (i.e. two seconds)
  else
    countDown = unduckWait - timeSinceAudibleBecameFalse;

  if (logTypeEnabled_.duckingReasoning) {
    console.log(tabId, 'reason: ducking timeout prefs');
    console.log(tabId, 'countdown nums', countDown, unduckWait, timeSinceAudibleBecameFalse, getLastSilentOrPaused(tabId).getTime() / 1000);
  }

  return countDown;
};

// Returns duration in seconds
// If a previous sound was longer than the current one, it returns the length of that.
let getPrevAudibleDuration = function(tabId) {
  let lastAudibleOrPlayed = getLastAudibleOrPlayed(tabId);
  let lastSilentOrPaused = getLastSilentOrPaused(tabId);

  // console.log(tabId, "getPrevAudibleDuration",  lastSilentOrPaused > lastAudibleOrPlayed, getFullState(tabId));

  let prevAudibleDuration = 0; // by default, assume there is no sound
  // console.log(tabId, "getprevaudibleduration", lastAudibleOrPlayed, lastSilentOrPaused);
  if ((lastSilentOrPaused > lastAudibleOrPlayed) && (lastAudibleOrPlayed.getTime() !== 0)) {
    //console.log(tabId, "previous sound");
    prevAudibleDuration = lastSilentOrPaused.getTime() - lastAudibleOrPlayed.getTime(); // previous sound
    setState(tabId, 'longestPrevDuration', Math.max(getState(tabId, 'longestPrevDuration'), prevAudibleDuration));
  } else if (lastAudibleOrPlayed !== new Date(0)) {
    //console.log(tabId, "ongoing sound");
    prevAudibleDuration = new Date().getTime() - lastAudibleOrPlayed.getTime(); // ongoing sound
  }

  let longestAudibleDuration = getState(tabId, 'longestPrevDuration');
  prevAudibleDuration = Math.max(longestAudibleDuration, prevAudibleDuration);

  setState(tabId, '_prevAudibleDuration', prevAudibleDuration);

  return prevAudibleDuration / 1000;
};

// Waits out short notifications or nonaudible playing tabs for ducking purposes
let audibleTooShort = function(tabId) {
  // If it ever played and is on the Manual Ducking Controls list, then it will stay unducked until the url is no longer active
  let domainIsInList = prefsStore.domainInList(getState(tabId, 'domainCached'), prefs_.manualduckinglist);
  if ((getState(tabId, 'lastAudibleStart').getTime()) && (domainIsInList))
    return false;

  // If it is playing, then we require it made a sound at some point to be
  // considered audible for long enough but don't care how long it was audible.
  // This lets us ignore silent HTML5 ads, silent vines, etc.
  // Otherwise, compare duration of most recent sound with the user's preference
  // Note that this behavior is problematic for telegram notifications (it doesn't let us ignore them.)
  if (isPlayingOrPlayInProgress(tabId)) {
    if (logTypeEnabled_.duckingReasoning)
      console.log(tabId, 'audibleTooShort1', (getState(tabId, 'lastAudibleStart') === 0));
    return (getState(tabId, 'lastAudibleStart').getTime() === 0);
  }

  let prevAudibleDuration = getPrevAudibleDuration(tabId);

  if (logTypeEnabled_.duckingReasoning)
    console.log(tabId, 'audibleTooShort2', prevAudibleDuration, prefs_.minTimeBeforeDucking);

  return (prevAudibleDuration < prefs_.minTimeBeforeDucking);
};

let inaudibleTooLong = function(tabId) {
  // console.log(tabId, "countdown=", getCountdownForUnducking(tabId, false));

  return (getCountdownForUnducking(tabId, false) <= 0);
};

let wasRecentlyAudible = function(tabId) {
  let lastAudibleAndUnmutedDelta = new Date().getTime() -
                                   getState(tabId, 'lastAudibleAndUnmuted').getTime();

  return (lastAudibleAndUnmutedDelta < 60 * 60 * 1000); // last hour
};

// Indicates if we should treat a tab as audible from a ducking perspective.
let maybeAudible = function(tabId) {
  let tooShort = audibleTooShort(tabId);
  let tooLong = inaudibleTooLong(tabId);
  setState(tabId, '_audibleTooShortCached', tooShort);
  setState(tabId, '_inaudibleTooLongCached', tooLong);
  if (logTypeEnabled_.duckingReasoning)
    console.log(tabId, 'maybeAudible', !tooShort, !tooLong);

  return (!tooShort && !tooLong);
};

let initMusicDucking = function() {
  if ((!prefs_.enableDucking) && (getFirstDuckedTabId() === null))
    return;

  stopMusicDucking();
  musicDuckingIntervalId_ = setInterval(function() {
    let checkMaybeAudibleAll = getStateForAllTabs('checkMaybeAudible');
    let shouldUpdateDucking = false;
    let reason = '';

    checkMaybeAudibleCount_++;
    checkMaybeAudibleCount_ %= 1000; // prevent overflow

    // console.log("checking maybeaudible", checkMaybeAudibleAll);

    let now = new Date();
    let updateFrequently = false;
    Object.keys(checkMaybeAudibleAll).forEach(function(tabId) {
      if (checkMaybeAudibleAll[tabId].checkMaybeAudible === null)
        return;

      if (checkMaybeAudibleAll[tabId].checkMaybeAudible.updateFrequently)
        updateFrequently = true;

      // TODO: remove this block if we allow multiple untils
      let until = checkMaybeAudibleAll[tabId].checkMaybeAudible.until;
      let isDate = until instanceof Date && !isNaN(until.valueOf());
      if (!isDate) {
        console.error(tabId, 'not a date', until);
      }
      if ((now.getTime() > until.getTime()) || !isDate) {
        setState(tabId, 'checkMaybeAudible', getDefaultState('checkMaybeAudible'));
        updateDucking(tabId + ' - ducking interval over')
        .done(); // force it to run once at end (TODO: make code less dependent on this)
      }

      // Remove if expired or not a date
      /*      let untilsToRemove = [];      //TODO: allow multiple untils
            let updateDuckingSinceUntilReached = false;
            Object.keys(checkMaybeAudibleAll[tabId].checkMaybeAudible.until).forEach(function(until) {
              let isDate = until instanceof Date && !isNaN(until.valueOf());
              if (!isDate) {
                console.error(tabId, "not a date", until);
                untilsToRemove.push_back(until);
              }
              if ((now.getTime() > until.getTime()) || !isDate) {
                untilsToRemove.push_back(until);
                updateDuckingSinceUntilReached = true;
              }
            });
            if (updateDuckingSinceUntilReached)
              updateDucking(tabId + " - ducking interval over").done(); // Force it to run once at end (TODO: make this not necessary)

            untilsToRemove.forEach(function(until) {
              removeFromArray(checkMaybeAudibleAll[tabId].checkMaybeAudible.until, until);
            });
            if (checkMaybeAudibleAll[tabId].checkMaybeAudible.until.length === 0)
              delete checkMaybeAudibleAll[tabId].checkMaybeAudible;
            */

      let maybeAudibleResult = maybeAudible(tabId);
      if (((maybeAudibleResult !== checkMaybeAudibleAll[tabId].checkMaybeAudible.maybeAudible)) ||
          ((tabId === unduckedTabId_) && (maybeAudibleResult === false))) {
        let checkMaybeAudible = getState(tabId, 'checkMaybeAudible');
        if (checkMaybeAudible !== null) {
          shouldUpdateDucking = true;
          reason += ' [' + tabId.toString() + ' maybeaudible is ' + maybeAudibleResult + ']';
          checkMaybeAudible.maybeAudible = maybeAudibleResult;
          setState(tabId, 'checkMaybeAudible', checkMaybeAudible);
        }
      }
    });

    if ((updateFrequently) && (checkMaybeAudibleCount_ % 5 === 0)) {
      updateDucking('try updating ducking a lot').done(); // TODO
    }

    checkMaybeAudibleAll = getStateForAllTabs('checkMaybeAudible');
    if (Object.keys(checkMaybeAudibleAll).length === 0) {
      stopMusicDucking();
      return;
    }

    let promise = shouldUpdateDucking ? updateDucking(reason) : updateCountdownForUnducked();
    promise.done();
  }, prefs_.duckingInterval * 1000);
  console.log('ducking interval started');
};

let stopMusicDucking = function() {
  if ((!prefs_.enableDucking) && (getFirstDuckedTabId() === null))
    return;

  console.log('stopping music ducking interval...');
  clearInterval(musicDuckingIntervalId_);
  musicDuckingIntervalId_ = 0;
};

// timeToCheck is in seconds; we add an extra second before removing the record to deal with timing issues
let addMaybeAudibleCheck = function(tabId, timeToCheck, updateFrequently) {
  if (tabId === windowManager.getExtensionTabIdSync())
    return;

  let until = new Date(new Date().getTime() + (1 + timeToCheck) * 1000);

  // Update checkMaybeAudible to include new time
  let checkMaybeAudible = getState(tabId, 'checkMaybeAudible');
  /* TODO: multiple untils
    if (!checkMaybeAudible) {
      checkMaybeAudible = { until: [until], maybeAudible: null, updateFrequently: updateFrequently };
    } else {
      checkMaybeAudible.until.push(until);

      console.log(tabId, "checkMaybeAudible updated to", checkMaybeAudible);
      setState(tabId, "checkMaybeAudible", checkMaybeAudible);
    }
*/

  //TODO: multiple untils - remove this block
  if ((!checkMaybeAudible) || (until.getTime() > checkMaybeAudible.until.getTime())) {
    //console.log(tabId, "checkMaybeAudible until set to", until, timeToCheck);
    setState(tabId, 'checkMaybeAudible', {until: until, maybeAudible: null, updateFrequently: updateFrequently});
  }

  if (musicDuckingIntervalId_ === 0)
    initMusicDucking();
};

let showDuckingInfoInLog = function(reason, showFullInfo) {
  updateDuckingCount_++;
  if (!showFullInfo) {
    console.log('==== updateducking');
  } else {
    console.log('==== updateducking - ' + updateDuckingCount_ + ' - ' + reason, {
      'lastAudibleStart': getStateForAllTabs('lastAudibleStart'),
      'lastPlayed': getStateForAllTabs('lastPlayed'),
      'lastUnmuted': getStateForAllTabs('lastUnmuted'),
      'unduckedTabId_': unduckedTabId_,
      'unduckedShortTimeTabId_': unduckedShortTimeTabId_,
      'unduckingOrder_': unduckingOrder_,
      'tabState_': getFullStateForAllTabs()
    });
  }
};

// Categorize tabs to assist updateDucking (based on what we need to do with it)
let categorizeTabIdsForUpdateDucking = function(tabIds) {
  let state = {needToUnduck: [], needToDuck: [], needToClearDuck: [], unduckable: [], shortTime: [], ducked: [], other: []};
  tabIds.forEach(function(tabId) {
    let category = categorizeTabIdForUpdateDucking(tabId);
    if (!state.hasOwnProperty(category))
      state[category] = [];
    state[category].push(tabId);
  }); //foreach

  return state;
};

let categorizeTabIdForUpdateDucking = function(tabId) {
  let determineDuckedOrOther = function() {
    return getState(tabId, 'ducked') ? 'ducked' : 'other';
  };

  let category = "unknown";
  try {
    let inManualDuckingList = prefsStore.domainInList(getState(tabId, 'domainCached'), prefs_.manualduckinglist);
    if (getState(tabId, 'ducked') && (inManualDuckingList)) {
      category = 'ducked';
    } else if (!getState(tabId, 'lastAudibleStart').getTime()) {
      category = determineDuckedOrOther();
    } else if (!maybeAudible(tabId)) {
      if (inaudibleTooLong(tabId)) { // order between checking toolong and tooshort matters for paused videos
        if (getState(tabId, 'ducked')) {
          if (!isPausedOrPauseInProgress(tabId)) {
            category = 'needToClearDuck';
          } else {
            category = determineDuckedOrOther();
          }
        } else {
          category = determineDuckedOrOther();
        }
      } else if (audibleTooShort(tabId)) {
        if (!getState(tabId, 'mutedCached')) {
          category = 'shorttime';
        } else {
          category = determineDuckedOrOther();
        }
      } else {
        console.error(tabId, tabState_[tabId].url, 'unexpected possibility');
      }
    } else {
      if (getState(tabId, 'mutedCached')) {
        category = determineDuckedOrOther();
      } else {
        category = 'unduckable';
      }
    }
  } catch (ex) {
    console.error(ex);
  }
  if (category === 'unknown') {
    category = "other";
    console.error(tabId, 'setting category to \'other\' but code should not get here');    
  }

  return category;
};

let duckingEffectivelyEnabled = function() {
  return (!prefs_.disableAutomuting) && (!prefs_.privacyMode) && (prefs_.enableDucking);
};

// Show the table if it changed
let logDuckingTabState = function(duckingTabState, reason) {
  if (!deepEqual(duckingTabState, prevDuckingTabState_)) {
    prevDuckingTabState_ = clone(duckingTabState);
    if (loggingEnabled_) {
      showDuckingInfoInLog(reason, true);
      console.table(duckingTabState);
    }
  } else {
    showDuckingInfoInLog(reason, false);
  }
};

// When ducking is enabled, there can be at most one tab playing sound at a
// time (although shorter sounds can be played simultaneously) We wait awhile
// before unducking in case the user has encountered a lul in a video or needs
// a little time to switch videos in a playlist.
let updateDucking = function(reason) {
  if ((!prefs_.enableDucking) && (getFirstDuckedTabId() === null))
    return Q.when(null);

  let duckingTabState = updateDuckingInternal(reason);

  // Clear, duck, unduck and update UI
  return clearDucked(duckingTabState.needToClearDuck)
  .then(duckTabIds(duckingTabState.needToDuck))
  .then(unduckTabIds(duckingTabState.needToUnduck))
  .then(pauseAllUnmutedDucked())
  .then(muteAllAudiblePausedDucked())
  .then(updateCountdownForUnducked())
  .then(updateContextMenus())
  .then(setFavicon())
  .then(refreshUi());
};

// Updates unduckedShortTimeTabId_, unduckedTabId_, unduckingOrder_ and returns a duckingTabState
let updateDuckingInternal = function(reason) {
  let tabIds = getAllTabIds();
  let duckingTabState = categorizeTabIdsForUpdateDucking(tabIds);

  let nonBestTabIds = [];
  if (duckingEffectivelyEnabled()) {
    // Ensure at most one shorttime tab
    if (duckingTabState.shortTime.length > 1) {
      unduckedShortTimeTabId_ = getBestTabIdAndAppendOthers(unduckedShortTimeTabId_, duckingTabState.shortTime, nonBestTabIds);
      duckingTabState.shortTime = [unduckedShortTimeTabId_];
    } else {
      unduckedShortTimeTabId_ = -1;
    }

    // Find one unducked tabId (if possible and if there aren't any shorttime tabids)
    if (duckingTabState.unduckable.length === 1) {
      if (duckingTabState.unduckable[0] !== unduckedTabId_) {
        unduckedTabId_ = duckingTabState.unduckable[0];
        console.log(unduckedTabId_, 'set as unducked tabid');
      }
    } else if (duckingTabState.unduckable.length > 1) {
      // Choose one and duck the rest (if needed)
      unduckedTabId_ = getBestTabIdAndAppendOthers(unduckedTabId_, duckingTabState.unduckable, nonBestTabIds);
    } else if (duckingTabState.unduckable.length === 0) {
      // Choose one ducked
      if (duckingTabState.shortTime.length === 0) {
        let firstDuckedTabId = getFirstDuckedTabId();
        if (firstDuckedTabId !== null) {
           // We use unduckingOrder_ instead of duckingTabState.ducked since the latter isn't likely in the right order
          unduckedTabId_ = firstDuckedTabId;
          console.log(unduckedTabId_, 'Unducking next ducked tab since nothing active.');
        }
      } else {
        if (unduckedShortTimeTabId_ !== -1)
          unduckedTabId_ = unduckedShortTimeTabId_;
      }
    }

    if (unduckedTabId_ >= 0) {
      // Only unduck if necessary
      if (getState(unduckedTabId_, 'ducked'))
        duckingTabState.needToUnduck = [unduckedTabId_];
    }

    // Prepare to duck non-best tabids that could be ducked
    duckingTabState.needToDuck = nonBestTabIds.filter(
      function(tabId) {
        return (!getState(tabId, 'ducked') || (!getState(tabId, 'mutedCached')) || (getMusicState(tabId, 'isPlaying') === true));
      }
    );
  }

  logDuckingTabState(duckingTabState, reason);

  return duckingTabState;
};

// This function can be used for tabs where pausing doesn't mean tab
// is muted (perhaps because something else on the tab is playing)
// (so for these tabs, ducking happens in two parts - try to pause, then mute)
// It is important here that we don't needlessly pause videos (when this is done
// a user cannot play it from the page without unmuting it first.)
let muteAllAudiblePausedDucked = function() {
  if (prefs_.disableAutomuting)
    return Q.when(null);

  let mutePromises = [];
  unduckingOrder_.forEach(function(tabId) {
    if ((!getState(tabId, 'mutedCached')) &&
        (getState(tabId, 'audibleCached')) &&
        (getState(tabId, 'ducked')) &&
        (getMusicState(tabId, 'isPlaying') === false)) {

      let delta = (new Date().getTime() - getState(tabId, 'lastPaused').getTime()) / 1000;

      // assuming that pausing always works; just verify that paused as well.
      if (delta > prefs_.audioNotifierDelay + 1)
        mutePromises.push(updateMuted(tabId, true, {shouldUpdateDucking: false}, 'Muted by music ducking.'));
    }
  });
  return Q.allSettled(mutePromises);
};

let getBestTabIdAndAppendOthers = function(currentTabId, tabIds, othersArray) {
  if (tabIds.length === 0) {
    return currentTabId;
  }

  let bestTabId;
  let bestIndex;
  let bestDict = {};

  if (tabIds.indexOf(currentTabId) === -1) {
    bestTabId = tabIds[0];
  } else {
    bestTabId = currentTabId;
  }
  bestIndex = unduckingOrder_.indexOf(bestTabId);
  
  tabIds.forEach(function(tabId) {
    let index = unduckingOrder_.indexOf(tabId);
    bestDict[tabId] = index;

    if ((index >= 0) && (index < bestIndex)) {
      bestIndex = index;
      bestTabId = tabId;
    }
  });

  let filter = tabIds.filter(function(tabId) { return (tabId !== bestTabId); });
  filter.forEach(function(tabId) {
    addToArray(othersArray, tabId);
  });

  console.log('Calc best unduck tab: ', bestTabId, othersArray, bestDict);
  return bestTabId;
};

// This happens because a ducked tab has been silent/nonplaying for awhile
let clearDucked = function(tabIdsToClear) {
  let unmutePromises = [];
  tabIdsToClear.forEach(function(tabId) {
    setState(tabId, 'ducked', false);
    unmutePromises.push(updateMuted(tabId, false, {shouldUpdateDucking: false}, 'Unmuted while unducking since silent for awhile.'));
  });

  return Q.allSettled(unmutePromises);
};

function updateCountdownForUnducked() {
  return Q.when(null)
  .then(function() {
    duckingCountDown_ = getCountdownForUnducking(unduckedTabId_, false);
    refreshUiCountDown();

    return Q.when(null);
  });
}

// Ducked tabs that are playing should be paused
let pauseAllUnmutedDucked = function() {
  if (prefs_.disableAutomuting)
    return Q.when(null);

  let injectPromises = [];

  unduckingOrder_.forEach(function(tabId) {
    if (getState(tabId, 'ducked') && (!getState(tabId, 'mutedCached')))
      injectPromises.push(pauseMusic(tabId, 'Paused because tab is ducked.'));
  });
  return Q.allSettled(injectPromises);
};

let getFirstDuckedTabId = function() {
  let firstDuckedTabId = null;
  unduckingOrder_.forEach(function(tabId) {
    if ((!firstDuckedTabId) && (getState(tabId, 'ducked'))) {
      firstDuckedTabId = tabId;
    }
  });

  return firstDuckedTabId;
};

let duckTabIds = function(tabIds) {
  return Q.when(null)
  .then(function() {

    if (tabIds.length === 0)
      return Q.when(null);

    console.log('unduckingOrder_', tabIds, unduckingOrder_);

    let mutePromises = [];
    let injectPromises = [];

    tabIds.forEach(function(tabId) {
      let shouldBeDucked = false;

      if (!isPausedOrPauseInProgress(tabId)) {
        shouldBeDucked = true;
        injectPromises.push(pauseMusic(tabId, 'Paused by music ducking.'));
      }

      // We mute it if it never had a player or on the manual ducking list and still audible
      // (except we forget it had a player for sites like Facebook in certain situations).
      // (If had a player it gets muted via muteAllAudiblePausedDucked.)
      let inManualDuckingList = prefsStore.domainInList(getState(tabId, 'domainCached'), prefs_.manualduckinglist);
      let isPlaying = getMusicState(tabId, 'isPlaying');
      let autoplayCountdown = getMusicState(tabId, 'autoplayCountdown') || false;
      if ((((isPlaying === '') || (isPlaying === null)) || inManualDuckingList) &&
          (!getState(tabId, 'mutedCached')) &&
          (getState(tabId, 'audibleCached'))
         ) {
        mutePromises.push(updateMuted(tabId, true, {shouldUpdateDucking: false}, 'Muted by music ducking.'));
        shouldBeDucked = true;
      } else if (autoplayCountdown && (!getState(tabId, 'mutedCached'))) {
        mutePromises.push(updateMuted(tabId, true, {shouldUpdateDucking: false}, 'Muted by music ducking.'));
        shouldBeDucked = true;
      }

      if (!getState(tabId, 'ducked') && shouldBeDucked) {
        if (unduckingOrder_.indexOf(tabId) === -1) {
          unduckingOrder_.push(tabId);
        }
        console.log(tabId, 'added to unduckingOrder_', unduckingOrder_);
        setState(tabId, 'ducked', true);
      }
    });

    if ((mutePromises.length === 0) && (injectPromises.length === 0))
      return Q.when(null);

    return Q.allSettled(injectPromises)
    .then(function() {
      return Q.allSettled(mutePromises)
      .then(function() {
        console.log('ducking finished...');
      });
    });
  });
};

// Restores ducked tabs
let unduckTabIds = function(tabIds) {
  return Q.when(null)
  .then(function() {

    if (tabIds.length === 0)
      return Q.when(null);

    console.log('unduckTabIds', tabIds, unduckingOrder_);

    let mutePromises = [];
    let injectPromises = [];

    tabIds.forEach(function(tabId) {
      if (getState(tabId, 'ducked')) {
        console.log(tabId, 'no longer ducked');
      }
      setState(tabId, 'ducked', false);
      // Remove from unduckingOrder_
      let index = unduckingOrder_.indexOf(tabId);
      if (index > -1) {
        if (!isPlayingOrPlayInProgress(tabId))
          injectPromises.push(playMusic(tabId, 'Played while music unducking.'));
        mutePromises.push(updateMuted(tabId, false, {shouldUpdateDucking: false}, 'Unmuted by music unducking.'));
      }
    });

    return Q.allSettled(mutePromises)
    .done(Q.allSettled(injectPromises));
  });
};

////////////////////////////////////////////////////////////////////////
// Utility functions
////////////////////////////////////////////////////////////////////////

// This version compares JSON stringify; should work for ducking
// since we construct the objects consistently in the same way.
let deepEqual = function(x, y) {
  return (JSON.stringify(x) === (JSON.stringify(y)));
};

let clone = function(obj) {
  return (JSON.parse(JSON.stringify(obj)));
};

// Removes a value from an array if found
let removeFromArray = function(array, val) {
  let index = array.indexOf(val);
  let found = (index > -1);

  if (found)
    array.splice(index, 1);

  return found;
};

// Add a value to an array if not already a member
let addToArray = function(array, val) {
  let index = array.indexOf(val);
  if (index === -1)
    array.push(val);
};

// Get the domain from a url (and return null if an error)
let getDomain = function(url) {
  try {
    if ((url.indexOf('chrome://') === 0))
      return 'chrome://' + new URL(url).hostname + '/';
    if ((url.indexOf('chrome-extension://') === 0))
      return 'chrome-extension://' + new URL(url).hostname + '/';
    return new URL(url).hostname || '';
  } catch (ex) {
    console.error(ex);
    return '';
  }
};

// Allow toggling logging on/off via console
// from http://stackoverflow.com/questions/1215392/how-to-quickly-and-conveniently-disable-all-console-log-statements-in-my-code
(function(original) {
  console.enableLogging = function() {
    console.log = original;
    loggingEnabled_ = true;
    localStorage.enableLogging = true;
    console.log('Log types enabled:', logTypeEnabled_);
  };
  console.disableLogging = function() {
    console.log = function() {};
    loggingEnabled_ = false;
    localStorage.enableLogging = false;
  };
  logTypeEnabled_ = {};
  logTypes_.forEach(function(logType) {
    let logTypeFixedCase = logType.substr(0, 1).toUpperCase() + logType.substr(1);
    logTypeEnabled_[logType] = localStorage['enableLog' + logTypeFixedCase];
    console['enableLog' + logTypeFixedCase] = function() {
      localStorage['enableLog' + logTypeFixedCase] = true;
      logTypeEnabled_[logType] = true;
      loggingEnabled_ = true;
      localStorage.enableLogging = true;
    };
    console['disableLog' + logTypeFixedCase] = function() {
      localStorage['enableLog' + logTypeFixedCase] = false;
      logTypeEnabled_[logType] = false;
    };
  });
}(console.log));

////////////////////////////////////////////////////////////////////////
// Load Settings
////////////////////////////////////////////////////////////////////////

let loadSettings = function() {
  return prefsStore.load()
  .then(function(prefs) {
    prefs_ = prefs;
    return setFavicon()
    .then(afterLoadSettings());
  });
};

// Every time after loading settings we:
// -- inject the music controller into applicable tabs
// -- start up ducking if enabled
// -- update context menus
let afterLoadSettings = function() {
  return (windowManager.getTabs())
  .then(function(tabs) {
    return afterLoadSettingsFirstTime(tabs)
    .then(function() {
      console.log('afterLoadSettings tabs', tabs);
      let injectMusicPromises = tabs.map(function(tab) { return Q.fcall(function() { injectMusicApi(tab.id, tab.url, true); }); });
      return Q.allSettled(injectMusicPromises)
      .then(function() {
        unduckingOrder_ = tabs.map(function(tab) { return tab.id;});
        // console.log("afterLoadSetings injectMusic all done");
        if (prefs_.enableDucking) {
          updateDucking('settings updated').done();
          initMusicDucking();
        } else {
          stopMusicDucking();
        }

        updateContextMenus();
        console.log('afterLoadSettings done');

        return Q.when(null);
      }).catch(function(err) {
        console.error(err);
      });
    });
  });
};

// If loading for the first time, we do the following:
// -- if privacy mode, we store away our current mute state and then mute everything (including music sites)
// -- ensure that mutedCached, audibleCached, lastAudibleStart, and lastAudibleEnd are initialized
let afterLoadSettingsFirstTime = function(tabs) {
  if (!isFirstTime_)
    return Q.when(null);

  return Q.when(null)
  .then(function() {
    isFirstTime_ = false;
    console.log('tabs on load', tabs);
    tabs.forEach(function(tab) {
      setState(tab.id, 'domainCached', getDomain(tab.url));
      setState(tab.id, 'mutedCached', tab.mutedInfo.muted);
      updateAudible(tab.id, tab.audible, 'afterloadsettingsfirsttime');
      setState(tab.id, 'nonPrivateMuteStatus', getState(tab.id, 'mutedCached'));
      setState(tab.id, 'url', tab.url);

      if (getMusicState(tab.id, 'isPlaying') === true) {
        console.log(tab.id, 'was playing on startup');
        setState(tab.id, 'nonPrivatePlayStatus', getMusicState(tab.id, 'isPlaying'));
      }
    });
    let maybePrivacyModePromise = Q.when(null);
    if (prefs_.privacyMode)
      maybePrivacyModePromise = muteEverything();
    return maybePrivacyModePromise;
  });
};

////////////////////////////////////////////////////////////////////////
// Test support
////////////////////////////////////////////////////////////////////////

// This creates a set of tabs, closes all other tabs but those and the sender,
// and sets the desired properties
//
// tabs are created in the order specified, followed by any new tabs.
// if testsUrlsInIncognito is set, the same urls will also be opened in incognito after that.
let setupTestScenario = function(senderTabId, senderWindowId, setupConfig) {
  console.log('setupTestScenario', setupConfig);

  let i;

  let maybeLaunchIncognitoWindow = Q.when(null);
  if (setupConfig.testUrlsInIncognito || false) {
    maybeLaunchIncognitoWindow = windowManager.createWindow({incognito: true});
  }

  return maybeLaunchIncognitoWindow
  .then(function(incognitoWindow) {
    let createdTabIds = [];
    let createdTabIdDict = {};

    let createTabPromises = setupConfig.urls.map(function(url) { return windowManager.createTab({url: url, windowId: senderWindowId}); });

    if (setupConfig.hasOwnProperty('newTabCount')) {
      for (i = 0; i < setupConfig.newTabCount; i++)
        createTabPromises.push(new windowManager.createTab({windowId: senderWindowId}));
    }

    if (setupConfig.testUrlsInIncognito || false) {
      let createTabIncognitoPromises = setupConfig.urls.map(function(url) { return windowManager.createTab({url: url, windowId: incognitoWindow.id}); });
      createTabPromises = createTabPromises.concat(createTabIncognitoPromises);
      for (i = 0; i < setupConfig.newTabCount; i++)
        createTabPromises.push(new windowManager.createTab({windowId: incognitoWindow.id}));
    }
    return Q.all(createTabPromises)
    .then(function(tabs) {
      console.log(tabs);
      tabs.forEach(function(tabInfo) {
        createdTabIds.push(tabInfo.id);
        createdTabIdDict[tabInfo.id] = true;
      });

      return windowManager.getTabs()
      .then(function(tabs) {
        console.log('windowManager.getTabs', tabs);
        let filtered = tabs.filter(function(tab) {
          return (!((createdTabIdDict.hasOwnProperty(tab.id)) || (tab.id === senderTabId)));
        });

        let tabIdsToClose = filtered.map(function(tab) { return tab.id; });
        console.log('tabIdsToClose', tabIdsToClose);

        return chromeMisc.removeTabIds(tabIdsToClose)
        .then(function() {
          let setupInfo = {tabIds: createdTabIds, senderTabId: senderTabId};
          if (setupConfig.skipSwitchBackToTest || false)
            return Q.when(setupInfo);

          return windowManager.switchToTab(senderTabId)
          .then(function() {
            console.log('setupInfo', setupInfo);
            return Q.when(setupInfo);
          }).catch(function(error) {
            console.error('ERROR!', error);
            return Q.when(null);
          });
        });
      });
    });
  });
};

// This is separated out from setupTestScenario to give time for onCreated and onUpdated events to settle
// Supports audible, playing, and muted right now (and playing_cheat_timestamps).
let setPropertiesMultiple = function(tabIds, properties) {
  return Q.fcall(function() {
    let now = new Date();
    let count, index;

    let setPropertiesPromises = [];
    console.log('properties', properties);
    if (properties.audible === true) {
      console.log('GOING TO UPDATE AUDIBLE');
      count = tabIds.length;
      index = 0;
      tabIds.forEach(function(tabId) {
        updateAudible(tabId, true, 'test');
        setState(tabId, 'lastAudibleStart', new Date(now.getTime() - ((prefs_.minTimeBeforeDucking + count + tabIds.length - index) * 1000)));
        console.log(tabId, 'setuppropertiesmultiple(audible)', getState(tabId, 'lastAudibleStart'));
        if (getState(tabId, 'lastUnmuted'))
          setState(tabId, 'lastUnmuted', getState(tabId, 'lastAudibleStart'));
        index++;
      });
    }

    // This works similar to how we update audible in that we do the actual work and then cheat
    // with the internal timestamps we track.  It is a little different, though, in that getting
    // the action to work here is async (one must wait for the contentscripts to perform the action).
    // Thus, one should call this with playing: true and a few seconds later call it with playing_cheat_timestamps: true.
    if (properties.playing_cheat_timestamps === true) {
      console.log('GOING TO UPDATE PLAYING TIMESTAMPS');
      count = tabIds.length;
      index = 0;
      tabIds.forEach(function(tabId) {
        setState(tabId, 'lastPlayed', new Date(now.getTime() - ((prefs_.minTimeBeforeDucking + count + tabIds.length - index) * 1000)));
        setState(tabId, 'lastAudibleStart', getState(tabId, 'lastPlayed')); // match it up
        if (getState(tabId, 'lastUnmuted', false)) {
          setState(tabId, 'lastUnmuted', getState(tabId, 'lastAudibleStart'));
        }
        index++;
      });
    }

    tabIds.forEach(function(tabId) {
      if (properties.muted || false)
        setPropertiesPromises.push(updateMuted(tabId, true, {}, 'Muted as part of testing scenario.'));
      if (properties.isPlaying || false) // Be sure to follow up later with playing_cheat_timestamps: true.
        setPropertiesPromises.push(playMusic(tabId, 'Played as a part of test setup.'));
    });
    return Q.all(setPropertiesPromises);
  });
};

////////////////////////////////////////////////////////////////////////
// Run on startup
////////////////////////////////////////////////////////////////////////
if ((localStorage.enableLogging === 'true') || false) {
  loggingEnabled_ = true;
  console.log('Log types enabled:', logTypeEnabled_);
} else {
  console.disableLogging();
}

windowManager.init()
  .then(loadSettings())
  .then(function() {
    chrome.tabs.onCreated.addListener(onCreated);
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onReplaced.addListener(onReplaced);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.runtime.onMessage.addListener(onMessage);
    chrome.commands.onCommand.addListener(onCommand);
    chrome.contextMenus.onClicked.addListener(onContextMenuClicked);
    // chrome.tabCapture.onStatusChanged.addListener(onCaptured); // This doesn't work for tabs captured by other extensions
  })
  .catch(function(err) {
    console.error(err);
  })
  .done();
