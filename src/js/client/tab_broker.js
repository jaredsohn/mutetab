let util = require("../util");

module.exports = function(chrome) {
  return {
    query: function() {
      let opts = {send_tab_data: true};
      let fn = chrome.runtime.sendMessage.bind(chrome.runtime);
      return util.pcall(fn, opts).then(function(data) {
        console.log("query data", data);
        return data;
      });
    },

    switchTo: function(tab) {
      chrome.runtime.sendMessage({switch_to_tab: tab.id}, function() {});
    },

    close: function(tab) {
      chrome.runtime.sendMessage({close_tab: tab.id}, function() {});
    }
  };
};
