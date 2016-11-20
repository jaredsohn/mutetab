let KeybindMixin = require('./keybind_mixin');

let hideDucking_ = false;

module.exports = React.createClass({
  mixins: [KeybindMixin],

  propTypes: {
    privacyMode: React.PropTypes.bool.isRequired,
    disableAutomuting: React.PropTypes.bool.isRequired,
    muteBackground: React.PropTypes.func.isRequired,
    muteAll: React.PropTypes.func.isRequired,
    unmuteAll: React.PropTypes.func.isRequired,
    changePrivacyMode: React.PropTypes.func.isRequired,
    changeDisableAutomuting: React.PropTypes.func.isRequired,
    privacyModeToggleInProgress: React.PropTypes.bool.isRequired
  },

  componentDidMount: function() {
    this.bindKey(['alt+b'], this.handleClickMuteBackground);
    this.bindKey(['alt+a'], this.handleClickMuteAll);
    this.bindKey(['alt+u'], this.handleClickUnmuteAll);
    this.bindKey(['alt+p'], this.handleChangePrivacyMode);
    this.bindKey(['alt+d'], this.handleChangeDisableAutomuting);
  },

  render: function() {
    let privacyModeCheckbox = this.props.privacyMode ? <img className="button-image-checkboxes mrm" src="../img/checked.png"/> : <img className="button-image-checkboxes mrm" src="../img/unchecked.png"/>;
    let disableAutomutingCheckbox = this.props.disableAutomuting ? <img className="button-image-checkboxes mrm" src="../img/checked.png"/> : <img className="button-image-checkboxes mrm" src="../img/unchecked.png"/>;
    let disableAutomutingText = hideDucking_ ?
                                "Turn on to disable default muting behavior. Cannot be set when in privacy mode." :
                                "Turn on to disable default muting behavior and music ducking. Cannot be set when in privacy mode.";

    return (
      <div className='status mrm'>
        <span className="status-button mlxl mrxl" id="mute_background" onClick={this.handleClickMuteBackground}>
          <span>
            Mute <span className="keyboard-shortcut">b</span>ackground tabs
          </span>
          <span className='tooltip'>Mute background tabs (excluding music sites).</span>
        </span>

        <span className="status-button mrxl" id="mute_all" onClick={this.handleClickMuteAll}>
          <span>
            Mute <span className="keyboard-shortcut">a</span>ll tabs
          </span>
          <span className='tooltip'>Mute all tabs (excluding music sites)</span>
        </span>

        <span className="status-button mrxl" id="unmute_all" onClick={this.handleClickUnmuteAll}>
          <span>
            <span className="keyboard-shortcut">U</span>nmute all tabs
          </span>
          <span className='tooltip'>Unmute all tabs</span>
        </span>

        <span id="set_privacy_mode" className={"mrxl " + ((this.props.disableAutomuting || this.props.privacyModeToggleInProgress) ? "status-button-disabled" : "status-button")} onClick={this.handleChangePrivacyMode}>
          <span>
            {privacyModeCheckbox}<span className="keyboard-shortcut">P</span>rivacy Mode
          </span>
          <span className='tooltip right'>Turn on to mute all tabs (including music sites). Cannot be set when automuting is disabled.</span>
        </span>

        <span id="disable_automuting" className={"mrxl " + (this.props.privacyMode ? "status-button-disabled" : "status-button")} onClick={this.handleChangeDisableAutomuting}>
          <span>
            {disableAutomutingCheckbox}<span className="keyboard-shortcut">D</span>isable automuting
          </span>
          <span className='tooltip right'>{disableAutomutingText}</span>
        </span>
      </div>
    );
  },

  handleClickMuteBackground: function() {
    this.props.muteBackground();
  },

  handleClickMuteAll: function() {
    this.props.muteAll();
  },

  handleClickUnmuteAll: function() {
    this.props.unmuteAll();
  },

  handleChangePrivacyMode: function() {
    if (this.props.disableAutomuting)
      return;
    this.props.changePrivacyMode(!this.props.privacyMode);
  },

  handleChangeDisableAutomuting: function() {
    if (this.props.privacyMode)
      return;
    this.props.changeDisableAutomuting(this.props.disableAutomuting);
  }
});
