let stringScore = require('../../../lib/string_score');
let tabBroker = require('./tab_broker')(chrome);
let tabFilter = require('./tab_filter')(stringScore);

/*eslint-disable no-unused-vars*/
let TabList = require('./tab_list.jsx');
let StatusBar = require('./status_bar.jsx');
let Header = require('./header.jsx');
/*eslint-enable no-unused-vars*/

module.exports = React.createClass({
  getInitialState: function() {
    return {
      filter: '',
      selected: null,
      tabs: [],
      listType: "black",
      incognitoListType: "black",
      activeListType: "black",
      showOtherTabs: false,
      simulationMode: false,
      privacyMode: false,
      disableAutomuting: false,
      hoveredTabId: -1,
      noisesPrevented: 0,
      duckingEffectivelyEnabled: false,
      loggingEnabled: false,
      privacyModeToggleInProgress: false
    };
  },

  componentDidMount: function() {
    window.onblur = this.close;
    this.refreshTabs();
  },

  render: function() {
    return (
      (this.state.tabs.length === 0)
      ? null
      :
        <div>
          <Header
            showOptions={this.showOptions}
            showWebStore={this.showWebStore}
            showSupport={this.showSupport}
            noisesPrevented={this.state.noisesPrevented}/>
          <TabList
            tabs={this.filteredTabs()}
            filter={this.state.filter}
            selectedTab={this.getSelected()}
            changeSelected={this.changeSelected}
            activateSelected={this.activateSelected}
            toggleMuteSelected={this.toggleMuteSelected}
            toggleBlackOrWhiteList={this.toggleBlackOrWhiteList}
            playMusic={this.playMusic}
            pauseMusic={this.pauseMusic}
            showOtherTabs={this.state.showOtherTabs}
            duckingEffectivelyEnabled={this.state.duckingEffectivelyEnabled}
            loggingEnabled={this.state.loggingEnabled}
            modifySelected={this.modifySelected}
            exit={this.close}/>
          <StatusBar
            privacyMode={this.state.privacyMode}
            disableAutomuting={this.state.disableAutomuting}
            muteAll={this.muteAll}
            unmuteAll={this.unmuteAll}
            muteBackground={this.muteBackground} 
            changePrivacyMode={this.changePrivacyMode}
            changeDisableAutomuting={this.changeDisableAutomuting}
            privacyModeToggleInProgress={this.state.privacyModeToggleInProgress}/>
        </div>
    );
  },

  refreshTabs: function() {
    try {
      tabBroker.query()
      .then(function(data) {
        // We maintain selection if we have data for the same tab id.
        let oldSelectedId = (this.state.selected !== null) ? this.state.selected.id : "";
        let oldSelectedCategory = (this.state.selected !== null) ? this.state.selected.category : null;
        let newSelected = null;
        let matchedCategory = false;
        data.tabs.forEach(function(tabInfo) { // _.find if other reason to use underscore
          if ((tabInfo.id === oldSelectedId) && (!matchedCategory)) {
            newSelected = tabInfo;
            if (tabInfo.category === oldSelectedCategory)
              matchedCategory = true;
          }
        });
        this.setState({
          selected: newSelected,
          tabs: data.tabs,
          listType: data.listType,
          incognitoListType: data.incognitoListType,
          activeListType: data.activeListType,
          showOtherTabs: data.showOtherTabs,
          simulationMode: data.simulationMode,
          privacyMode: data.privacyMode,
          disableAutomuting: data.disableAutomuting,
          hoveredTabId: this.state.hoveredTabId,
          noisesPrevented: data.noisesPrevented,
          duckingEffectivelyEnabled: data.duckingEffectivelyEnabled,
          loggingEnabled: data.loggingEnabled,
          privacyModeToggleInProgress: data.privacyModeToggleInProgress
        });
        if (this.state.loggingEnabled) {
          console.log("state is", this.state);
        }
      }.bind(this));
    } catch (ex) {
      console.error(ex);
    }
  },

  // We're calculating this on the fly each time instead of caching
  // it in the state because it is very much fast enough, and
  // simplifies some race-y areas of the component's lifecycle.
  filteredTabs: function() {
    if (this.state.filter.trim().length) {
      return tabFilter(this.state.filter, this.state.tabs)
      .map(function(result) {
        return result.tab;
      });
    }

    return this.state.tabs;
  },

  getSelected: function() {
    return this.state.selected || this.filteredTabs()[0];
  },

  activateSelected: function() {
    let selected = this.getSelected();
    if (selected) {
      tabBroker.switchTo(selected);
      this.close();
    }
  },

  toggleMuteSelected: function() {
    let selected = this.getSelected();
    chrome.runtime.sendMessage({set_muted:
      {tabId: selected.id, muted: !selected.mutedInfo.muted}}, function() {});
  },

  changeFilter: function(newFilter) {
    this.setState({filter: newFilter, selected: null});
  },

  changeSelected: function(tab) {
    this.setState({selected: tab});
  },

  modifySelected: function(change) {
    let filteredTabs = this.filteredTabs();
    if (!filteredTabs.length) return false;

    let currentIndex = filteredTabs.indexOf(this.getSelected());
    let newIndex = currentIndex + change;
    if (newIndex < 0) return false;
    if (newIndex >= filteredTabs.length) return false;
    let newTab = filteredTabs[newIndex];
    this.changeSelected(newTab);
    return true;
  },

  changePrivacyMode: function(value) {
    if (this.state.disableAutomuting)
      return;

    this.setState({privacyMode: value}, () => {
      chrome.runtime.sendMessage({change_privacy_mode: value}, this.refreshTabs);
    });
  },

  changeDisableAutomuting: function(value) {
    if (this.state.privacyMode)
      return;

    this.setState({disableAutomuting: value}, () => {
      chrome.runtime.sendMessage({change_disable_automuting: value}, this.refreshTabs);
    });
  },

  toggleBlackOrWhiteList: function(tab, newListType) {
    this.setState({hoveredTabId: tab.id});
    chrome.runtime.sendMessage(
      {update_listtype: {listType: newListType,
                         domain: tab.domainForListComputed
                        }
      }, () => { this.refreshTabs(); });
  },

  showOptions: function() {
    chrome.runtime.sendMessage({show_options: true}, function() {});
  },
  showWebStore: function() {
    chrome.runtime.sendMessage({show_webstore: true}, function() {});
  },
  showSupport: function() {
    chrome.runtime.sendMessage({show_support: true}, function() {});
  },

  muteAll: function() {
    chrome.runtime.sendMessage({mute_all: true}, function() {});
  },

  unmuteAll: function() {
    chrome.runtime.sendMessage({unmute_all: true}, function() {});
  },

  muteBackground: function() {
    chrome.runtime.sendMessage({mute_background: true}, function() {});
  },

  playMusic: function(tab) {
    chrome.runtime.sendMessage({play_music: tab.id}, function() {});
  },

  pauseMusic: function(tab) {
    chrome.runtime.sendMessage({pause_music: tab.id}, function() {});
  },

  close: function() {
    window.close();
  }
});
