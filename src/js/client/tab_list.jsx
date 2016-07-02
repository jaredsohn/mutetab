/*eslint-disable no-unused-vars*/
let TabItem = require('./tab_item.jsx');
let KeybindMixin = require('./keybind_mixin');
/*eslint-enable no-unused-vars*/
let ReactDom = require('react-dom');

module.exports = React.createClass({
  mixins: [KeybindMixin],

  propTypes: {
    filter: React.PropTypes.string.isRequired,
    selectedTab: React.PropTypes.object.isRequired,
    changeSelected: React.PropTypes.func.isRequired,
    activateSelected: React.PropTypes.func.isRequired,
    toggleMuteSelected: React.PropTypes.func.isRequired,
    playMusic: React.PropTypes.func.isRequired,
    pauseMusic: React.PropTypes.func.isRequired,
    toggleBlackOrWhiteList: React.PropTypes.func.isRequired,
    duckingEffectivelyEnabled: React.PropTypes.bool.isRequired,
    loggingEnabled: React.PropTypes.bool.isRequired,
    tabs: React.PropTypes.array.isRequired,
    showOtherTabs: React.PropTypes.bool.isRequired,
    modifySelected: React.PropTypes.func.isRequired,
    exit: React.PropTypes.func.isRequired
  },

  getTabItem: function(tab) {
    let selected = ((this.props.selectedTab || null) !== null) && 
                    (this.props.selectedTab.id === tab.id) && 
                    (this.props.selectedTab.category === tab.category);
    let elem = (
      <TabItem
        tab={tab}
        filter={this.props.filter}
        selected={selected}
        changeSelected={this.props.changeSelected}
        activateSelected={this.props.activateSelected}
        toggleMuteSelected={this.props.toggleMuteSelected}
        playMusic={this.props.playMusic}
        pauseMusic={this.props.pauseMusic}
        toggleBlackOrWhiteList={this.props.toggleBlackOrWhiteList}
        duckingEffectivelyEnabled={this.props.duckingEffectivelyEnabled}
        loggingEnabled={this.props.loggingEnabled}
        containerHeight={this.getHeight()}
        containerScrollTop={this.getScrollTop()}
        setContainerScrollTop={this.setScrollTop}/>
    );
    return elem;
  },

  componentDidMount: function() {
    this.bindKey('esc', this.props.exit);
    this.bindKey('enter', this.props.activateSelected);
    this.bindKey('up', this.selectPrevious);
    this.bindKey('down', this.selectNext);
  },

  selectPrevious: function() {
    this.props.modifySelected(-1);
  },

  selectNext: function() {
    this.props.modifySelected(1);
  },

  render: function() {
    let title;
    let prevCategory = "";

    return (
      <ul>
        {
          this.props.tabs.map((tab) => {
            title = (prevCategory !== tab.category) ? tab.category : "";
            if (title !== "") {
              prevCategory = title;
            }

            return ( 
              <div key={title + "_" + tab.id}> 
                {(title !== "") 
                ? <div>
                  <hr/>
                  <li className="tab-category">{title}</li>
                  <div className="tab-item">{this.getTabItem(tab)}</div>
                </div>
                : <div className="tab-item">
                  {this.getTabItem(tab)}
                </div>}
              </div>
            );
          }) // map
        }
        <hr/>
      </ul>
    );
  },

  getHeight: function() {
    let node = ReactDom.findDOMNode(this);
    return (node !== null) ? node.offsetHeight : 240;
  },

  getScrollTop: function() {
    let node = ReactDom.findDOMNode(this);
    return (node !== null) ? node.scrollTop : 0; // offset added to increase change that category will be visible
  },

  setScrollTop: function(val) {
    ReactDom.findDOMNode(this).scrollTop = val;
  }
});
