let hideDucking_ = false;

module.exports = React.createClass({

  propTypes: {
    tab: React.PropTypes.object.isRequired,
    filter: React.PropTypes.string.isRequired,
    selected: React.PropTypes.bool.isRequired,
    duckingEffectivelyEnabled: React.PropTypes.bool.isRequired,
    loggingEnabled: React.PropTypes.bool.isRequired,
    changeSelected: React.PropTypes.func.isRequired,
    activateSelected: React.PropTypes.func.isRequired,
    toggleMuteSelected: React.PropTypes.func.isRequired,
    playMusic: React.PropTypes.func.isRequired,
    pauseMusic: React.PropTypes.func.isRequired,
    toggleBlackOrWhiteList: React.PropTypes.func.isRequired
  },

  getInitialState: function() {
    return {
      mute_button_hovered: false,
      black_or_white_list_button_hovered: false,
      play_pause_hovered: false
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    if (this.props.loggingEnabled) {
      console.log("rerendering", nextProps, nextState);
    }

    return true;
  },

  getCurrentListType: function() {
    let currentListType = "neither";
    if (this.props.tab.isWhiteList) {
      currentListType = "white";
    } else if (this.props.tab.isBlackList) {
      currentListType = "black";
    }

    return currentListType;
  },

  getHoveredListType: function(currentListType) {
    let mapping = {
      "black": "white",
      "white": "neither",
      "neither": "black"
    };
    return (mapping.hasOwnProperty(currentListType)) ? mapping[currentListType] : null;
  },

  componentWillMount: function() {
    this.computeDomainForList();
  },

  renderBlackOrWhiteListIndicator: function() {
    let currentListType = this.getCurrentListType();
    let renderedListType = (this.state.black_or_white_list_button_hovered)
      ? this.getHoveredListType(currentListType)
      : currentListType;

    let tooltipTextDict = {
      "white": "On the blacklist; click to move domain to the whitelist.",
      "black": "On neither the blacklist nor the whitelist; click to add domain to the blacklist.",
      "neither": "On the whitelist; click to remove domain."
    };
    let tooltipText = tooltipTextDict.hasOwnProperty(renderedListType) ? tooltipTextDict[renderedListType] : "white";

    return (
      <span>
        {(this.props.selected)
          ? <span className='blackwhitelist-indicator tab-item-no-fade-span'
            onMouseEnter={this.handleBlackOrWhiteListButtonMouseEnter}
            onMouseLeave={this.handleBlackOrWhiteListButtonMouseLeave}
            onClick={this.handleBlackOrWhiteListClick}>
            <img className={"tab-image"} src={"../img/" + renderedListType + "list.png"} />
            {this.renderTooltip(tooltipText, true)}
          </span>
          : null
        }
      </span>
    );
  },

  renderFavicon: function() {
    let hasFavicon = (((this.props.tab.favIconUrl || null) !== null) && (this.props.tab.favIconUrl.indexOf("chrome") !== 0));

    return (
      <span className='favicon tab-item-no-fade-span'>
        {hasFavicon
          ? <span>
            <img className={'tab-image'} src={this.props.tab.favIconUrl} />
            {(this.props.loggingEnabled) 
            ? this.renderTooltip("tabid: " + this.props.tab.id, false)
            : ""}
          </span>
          : null
        }
      </span>
    );
  },

  renderManualDuckingIndicator: function() {
    if ((hideDucking_) || 
      (!this.props.tab.isManualDucking) ||
      (!this.props.duckingEffectivelyEnabled) ||
      ((this.props.selected === null) && (this.props.tab.category !== "Most recently noisy or playing tab"))) { 
        return null;
    }

    let tooltipText = "Member of Manual Ducking Controls list.\n";
    tooltipText += "Other music will not be unducked when this tab is silent for\n";
    tooltipText += "awhile; you need to manually mute/close it or play the music.\n\n";
    tooltipText += "Change list membership in options or via the context menu on the tab.";

    return (
      <span className='in-manualducking-list tab-item-no-fade-span'>
        <img className='tab-image' src='../img/manualmode.png'/>
        {this.renderTooltip(tooltipText, true)}
      </span>
    );
  },

  renderMusicListIndicator: function() {
    if (!this.props.tab.isMusic)
      return null;

    let tooltipText = "Member of music list.\n";
    tooltipText += "This tab will be excluded when muting all or background tabs.\n";
    tooltipText += "Change list membership in options or via the context menu on the tab.";

    return (
      <span className='in-music-list tab-item-no-fade-span'>
        <img className='tab-image' src='../img/musiclist.png'/>
        {this.renderTooltip(tooltipText, false)}
      </span>
    );
  },

  renderPlayOrPauseButton: function() {
    if ((this.props.tab.isPlaying === "") || (!this.props.selected)) {
      return null;
    }

    let playOrPause = this.props.tab.isPlaying ? "Play" : "Pause";
    if (this.state.play_pause_button_hovered) {
      playOrPause = (playOrPause === "Play") ? "Pause" : "Play";
    }

    let playOrPauseText = playOrPause;
    if (!this.props.tab.supportedPlayer) {
      playOrPauseText += "\n(Only supports HTML5 video/audio for this tab; manual intervention may be needed.)";
    }
    if (this.props.tab.playPauseReason !== "") {
      playOrPauseText += "\n" + ("(" + this.props.tab.playPauseReason + ")");
    }

    return (
      <span className='play-or-pause-button tab-item-fade-span' 
        onMouseEnter={this.handlePlayPauseButtonMouseEnter} 
        onMouseLeave={this.handlePlayPauseButtonMouseLeave} 
        onClick={this.props.tab.isPlaying === false ? this.handlePlayMusicButton : this.handlePauseMusicButton}>
        <img className="tab-image" src={"../img/" + playOrPause.toLowerCase() + ".png"}></img>
        {this.renderTooltip(playOrPauseText, true)}
      </span>
    );
  },

  renderMuteToggleButton: function() {
    let muteOrUnmute = "";
    let muteHovered = (this.state.mute_button_hovered == true);
    if (!this.props.tab.captured) {
      if (this.props.tab.mutedInfo.muted) {
        muteOrUnmute = !muteHovered ? "Mute" : "Unmute";
      } else if (this.props.tab.maybeAudible) {
        muteOrUnmute = (!muteHovered) ? "Unmute" : "Mute";
      }
    }

    if ((muteOrUnmute === "") || (!(this.props.selected || (!this.props.tab.mutedInfo.muted && this.props.tab.maybeAudible)))) {
      return null;
    }

    let tooltipText = muteOrUnmute;
    if (this.props.tab.mutedReason) {
      tooltipText += "\n(" + this.props.tab.mutedReason + ")";
    }
    if (this.props.tab.mutingError) {
      tooltipText += "\nNote: an error occurred while updating it. Perhaps the tab is being captured?";
    }

    return (
      <span
        className='mute-toggle-button tab-item-fade-span'
        onMouseEnter={this.handleMuteButtonMouseEnter}
        onMouseLeave={this.handleMuteButtonMouseLeave}
        onClick={this.handleToggleMuteButton}>
        <img className='tab-image' src={"../img/" + muteOrUnmute.toLowerCase() + ".png"}/>
        {this.renderTooltip(tooltipText, true)}
      </span>
    );
  },

  // Text will be split on \n to expand over multiple lines
  renderTooltip: function(tooltipText, isRight) {
    return (
      <span className={"tooltip" + (isRight ? " right" : "")}>
        {tooltipText.split("\n").map(i => {
          return <span key={i.toString()}>{i}<br/></span>;
        })}
      </span>
    );
  },

  renderTabInfo: function() {
    let tooltipText = this.props.tab.title;
    if (((this.props.tab.artist || "") !== "") && ((this.props.tab.song || "") !== "")) {
      tooltipText += "\n" + this.props.tab.artist + " - " + this.props.tab.song;
    }
    
    return (
      <span className='tab-item-text'>
        <span className='url mrm'>{this.getDomainForTab(this.props.tab)}</span>
        {this.renderTooltip(this.props.tab.url)}
        <span className='title'>{this.getTabTitle(this.props.tab)}</span>
        {this.renderTooltip(tooltipText, false)}
      </span>
    );
  },

  render: function() {
    try {
      return (
        <li className={this.props.selected ? "selected" : ""}
          onClick={this.handleClick} onMouseEnter={this.handleMouseEnter}>
          <div className='tab-item'/> 
          {this.renderMusicListIndicator()}
          {this.renderFavicon()}
          {this.renderTabInfo()}
          {this.renderManualDuckingIndicator()}
          {this.renderBlackOrWhiteListIndicator()}
          {this.renderPlayOrPauseButton()}
          {this.renderMuteToggleButton()}
        </li>
      );
    } catch (ex) {
      console.error(ex);
      return null;
    }
  },

  getTabTitle: function(tab) {
    return tab.title;
  },

  // Get the domain from domainForWhiteBlackList or url (and return null if an error)
  getDomain: function(tab) {
    let domain = tab.domainForListComputed || null;

    try {
      if (!domain) {
        if ((tab.url.indexOf("chrome://") === 0)) {
          domain = "chrome://" + new URL(tab.url).hostname + "/";
        } else if ((tab.url.indexOf("chrome-extension://") === 0)) {
          domain = "chrome-extension://" + new URL(tab.url).hostname + "/";
        } else {
          domain = new URL(tab.url).hostname || "";
        }
      }
    } catch (ex) {
      console.error(ex);
    }

    return domain;
  },

  getDomainForTab: function(tab) {
    return this.getDomain(tab);
  },

  computeDomainForList: function() {
    this.props.tab.domainForListComputed = 
      (this.getCurrentListType() === "white") ? 
      this.props.tab.domainForWhiteList : 
      this.props.tab.domainForBlackList;

    if ((this.props.tab.domainForListComputed || null) === null) {
      this.props.tab.domainForListComputed = this.getDomain(this.props.tab);
    }
  },

  handleMouseEnter: function() {
    this.props.changeSelected(this.props.tab);
  },

  handleClick: function(evt) {
    evt.stopPropagation();
    this.props.activateSelected();
  },

  handleToggleMuteButton: function(evt) {
    evt.stopPropagation();
    this.props.toggleMuteSelected();
  },

  handlePlayMusicButton: function(evt) {
    evt.stopPropagation();
    this.props.playMusic(this.props.tab);
  },

  handlePauseMusicButton: function(evt) {
    evt.stopPropagation();
    this.props.pauseMusic(this.props.tab);
  },

  handleBlackOrWhiteListClick: function(evt) {
    evt.stopPropagation();
    let currentListType = this.getCurrentListType();
    let hoveredListType = this.getHoveredListType(currentListType);
    this.computeDomainForList();
    this.props.toggleBlackOrWhiteList(this.props.tab, hoveredListType);
  },

  handleMuteButtonMouseEnter: function() {
    this.setState({mute_button_hovered: true});
  },

  handleMuteButtonMouseLeave: function() {
    this.setState({mute_button_hovered: false});
  },

  handleBlackOrWhiteListButtonMouseEnter: function() {
    this.setState({black_or_white_list_button_hovered: true});
  },

  handleBlackOrWhiteListButtonMouseLeave: function() {
    this.setState({black_or_white_list_button_hovered: false});
  },

  handlePlayPauseButtonMouseEnter: function() {
    this.setState({play_pause_button_hovered: true});
  },

  handlePlayPauseButtonMouseLeave: function() {
    this.setState({play_pause_button_hovered: false});
  }
});
