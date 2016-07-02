let KeybindMixin = require('./keybind_mixin');

module.exports = React.createClass({
  mixins: [KeybindMixin],

  propTypes: {
    noisesPrevented: React.PropTypes.number.isRequired,
    showOptions: React.PropTypes.func.isRequired,
    showWebStore: React.PropTypes.func.isRequired,
    showSupport: React.PropTypes.func.isRequired
  },

  componentDidMount: function() {
    this.bindKey(['alt+o'], this.handleClickShowOptions);
    this.bindKey(['alt+w'], this.handleClickShowWebStore);
    this.bindKey(['alt+s'], this.handleClickShowSupport);
  },

  render: function() {

    return (
      <div className='header'>
        <span className="app-title">MuteTab</span>
        <span className='tooltip'>{this.props.noisesPrevented + " noises prevented."}</span>

        <span className="header-buttons-right">
          <span className="header-link mrxl" id="options" onClick={this.handleClickShowOptions}>
            <span>          
              <span className="keyboard-shortcut">O</span>ptions
            </span>
            <span className='tooltip right'>Configure the default muting behavior, whitelist, blacklist, and music list</span>
          </span>

          <span className="header-link mrxl" id="webstore" onClick={this.handleClickShowWebStore}>
            <span>
              <span className="keyboard-shortcut">W</span>eb store
            </span>
            <span className='tooltip right'>Leave a review or read about updates</span>
          </span>

          <span className="header-link mrxl" id="support" onClick={this.handleClickShowSupport}>
            <span>
              <span className="keyboard-shortcut">S</span>upport
            </span>
            <span className='tooltip right'>Report a bug or feature request</span>
          </span>
        </span>
      </div>
    );
  },

  handleClickShowOptions: function() {
    this.props.showOptions();
  },
  handleClickShowWebStore: function() {
    this.props.showWebStore();
  },
  handleClickShowSupport: function() {
    this.props.showSupport();
  }
});
