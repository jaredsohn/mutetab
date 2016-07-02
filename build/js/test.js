// Warning: Running tests clears out your preferences.
//
// If you want to restore your preferences afterward, you should load defaults or restart the extension.
// This will reset duckingInterval and audioNotifierDelay, which don't have a UI associated with them.
//
// Note: Due to recent changes in Chrome, videos shouldn't start until you make the tab active.
// Thus, until this gets updated in the tests, if tabs show videos you need to make each tab active
// for a bit to ensure that the tests can pass.
//
// Also, after some recent ducking algorithm changes, play/pause support was broken (it never worked 100%, though).
// Thus, the contentscript has been removed from manifest.json and the tests have been disabled.

var hideDucking_ = false;
var expect = chai.expect;
var prefs_ = null;
var prefsOriginal_ = null;

var testIncognito_ = false; // Requires that extension is given incognito permission
var restorePrefsAfterTests_ = false; // If set to false, then preferences will be wrong unless the extension gets restarted.
                                     // Also, regardless of setting, if tests are interrupted, prefs will be wrong.

// Note: fast mode and nointernet=false don't work well.  Most testing done with nointernet=true
//var SPEED_FACTOR = .0001; // ludicrous speed (for testing timeouts and things related to it)
//var SPEED_FACTOR = .005; // fast mode; full suite takes a little under four minutes
var SPEED_FACTOR = 1;  // normal mode; full suite takes a little over ten minutes
//var SPEED_FACTOR = 4;  // slow

// These sets of constants are used to indicate how long we wait for various aspects
// -- sendTabDataWait is how long we wait for things to settle before requesting current tab status
// -- onUpdatedWait is how long we wait for things to settle before we update the state of existing tabs
// -- testTimeout is for the test as a whole
//
// For each timeout, we set a fixed time (which may be dependent on the action being performed, such as waiting
// for a video to load or play), a normal timeout (which can be adjusted to speed up / slow down tests),
// and multiplier for the normal timeout (which can be used if an operation is slower than normal (i.e. requires sending
// more packets back and forth)).  Set SPEED_FACTOR above to run tests more quickly/slowly.

var PLAYPAUSE_ENABLED = false;

var sendTabDataWaitFixed_ = 0;
var sendTabDataWaitMultiplier_ = 1;
var sendTabDataWait_ = {};
sendTabDataWait_[.0001] = 16;
sendTabDataWait_[.005] = 800; // was 200, 1600, 1200; without the incognito tests works at '90'
sendTabDataWait_[1] = 6000;
sendTabDataWait_[4] = 24000;

var onUpdatedWaitFixed_ = 0;
var onUpdatedWaitMultiplier_ = 1;
var onUpdatedWait_ = {};
onUpdatedWait_[.0001] = 500;
onUpdatedWait_[.005] = 500;
onUpdatedWait_[1] = 500;
onUpdatedWait_[4] = 500;

var testTimeoutFixed_ = 0;
var testTimeoutMultiplier_ = 1;
var testTimeout_ = {};
testTimeout_[.0001] = 1200;
testTimeout_[.005] = 8000;
testTimeout_[1] = 45000; // was 20000
testTimeout_[4] = 80000;


var waitForDuckingToSettleFixed_ = 2000;
var playPauseCommandWaitFixed_ = 4000;        // Wait for play/pause commands to finish (since our message doesn't wait for a response)
var audibleWaitFixed_ = 2000;
var waitForOpsToSettleLong = 12000; // was 4000
var testUrls_, musicTestUrls_, nonmusicTestUrls_;

mocha.setup({'ui': "bdd", "bail": false });

testUrls_ = ["chrome://accessibility/", "chrome://appcache-internals/", "chrome://apps/", "chrome://credits/", "chrome://version/", "chrome:/profiler"];
//musicTestUrls_ = testUrls_; // not really music urls, though
nonmusicTestUrls_ = testUrls_;

// used to have pandora as second but that doesn't work on chromium because it requires Flash
musicTestUrls_ = ["https://www.youtube.com/watch?v=9bZkp7q19f0", "https://www.youtube.com/watch?v=eExL1VLkQYk", "https://www.youtube.com/watch?v=lUtnas5ScSE"];

var setDefaultTimeouts = function() {
  sendTabDataWaitFixed_ = 0;
  sendTabDataWaitMultiplier_ = 1;
  onUpdatedWaitFixed_ = 0;
  onUpdatedWaitMultiplier_ = 1;
  testTimeoutFixed_ = 0;
  testTimeoutMultiplier_ = 1;
};

var getTestTimeout = function() {
  return testTimeoutFixed_ + testTimeout_ * testTimeoutMultiplier_;
};

// Get the domain from a url (and return null if an error)
var getDomain = function(url) {
  try {
    if (url.indexOf("chrome://") === 0)
      return "chrome://" + new URL(url).hostname + "/";
    return new URL(url).hostname || null;
  } catch (ex) {
    console.error(ex);
    return null;
  }
};

var getTabDictNoDelay = function(callback) {
  chrome.runtime.sendMessage({send_tab_data: true}, function(tabData) {
    console.log("tabData", tabData);
    var tabDict = {};
    tabData.tabs.forEach(function(tab) { tabDict[tab.id] = tab; });
    callback(tabDict);
  });
};

// get the current state of the tabs. The timeout here allows time for things to settle
var getTabDict = function(callback) {
  setTimeout(function() {
    getTabDictNoDelay(callback);
  }, sendTabDataWaitFixed_ + sendTabDataWait_[SPEED_FACTOR] * sendTabDataWaitMultiplier_);
};

var finishPlayPauseSetup = function(tabIds, callback) {
  sendTabDataWaitFixed_ = 0;
  testTimeoutFixed_ = 0;
  chrome.runtime.sendMessage({set_properties_multiple: {tabIds: tabIds, properties: {"playing_cheat_timestamps": true}}}, function() {
    chrome.runtime.sendMessage({change_enableDucking: true}, function() {
      setTimeout(function() {
        callback();
      }, waitForDuckingToSettleFixed_); // Allow time for ducking to happen to avoid race conditions
    });
  });
};

var testSetup = function(it, setupConfig, done, initCallback, doStuffCallback, evaluateCallback) {
  console.log(Array(80).join("="));
  console.log("Setting up test: " + it.test.title);
  it.timeout(getTestTimeout());

  if (initCallback === null)
    initCallback = function(callback) { callback(); };

  if (doStuffCallback === null)
    doStuffCallback = function(setupData, tabDict, callback) { callback(); };

  var performTest = function(setupData) {
    getTabDict(function(tabDict) { // get current state after test setup done
      console.log("performtest", setupData, tabDict);
      try
      {
        doStuffCallback(setupData, tabDict, function() {
          if (evaluateCallback === null)
            done();
          else {
            getTabDict(function(tabDict) { // update the tabdict again
              try {
                evaluateCallback(setupData, tabDict);
                done();
              } catch (ex) { done(ex); }
            });
          }
        });
      } catch (ex) { done(ex); }
    });
  };

  initCallback(function(callback) {
    chrome.runtime.sendMessage({setup_test_scenario: setupConfig}, function(setupData) {
      console.log("setupData", setupData);
      console.log("setupConfig", setupConfig);
      console.log({"tabIds": setupData.tabIds, "properties": setupConfig.properties});
      if (Object.keys(setupConfig.properties).length)
      {
        // Update the properties if needed (but wait for onCreated and onUpdated to settle first)
        setTimeout(function() {
          chrome.runtime.sendMessage({"set_properties_multiple": {"tabIds": setupData.tabIds, "properties": setupConfig.properties}}, function() {
            performTest(setupData);
          });
        }, onUpdatedWaitFixed_ + onUpdatedWait_[SPEED_FACTOR] * onUpdatedWaitMultiplier_);
      } else
        performTest(setupData);
    }); //sendmessage
  }); // initCallback
};

// Set properties to null if tab should not exist
var expectTabProperties = function(tab, properties, done) {
  try {

    if (typeof tab === "undefined") {
      if (properties === null)
        return;
      throw "tab not found";
    }

    console.log("expectTabProperties", tab, properties);
    var keys = Object.keys(properties);
    keys.forEach(function(key) {
      console.log(key);
      console.log(tab);
      if (key === "muted") {
        expect(tab.mutedInfo[key]).to.equal(properties[key], "For " + tab.url + ", " + key + " should be " + properties[key]);
      } else {
        expect(tab[key]).to.equal(properties[key], "For " + tab.url + ", " + key + " should be " + properties[key]);
      }
    });
  } catch (ex) {
    done(ex);
  }
};

var expectPropertyAcrossTabs = function(tabDict, tabIds, propertyName, propertyValues, done) {
  for (var i = 0; i < tabIds.length; i++) {
    var obj = {};
    obj[propertyName] = propertyValues[i];
    expectTabProperties(tabDict[tabIds[i]], obj, done);
  }
};

var updatePrefs = function(prefsChangesDict, callback) {
  var testPrefs = JSON.parse(JSON.stringify(prefs_));
  Object.keys(prefsChangesDict).forEach(function(key) {
    testPrefs[key] = prefsChangesDict[key];
  });
  console.log("updating prefs to", testPrefs);
  prefs_ = testPrefs;
  chrome.runtime.sendMessage({set_prefs: testPrefs}, callback);
};

var getMutingBehaviorPrefs = function(overrides, urls) {
  var prefs = {
    muteAllTabs: false,
    muteBackgroundTabs: false,
    unmuteAllTabs: false,
    muteNewIncognito: false,
    mutedRememberSameDomain: false,
    privacyMode: false,
    disableAutomuting: false,
    enableDucking: false,
    whitelist: {},
    blacklist: {},
    musiclist: {},
    showOtherTabs: true
  };
  prefs.whitelist[getDomain(urls[0])] = true;
  prefs.blacklist[getDomain(urls[1])] = true;
  prefs.musiclist[getDomain(urls[2])] = true;

  Object.keys(overrides).forEach(function(key) {
    prefs[key] = overrides[key];
  });

  console.log("New prefs", prefs);

  return prefs;
};

var getMutingBehaviorSetupConfig = function(urlRepeatCount) {
  var i;
  var setupUrls = testUrls_.slice(0, 4);
  for (i = 1; i < urlRepeatCount; i++)
    setupUrls = setupUrls.concat(testUrls_.slice(0, 4));

  var setupTestUrlsInIncognito = false;
  var setupNewTabCount = 1;
  var setupProperties = {};
  return {"urls": setupUrls, "testUrlsInIncognito": setupTestUrlsInIncognito,
          "newTabCount": setupNewTabCount, "properties": setupProperties};
};

var getDuckingPrefs = function() {
  return {
    muteAllTabs: false,
    muteBackgroundTabs: false,
    unmuteAllTabs: true,
    enableDucking: true,
    privacyMode: false,
    disableAutomuting: false,
    duckingInterval: 0.5 * SPEED_FACTOR,
    audioNotifierDelay: 2 * SPEED_FACTOR,
    minTimeBeforeUnducking: 5 * SPEED_FACTOR,
    minTimeBeforeDucking: 3 * SPEED_FACTOR,
    whitelist: {},
    blacklist: {},
    musiclist: {},
    showOtherTabs: true
  };
};

var getPlayPauseDuckingPrefs = function() {
  var prefs = getDuckingPrefs();
  prefs.enableDucking = false;
  return prefs;
};

////////////////////////////////////////////////////////////////////////////////////


var setupConfig = null;

describe("MuteTab", function() {
  describe("default muting behavor", function() {
    describe("muted", function() {
      beforeEach(function(done) {
        setupConfig = getMutingBehaviorSetupConfig(1);
        setDefaultTimeouts();
        var prefChanges = getMutingBehaviorPrefs({muteAllTabs: true}, setupConfig.urls);
        updatePrefs(prefChanges, done);
      });

      it("on load, whitelisted and music url unmuted, others muted", function(done) {
        testSetup(this, setupConfig, done,
          null,
          null,
          function(setupData, tabDict) {
            var expectedMuted = [false, true, false, true, true];

            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
      it("privacy mode should mute everything and when disabled restore old settings while preserving changes; new tabs opened during privacy mode will be restored based on muting behavior rules", function(done) {
        testTimeoutMultiplier_ = 2;
        testSetup(this, setupConfig, done,
          null,
          function(setupData, tabDict, callback) {
            // Get initial muted state
            var expectedMuted = [false, true, false, true, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);

            // Set privacy mode
            chrome.runtime.sendMessage({change_privacy_mode: true}, function() {
              console.log("going to open some new tabs while in privacy mode");
              chrome.runtime.sendMessage({create_tabs: setupConfig.urls}, function(tabInfos) {
                console.log(tabInfos);
                tabInfos.forEach(function(tabInfo) {
                  setupData.tabIds.push(tabInfo.id);
                });
                console.log(setupData.tabIds);

                getTabDict(function(tabDict) {
                  expectedMuted = [true, true, true, true, true];
                  expectedMuted = expectedMuted.concat([true, true, true, true]); // for tabs opened after in privacy mode

                  expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                  // unmute/mute a tab and unmute another to see if the changes stick when privacy mode goes away

                  chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[0], muted: false}}, function() {
                    chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[0], muted: true}}, function() {
                      chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[1], muted: false}}, function() {
                        // Verify that our muting and unmuting worked
                        getTabDict(function(tabDict) {
                          expectedMuted = [true, false, true, true, true];

                          expectedMuted = expectedMuted.concat([true, true, true, true]); // for tabs opened after in privacy mode

                          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);

                          chrome.runtime.sendMessage({change_privacy_mode: true}, callback);
                        });
                      });
                    });
                  });
                });
              });
            });
          },
          function(setupData, tabDict) {
            // Should have original muted status (except for changes made during privacy mode)
            var expectedMuted = [true, false, false, true, true];
            expectedMuted = expectedMuted.concat([false, true, false, true]); // tabs opened after in privacy mode

            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
      it("with automuting disabled, new tabs should stay unmuted", function(done) {
        testSetup(this, setupConfig, done,
          function(callback) { chrome.runtime.sendMessage({change_disable_automuting: true}, callback); },
          null,
          function(setupData, tabDict) {
            var expectedMuted = [false, false, false, false, false];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
      it("when blacklist/whitelist/musiclist updated, existing tabs' muted state should not change", function(done) {
        testSetup(this, setupConfig, done,
          null,
          function(setupData, tabDict, callback) {
            var expectedMuted = [false, true, false, true, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);

            // swap around the black, white, and music lists
            var prefChanges = getMutingBehaviorPrefs({muteAllTabs: true, disableAutomuting: true, musiclist: prefs_.blacklist, blacklist: prefs_.whitelist, whitelist: prefs_.musiclist}, setupConfig.urls);

            updatePrefs(prefChanges, callback);
          },
          function(setupData, tabDict) {
            var expectedMuted = [false, true, false, true, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
    });

    describe("background", function() {
      beforeEach(function(done) {
        setDefaultTimeouts();
        setupConfig = getMutingBehaviorSetupConfig(1);
        setupConfig.newTabCount = 0;
        setupConfig.testUrlsInIncognito = false;
        setupConfig.skipSwitchBackToTest = true;

        var prefChanges = getMutingBehaviorPrefs({muteBackgroundTabs: true}, setupConfig.urls);
        updatePrefs(prefChanges, done);
      });
      it("on load, whitelisted, music, and most recent unmuted, others muted.  Most recent tab muted after switching tabs", function(done) {
        var urls = JSON.parse(JSON.stringify(setupConfig.urls));
        var tabIds = [];
        setupConfig.urls = [setupConfig.urls[0]];
        testTimeoutMultiplier_ = 4;
        testSetup(this, setupConfig, done,
          null,
          function(setupData, tabDict, callback) {
            var expectedMuted = [false];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
            chrome.runtime.sendMessage({create_tab: urls[1]}, function(tab) {
              setupData.tabIds.push(tab.id);
              getTabDict(function(tabDict) { // get current state after test setup done
                var expectedMuted = [true, true];
                expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                chrome.runtime.sendMessage({create_tab: urls[2]}, function(tab) {
                  setupData.tabIds.push(tab.id);
                  getTabDict(function(tabDict) { // get current state after test setup done
                    var expectedMuted = [true, true, false];
                    expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                    chrome.runtime.sendMessage({create_tab: urls[3]}, function(tab) {
                      setupData.tabIds.push(tab.id);
                      getTabDict(function(tabDict) { // get current state after test setup done
                        var expectedMuted = [true, true, false, false];
                        expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                        chrome.runtime.sendMessage({switch_to_tab: setupData.senderTabId}, callback);
                      });
                    });
                  });
                });
              });
            });
          },
          function(setupData, tabDict) {
            var expectedMuted = [true, true, false, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
      // This the main mute background tabs test when automuting is disabled.  Nothing should ever get muted.
      it("if automuting disabled, then do not mute background tabs.", function(done) {
        var urls = JSON.parse(JSON.stringify(setupConfig.urls));
        var tabIds = [];
        setupConfig.urls = [setupConfig.urls[0]];
        testTimeoutMultiplier_ = 4;

        testSetup(this, setupConfig, done,
          null,
          function(setupData, tabDict, callback) {
            chrome.runtime.sendMessage({change_disable_automuting: true}, function() {
              var expectedMuted = [false];
              expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
              chrome.runtime.sendMessage({create_tab: urls[1]}, function(tab) {
                setupData.tabIds.push(tab.id);
                getTabDict(function(tabDict) { // get current state after test setup done
                  var expectedMuted = [false, false];
                  expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                  chrome.runtime.sendMessage({create_tab: urls[2]}, function(tab) {
                    setupData.tabIds.push(tab.id);
                    getTabDict(function(tabDict) { // get current state after test setup done
                      var expectedMuted = [false, false, false];
                      expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                      chrome.runtime.sendMessage({create_tab: urls[3]}, function(tab) {
                        setupData.tabIds.push(tab.id);
                        getTabDict(function(tabDict) { // get current state after test setup done
                          var expectedMuted = [false, false, false, false];
                          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                          chrome.runtime.sendMessage({switch_to_tab: setupData.senderTabId}, callback);
                        });
                      });
                    });
                  });
                });
              });
            });
          },
          function(setupData, tabDict) {
            var expectedMuted = [false, false, false, false];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
      it("mute tabs not on music list that are opened in the background and never get focus", function(done) {
        var urls = setupConfig.urls;
        setupConfig.urls = [];

        testSetup(this, setupConfig, done,
          null,
          function(setupData, tabDict, callback) {
            chrome.runtime.sendMessage({create_tabs: urls}, function(tabInfos) {
                tabInfos.forEach(function(tabInfo) {
                  setupData.tabIds.push(tabInfo.id);
                });
              callback();
            });
          },
          function(setupData, tabDict) {
            var expectedMuted = [true, true, false, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
    });

    describe("unmuted", function() {
      beforeEach(function(done) {
        setupConfig = getMutingBehaviorSetupConfig(1);
        setDefaultTimeouts();
        var prefChanges = getMutingBehaviorPrefs({unmuteAllTabs: true}, setupConfig.urls);
        updatePrefs(prefChanges, done);
      });

      it("on load, blacklisted url muted, others unmuted", function(done) {
        testSetup(this, setupConfig, done,
          null,
          null,
          function(setupData, tabDict) { // white, black, music, none, new
            var expectedMuted = [false, true, false, false, false];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
    });

    describe("remember muted when changing to site on same domain and unmuted", function() {
      beforeEach(function(done) {
        setDefaultTimeouts();
        setupConfig = getMutingBehaviorSetupConfig(1);
        var prefChanges = getMutingBehaviorPrefs({unmuteAllTabs: true}, setupConfig.urls);
        updatePrefs(prefChanges, done);
      });

      it("if set, changing URL within same domain should maintain muting and audible", function(done) {
        setupConfig.properties = {"muted": true, "audible": true}; // start all tabs as audible and muted
        setupConfig.newTabCount = 0;
        testSetup(this, setupConfig, done,
          function(callback) {
            prefChanges = getMutingBehaviorPrefs({unmuteAllTabs: true, mutedRememberSameDomain: true}, setupConfig.urls);
            updatePrefs(prefChanges, callback);
          },
          function(setupData, tabDict, callback) {
            var expectedMuted = [true, true, true, true];
            var expectedAudible = [true, true, true, true];
            chrome.runtime.sendMessage({change_all_urls: true}, callback);
          },
          function(setupData, tabDict) {
            var expectedMuted = [true, true, true, true];
            var expectedAudible = [true, true, true, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done); // code doesn't handle this right at the moment
          }
        );
      });
      it("if not set, changing URL within same domain should cause white/black/music lists to be honored and audible to remain", function(done) {
        setupConfig.properties = {"muted": true, "audible": true}; // start all tabs as audible and muted
        setupConfig.newTabCount = 0;
        testSetup(this, setupConfig, done,
          null,
          function(setupData, tabDict, callback) {
            var expectedMuted = [true, true, true, true];
            var expectedAudible = [true, true, true, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
            chrome.runtime.sendMessage({change_all_urls: true}, callback);
          },
          function(setupData, tabDict) {
            var expectedMuted = [false, true, false, false];
            var expectedAudible = [true, true, true, true];
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
          }
        );
      });
    });
    var describeSkipIfNoIncognito = testIncognito_ ? describe : describe.skip;
    describeSkipIfNoIncognito("mute incognito and unmuted", function() {
      beforeEach(function(done) {
        setDefaultTimeouts();
        setupConfig = getMutingBehaviorSetupConfig(1);
        var prefChanges = getMutingBehaviorPrefs({unmuteAllTabs: true, muteNewIncognito: true}, setupConfig.urls);
        updatePrefs(prefChanges, done);
      });
      it("on load, incognito and blacklisted muted, others unmuted", function(done) {
        testSetup(this, setupConfig, done,
          null,
          null,
          function(setupData, tabDict) {
            var expectedMuted = [false, true, false, false, false];
            expectedMuted = expectedMuted.concat([false, true, false, true, true]);

            expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          }
        );
      });
    });
  });

  describe("operations", function() {
    beforeEach(function(done) {
      setDefaultTimeouts();
      setupConfig = getMutingBehaviorSetupConfig(1);
      var prefChanges = getMutingBehaviorPrefs({muteAllTabs: true}, setupConfig.urls);
      updatePrefs(prefChanges, done);
    });
    it("mute all should mute all but music tabs", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          var expectedMuted = [false, true, false, true, true];
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          chrome.runtime.sendMessage({mute_all: true}, callback);
        },
        function(setupData, tabDict) {
        var expectedMuted = [true, true, false, true, true];
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
        }
      );
    });
    it("unmute all should unmute all tabs", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          var expectedMuted = [false, true, false, true, true];
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);

          chrome.runtime.sendMessage({unmute_all: true}, callback);
        },
        function(setupData, tabDict) {
          var expectedMuted = [false, false, false, false, false];

          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
        }
      );
    });

    it("mute background should mute all but music tabs and the foreground tab", function(done) {
      testSetup(this, setupConfig, done,
        function(callback) {
          var prefChanges = getMutingBehaviorPrefs({unmuteAllTabs: true}, setupConfig.urls);
          updatePrefs(prefChanges, callback);
        },
        function(setupData, tabDict, callback) {
          var expectedMuted = [false, true, false, false, false];
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);

          chrome.runtime.sendMessage({switch_to_tab: setupData.tabIds[setupData.tabIds.length - 1]}, function()
          {
            chrome.runtime.sendMessage({mute_background: true}, callback);
          });
        },
        function(setupData, tabDict) {
          var expectedMuted = [true, true, false, true, true];
          expectedMuted[expectedMuted.length - 1] = false;
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
        }
      );
    });
  });

if (!hideDucking_) {
  // Note: These tests also cover toggling audible, toggling muted, and close (so separate tests won't be created for them)
  describe("music ducking - no play or pause support", function() {
    var setupUrls = nonmusicTestUrls_.slice(0, 2);
    var setupTestUrlsInIncognito = false;
    var setupNewTabCount = 0;
    var setupProperties = {"audible": true};

    beforeEach(function(done) {
      setDefaultTimeouts();
      setupConfig = {"urls": setupUrls, "testUrlsInIncognito": setupTestUrlsInIncognito,
                    "newTabCount": setupNewTabCount, "properties": setupProperties};
      updatePrefs(getDuckingPrefs(), done);
    });

    it("if two tabs are audible, the first to start should be ducked and muted", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          sendTabDataWaitMultiplier_ = 2;
          callback();
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": true, "muted": true, "ducked": true}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": true, "muted": false, "ducked": false}, done);
        }
      );
    });
    it("if ducked tab is unmuted, then tabs should be swapped", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[0], muted: false}}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": true, "muted": false, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": true, "muted": true, "ducked": true}, done);
        }
      );
    });
    it("if unducked tab is muted, tab should be muted and other tab should be unducked/unmuted", function(done) {
      sendTabDataWaitFixed_ = 1500;
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[1], muted: true}}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": true, "muted": false, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": true, "muted": true, "ducked": false}, done);
        }
      );
    });
    it("if unducked tab is no longer audible, tab should be 'other tab' and ducked tab should be unducked/unmuted", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          sendTabDataWaitMultiplier_ = 3; // wait for unducking to happen
          chrome.runtime.sendMessage({set_audible: {tabId: setupData.tabIds[1], audible: false}}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": true, "muted": false, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": false, "muted": false, "ducked": false}, done);
        }
      );
    });
    it("if ducked tab is no longer audible, tab should be muted/unducked and unducked tab should be unchanged", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          sendTabDataWaitMultiplier_ = 3; // wait for unducking to happen
          chrome.runtime.sendMessage({set_audible: {tabId: setupData.tabIds[0], audible: false}}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": false, "muted": false, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": true, "muted": false, "ducked": false}, done);
        }
      );
    });
    it("if ducked tab is closed, it should be gone and then unducked tab should be the same as before", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          chrome.runtime.sendMessage({close_tab: setupData.tabIds[0]}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], null, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": true, "muted": false, "ducked": false}, done);
        }
      );
    });
    it("if unducked tab is closed, it should be gone and ducked tab should be unmuted/unducked", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          chrome.runtime.sendMessage({close_tab: setupData.tabIds[1]}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": true, "muted": false, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], null, done);
        }
      );
    });
    it("if automuting disabled, leave tabs ducked unless unmuted or inaudible", function(done) {
      setupConfig.urls = nonmusicTestUrls_.slice(0, 5);
      sendTabDataWaitFixed_ = 1500;
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          var expectedAudible = [true, true, true, true, true];
          var expectedMuted = [true, true, true, true, false];
          var expectedDucked = [true, true, true, true, false];

          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);

          chrome.runtime.sendMessage({change_disable_automuting: true}, function() {
            getTabDict(function(tabDict) {
              // Should be same as before
              expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
              expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
              expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);

              // Make some changes while ducking is disabled and verify that it makes tabs not ducked
              chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[1], muted: false}}, function() {
                chrome.runtime.sendMessage({set_audible: {tabId: setupData.tabIds[2], audible: false}}, function() {
                  sendTabDataWaitFixed_ = waitForOpsToSettleLong;

                  getTabDict(function(tabDict) {
                    var expectedAudible = [true, true, false, true, true];
                    var expectedMuted = [true, false, false, true, false];
                    var expectedDucked = [true, false, false, true, false];

                    expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
                    expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                    expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);

                    chrome.runtime.sendMessage({change_disable_automuting: false}, callback);
                  });
                });
              });
            });
          });
        },
        function(setupData, tabDict) {
          // Reenabling ducking after previous operations should cause the unducked tab to change
          var expectedAudible = [true, true, false, true, true];
          var expectedMuted = [true, false, false, true, true];
          var expectedDucked = [true, false, false, true, true];

          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);
        }
      );
    });
    it("if privacy mode, leave tabs ducked unless unmuted or inaudible", function(done) {
      sendTabDataWaitFixed_ = 1500;
      setupConfig.urls = nonmusicTestUrls_.slice(0, 5);
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          var expectedAudible = [true, true, true, true, true];
          var expectedMuted = [true, true, true, true, false];
          var expectedDucked = [true, true, true, true, false];

          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);

          chrome.runtime.sendMessage({change_privacy_mode: true}, function() {
            sendTabDataWaitFixed_ = waitForOpsToSettleLong;

            getTabDict(function(tabDict) {

              expectedAudible = [true, true, true, true, true];
              expectedMuted = [true, true, true, true, true];
              expectedDucked = [true, true, true, true, false];

              expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
              expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
              expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);

              // Make some changes while ducking is disabled and verify that it makes tabs not ducked
              chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[1], muted: false}}, function() {
                chrome.runtime.sendMessage({set_audible: {tabId: setupData.tabIds[2], audible: false}}, function() {
                  getTabDict(function(tabDict) {
                    var expectedAudible = [true, true, false, true, true];
                    var expectedMuted = [true, false, false, true, true];
                    var expectedDucked = [true, false, false, true, false];

                    expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
                    expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
                    expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);


                    chrome.runtime.sendMessage({change_privacy_mode: false}, callback);
                  });
                });
              });
            });
          });
        },
        function(setupData, tabDict) {
          // Disabling privacy mode should cause 2nd tab to stay unmuted/unducked and the last tab to now be muted/ducked because it was most recently unmuted and 3rd tab to be not ducked since no longer audible
          var expectedAudible = [true, true, false, true, true];
          var expectedMuted = [true, false, false, true, true];
          var expectedDucked = [true, false, false, true, true];

          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "audible", expectedAudible, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);
        }
      );
    });
    it("if ducking is disabled, ducked tabs are no longer ducked but muted.", function(done) {
      sendTabDataWaitFixed_ = 1500;
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          updatePrefs({enableDucking: false}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": true, "muted": true, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": true, "muted": false, "ducked": false}, done);
        }
      );
    });
    it("enabling ducking after tabs are created should end similar to creating tabs after ducking enabled", function(done) {
      testSetup(this, setupConfig, done,
        function(callback) {
          updatePrefs({enableDucking: false}, callback);
        },
        function(setupData, tabDict, callback) {
          updatePrefs({enableDucking: true}, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"audible": true, "muted": true, "ducked": true}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"audible": true, "muted": false, "ducked": false}, done);
        }
      );
    });

    // open standard set of urls and make them all audible.  loop through and mute/close the unducked tab and verify that the next ducked tab gets unducked
    it("if multiple tabs are ducked, muting the unducked tab should cause the next ducked tab to be unducked", function(done) {
      setupConfig.urls = nonmusicTestUrls_.slice(0, 5);
      setupConfig.properties = {"audible": true};
      setupConfig.testUrlsInIncognito = false;
      sendTabDataWaitFixed_ = 1500;
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          sendTabDataWaitFixed_ = 1000;
          sendTabDataWaitMultiplier_ = 2;
          var expectedMuted = [true, true, true, true, true];
          expectedMuted[expectedMuted.length - 1] = false;
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);

          chrome.runtime.sendMessage({mute_audible: true}, callback);
        },
        function(setupData, tabDict) {
          var expectedMuted = [true, true, true, true, true];
          expectedMuted[expectedMuted.length - 2] = false;
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "muted", expectedMuted, done);

          var expectedDucked = [true, true, true, true, true];
          expectedDucked[expectedMuted.length - 1] = false;
          expectedDucked[expectedMuted.length - 2] = false;
          expectPropertyAcrossTabs(tabDict, setupData.tabIds, "ducked", expectedDucked, done);
        }
      );
    });
  });

  // For play/pause, we allow extra time for players to load and start playing
  // and then cheat with the timestamps so they are in the preferred order and enable ducking
  var describeIfPlayPauseEnabled = PLAYPAUSE_ENABLED ? describe : describe.skip;
  describeIfPlayPauseEnabled("music ducking with play and pause support", function() {
    var setupUrls = musicTestUrls_.slice(0, 2);
    var setupTestUrlsInIncognito = false;
    var setupNewTabCount = 0;
    var setupProperties = {};
    setupConfig = {"urls": setupUrls, "testUrlsInIncognito": setupTestUrlsInIncognito,
                   "newTabCount": setupNewTabCount, "properties": setupProperties};

    beforeEach(function(done) {
      setDefaultTimeouts();
      sendTabDataWaitFixed_ = 15000; // wait for players to load and play
      testTimeoutFixed_ = 15000;
      setupConfig = {"urls": setupUrls, "testUrlsInIncognito": false,
                    "newTabCount": setupNewTabCount, "properties": setupProperties};
      updatePrefs(getPlayPauseDuckingPrefs(), done);
    });

    it("if two tabs are playing, the first to start should be ducked", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          finishPlayPauseSetup(setupData.tabIds, callback);
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"isPlaying": false, "muted": false, "ducked": true}, done);  //gangnam
          expectTabProperties(tabDict[setupData.tabIds[1]], {"isPlaying": true, "muted": false, "ducked": false}, done); //pandora
        }
      );
    });
    it("if ducked tab is played, then tabs should be swapped", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          finishPlayPauseSetup(setupData.tabIds, function() {
              sendTabDataWaitFixed_ = playPauseCommandWaitFixed_;
              console.log("going to play music", setupData.tabIds[0]);
              chrome.runtime.sendMessage({play_music: setupData.tabIds[0]}, callback);
          });
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"isPlaying": true, "muted": false, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"isPlaying": false, "muted": false, "ducked": true}, done);
        }
      );
    });
    it("if unducked tab is muted, tab should be muted and other tab should be unducked/unmuted/playing", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          finishPlayPauseSetup(setupData.tabIds, function() {
            sendTabDataWaitFixed_ = playPauseCommandWaitFixed_; // need this because we wait for other tab to start playing
            chrome.runtime.sendMessage({set_muted: {tabId: setupData.tabIds[1], muted: true}
          }, callback); });
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"isPlaying": true, "muted": false, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"isPlaying": true, "muted": true, "ducked": false}, done);
        }
      );
    });
    it("if unducked tab is paused, tab should be 'other tab' and ducked tab should be unducked/unmuted", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          finishPlayPauseSetup(setupData.tabIds, function() {
            sendTabDataWaitFixed_ = playPauseCommandWaitFixed_ + audibleWaitFixed_;
            console.log("going to send pause_music");
            chrome.runtime.sendMessage({pause_music: setupData.tabIds[1]}, function() { console.log("pause_music done"); callback() });
          });
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"muted": false, "isPlaying": true, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"muted": false, "isPlaying": false, "ducked": false}, done);
        }
      );
    });
    it("if ducked tab is closed, it should be gone and then unducked tab should be the same as before", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          finishPlayPauseSetup(setupData.tabIds, function() { chrome.runtime.sendMessage({close_tab: setupData.tabIds[0]}, callback); });
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], null, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], {"muted": false, "isPlaying": true, "ducked": false}, done);
        }
      );
    });
    it("if unducked tab is closed, it should be gone and ducked tab should be unmuted/unducked/playing", function(done) {
      testSetup(this, setupConfig, done,
        null,
        function(setupData, tabDict, callback) {
          finishPlayPauseSetup(setupData.tabIds, function() { chrome.runtime.sendMessage({close_tab: setupData.tabIds[1]}, callback); });
        },
        function(setupData, tabDict) {
          expectTabProperties(tabDict[setupData.tabIds[0]], {"muted": false, "isPlaying": true, "ducked": false}, done);
          expectTabProperties(tabDict[setupData.tabIds[1]], null, done);
        }
      );
    });
  });
} // hideDucking_

});

// Actually do stuff
////////////////////////////////////////////////////////////
console.log("starting tests");
chrome.runtime.sendMessage({get_prefs: true}, function(prefs) {
  console.log("got prefs", prefs);
  prefsOriginal_ = prefs;
  prefs_ = prefs;

  mocha.suite.afterAll(function() {
    console.log("all done!");
    // restore prefs backup
    if (restorePrefsAfterTests_) {
      console.log("setting prefs to ", prefsOriginal_);
      chrome.runtime.sendMessage({set_prefs: prefsOriginal_});
    }
  });
  mocha.run();
});

