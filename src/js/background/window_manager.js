var Q = require("q");
var util = require("../util");
var chromeMisc = require("./chrome_misc")(chrome);

module.exports = function(chrome) {
  var extensionTabId_ = null;
  var extensionWindowId_ = null;
  var lastWindowId_ = null;
  var lastTabId_ = null;

  return {
    getTabInfo: function(tabId) {
      return (tabId === null) ? null : util.pcall(chrome.tabs.get, tabId);
    },

    getLastFocusedWindow: function() {
      return util.pcall(chrome.windows.getLastFocused);
    },

    // Get the active tab from the active window
    getCurrentTab: function() {
      var self = this;
      var options = {"active": true};
      return util.pcall(chrome.tabs.query, options)
      .then(function(activeTabs) {
        return self.getLastFocusedWindow()
        .then(function(lastFocusedWindow) {
          //console.log("getCurrentTab - 3");
          //console.log("currentwindowid", currentWindow.id);
          //console.log("activetabs", activeTabs);
          var activeTabForActiveWindow = null;
          activeTabs.forEach(function(activeTab) {
            if (activeTab.windowId === lastFocusedWindow.id)
              activeTabForActiveWindow = activeTab;
          });
          if ((activeTabForActiveWindow === null) && (activeTabs.length)) {
            activeTabForActiveWindow = activeTabs[0];
          }
          chromeMisc.ensureMutedInfo(activeTabForActiveWindow);
          //console.log("activetabforactivewindow", activeTabForActiveWindow);
          return Q.when(activeTabForActiveWindow);
        });
      }).catch(function(error) {
        console.error(error);
      });
    },

    getExtensionWindowId: function() {
      return Q.when(extensionWindowId_);
    },
    getExtensionWindowIdSync: function() {
      return extensionWindowId_;
    },
    setExtensionWindowId: function(id) {
      extensionWindowId_ = id;
      return Q.when(extensionWindowId_);
    },

    getExtensionTabId: function() {
      return Q.when(extensionTabId_);
    },
    getExtensionTabIdSync: function() {
      return extensionTabId_;
    },
    setExtensionTabId: function(id) {
      extensionTabId_ = id;
      return Q.when(id);
    },

    getLastTabId: function() {
      return Q.when(lastTabId_);
    },
    getLastTabIdSync: function() {
      return lastTabId_;
    },
    setLastTabId: function(id) {
      lastTabId_ = id;
      return Q.when(lastTabId_);
    },

    getLastWindowId: function() {
      return Q.when(lastWindowId_);
    },
    getLastWindowIdSync: function() {
      return lastWindowId_;
    },
    setLastWindowId: function(id) {
      lastWindowId_ = id;
      return Q.when(lastWindowId_);
    },

    showExtensionUi: function(width, height, left, top) {
      var opts = {
        width: width,
        height: height,
        left: left,
        top: top,
        url: chrome.runtime.getURL("build/html/popup.html"),
        focused: true,
        type: "popup"
      };

      return util.pcall(chrome.windows.create.bind(chrome.windows), opts)
      .then(function(extensionWindow) {
        return this.setExtensionWindowId(extensionWindow.id)
        .then(this.setExtensionTabId(extensionWindow.tabs[0].id));
      }.bind(this));
    },

    createTab: function(properties) {
      return util.pcall(chrome.tabs.create.bind(chrome.tabs), properties);
    },

    createTabs: function(urls) {
      var promises = [];
      var self = this;
      urls.forEach(function(url) {
        promises.push(self.createTab({url: url}));
      });
      return Q.all(promises);
    },

    createWindow: function(properties) {
      return util.pcall(chrome.windows.create.bind(chrome.windows), properties);
    },

    getTabs: function() {
      return util.pcall(chrome.tabs.query.bind(chrome.tabs), {});
    },

    openUrl: function(url) {
      return util.pcall(chrome.tabs.create.bind(chrome.tabs), {url: url});
    },

    changeUrl: function(tabId, url) {
      if (url.indexOf("chrome-extension://") !== -1)
        return Q.when(null);
      return util.pcall(chrome.tabs.update.bind(chrome.tabs), tabId, {url: url});
    },

    changeAllUrls: function() {
      console.log("changeallurls");
      var self = this;
      return this.getTabs()
      .then(function(tabs) {
        var promises = [];
        tabs.forEach(function(tab) {
          promises.push(self.changeUrl(tab.id, tab.url + "/urlchangetest"));
        });
        return Q.allSettled(promises);
      });
    },

    queryTabs: function(senderTabId, showAudibleOnly, recentTabs, lastWindowId) {
      var options = {};
      if (showAudibleOnly)
        options.audible = true;
      return util.pcall(chrome.tabs.query, options)
      .then(function(tabs) {
        tabs = tabs.filter(function(tab) { return tab.id != senderTabId; });
        tabs.forEach(function(tab) {
          chromeMisc.ensureMutedInfo(tab);
        });
        var results = {tabs: tabs};
        if (!((recentTabs === null) && (lastWindowId === null))) {
          var temp = recentTabs[lastWindowId] || [];
          results = {
            tabs: tabs,
            lastActive: (temp)[temp.length - 1] || null
          };
        }
        return results;
      });
    },

    switchToTab: function(tabId) {
      console.log(tabId, "switchtotab");
      var self = this;
      return this.updateTab(tabId, {active: true})
      .then(this.getTabInfo(tabId))
      .then(function(tab) {
        return (!tab)
          ? Q.when(null)
          : self.updateWindow(tab.windowId, {focused: true});
      });
    },

    // This function is used to ensure that a set of tabids are all visited to allow the players to load;
    // the order doesn't matter. Used by tests.
    switchToTabs: function(tabIds) {
      var self = this;
      return tabIds.reduce(function(previous, tabId) {
        return previous.then(function() {
          return self.switchToTab(tabId);
        });
      }, Q());
    },

    closeTab: function(tabId) {
      return util.pcall(chrome.tabs.remove.bind(chrome.tabs), tabId);
    },

    updateTab: function(tabId, updateProperties) {
      // console.log("updateTab", tabId, updateProperties);
      return util.pcall(chrome.tabs.update.bind(chrome.tabs), tabId, updateProperties);
    },

    updateWindow: function(windowId, updateProperties) {
      //console.log("updateWindow", windowId, updateProperties);
      return util.pcall(chrome.windows.update.bind(chrome.windows), windowId, updateProperties);
    },

    // Initialize the last windowid and tabid
    init: function() {
      var self = this;
      return this.getCurrentTab()
      .then(function(tabInfo) {
        self.setLastTabId(tabInfo.id);
        self.setLastWindowId(tabInfo.windowId);

        return Q.when(null);
      });
    }
  };
};
