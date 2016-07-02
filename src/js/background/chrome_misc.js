var util = require("../util");

module.exports = function(chrome) {
  return {
    setMuted: function(tabId, muted) {
      return util.pcall(chrome.tabs.update.bind(chrome.tabs), tabId, {muted: muted});
    },

    createNotification: function(id, dict) {
      return util.pcall(chrome.notifications.create.bind(chrome.notifications), id, dict);
    },

    getFromSyncStorage: function(keysDict) {
      return util.pcall(chrome.storage.sync.get.bind(chrome.storage.sync), keysDict);
    },

    setSyncStorage: function(keysDict) {
      return util.pcall(chrome.storage.sync.set.bind(chrome.storage.sync), keysDict);
    },

    executeScript: function(tabId, dict) {
      return util.pcall(chrome.tabs.executeScript.bind(chrome.tabs), tabId, dict);
    },

    tabsSendMessage: function(tabId, message, options) {
      // console.log(tabId, "tabsSendMessage", message, options);
      return util.pcall(chrome.tabs.sendMessage.bind(chrome.tabs), tabId, message, options);
    },

    setBrowserActionIcon: function(options) {
      return util.pcall(chrome.browserAction.setIcon.bind(chrome.browserAction), options);
    },

    removeTabIds: function(tabIds) {
      return util.pcall(chrome.tabs.remove.bind(chrome.tabs), tabIds);
    },

    contextMenusRemoveAll: function() {
      return util.pcall(chrome.contextMenus.removeAll.bind(chrome.contextMenus));
    },

    // updates a tab object to include a muted_info if there isn't already one
    ensureMutedInfo: function(tab) {
      if ((typeof tab === "undefined") || (tab === null))
        return;
      if ((!tab.hasOwnProperty("mutedInfo")) && (tab.hasOwnProperty("mutedCause"))) {
        tab.mutedInfo = {};
        tab.mutedInfo.muted = tab.muted || false;
        var reasons = ["capture", "user", ""];
        if (reasons.indexOf(tab.mutedCause) >= 0) {
          tab.mutedInfo.reason = tab.mutedCause;
        } else {
          tab.mutedInfo.reason = "extension";
          tab.mutedInfo.extensionId = tab.mutedCause || "";
        }
      }
    }
  };
};
