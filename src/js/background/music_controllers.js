// Music controllers (and some of infrastructure code) comes from Streamkeys (https://github.com/berrberr/streamkeys)
// I've simplified the matching logic to just look for the same domain (which seems to usually be okay (except for Amazon music)

module.exports = function() {
  var sites_ = {};

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

  /**
   * @return {RegExp} a regex that matches where the string is in a url's (domain) name
   */
  var urlCheck = function(domain, alias) {
    var inner = alias ? domain + "|www." + domain + "|" + alias.join("|") : domain + "|www." + domain;
    return (new RegExp("^(http|https):\/\/(?:[^.]*\\.){0,3}(?:" + inner + ")+\\."));
  };

  var getSites = function() {
    // from build/unpacked-dev/js/modules/Sitelist.js in Streamkeys; but change this.sites into return
    return {
      "7digital": {name: "7digital", url: "http://www.7digital.com"},
      "8tracks": {name: "8tracks", url: "http://www.8tracks.com"},
      "amazon": {name: "Amazon Cloud Player", url: "https://www.amazon.com/gp/dmusic/cloudplayer/player"},
      "ambientsleepingpill": {name: "Ambient Sleeping Pill", url: "http://www.ambientsleepingpill.com"},
      "asoftmurmur": {name: "A Soft Murmur", url: "http://www.asoftmurmur.com"},
      "audible": {name: "Audible", url: "http://www.audible.com"},
      "audiosplitter": {name: "Audiosplitter", url: "http://www.audiosplitter.fm"},
      "bandcamp": {name: "Bandcamp", url: "http://www.bandcamp.com"},
      "bbc": {name: "BBC Radio", url: "http://www.bbc.co.uk/radio", controller: "BBCRadioController.js"},
      "beatsmusic": {name: "Beats Web Player", url: "https://listen.beatsmusic.com"},
      "beatport": {name: "Beatport", url: "https://www.beatport.com"},
      "beta.last": {name: "LastFm", url: "http://beta.last.fm", controller: "BetaLastfmController.js"},
      "blitzr": {name: "Blitzr", url: "http://www.blitzr.com"},
      "bop": {name: "Bop.fm", url: "http://bop.fm"},
      "cubic": {name: "Cubic.fm", url: "http://www.cubic.fm"},
      "deezer": {name: "Deezer", url: "http://www.deezer.com"},
      "demodrop": {name: "DemoDrop", url: "http://www.demodrop.com"},
      "di": {name: "Di.fm", url: "http://www.di.fm"},
      "disco": {name: "Disco.io", url: "http://www.disco.io"},
      "earbits": {name: "Earbits", url: "http://www.earbits.com"},
      "player.edge": {name: "Edge Player", url: "http://player.edge.ca", controller: "EdgeController.js"},
      "emby": {name: "Emby", url: "http://app.emby.media"},
      "gaana": {name: "Gaana", url: "http://www.gaana.com"},
      "guvera": {name: "Guvera", url: "https://www.guvera.com"},
      "play.google": {name: "Google Play Music", url: "http://play.google.com", controller: "GoogleMusicController.js"},
      "grooveshark": {name: "Grooveshark", url: "http://www.grooveshark.com"},
      "hypem": {name: "Hypemachine", url: "http://www.hypem.com"},
      "hypster": {name: "Hypster", url: "http://www.hypster.com"},
      "iheart": {name: "iHeartRadio", url: "http://www.iheart.com"},
      "ivoox": {name: "ivoox", url: "http://www.ivoox.com"},
      "jango": {name: "Jango", url: "http://www.jango.com"},
      "kollekt": {name: "Kollekt.fm", url: "http://www.kollekt.fm"},
      "laracasts": {name: "Laracasts", url: "http://www.laracasts.com"},
      "last": {name: "LastFm", url: "http://www.last.fm", controller: "LastfmController.js", alias: ["lastfm"], blacklist: ["beta.last.fm"]},
      "mixcloud": {name: "Mixcloud", url: "http://www.mixcloud.com"},
      "mycloudplayers": {name: "My Cloud Player", url: "http://www.mycloudplayers.com"},
      "myspace": {name: "MySpace", url: "http://www.myspace.com"},
      "netflix": {name: "Netflix", url: "http://www.netflix.com"},
      "noise": {name: "NoiseSupply", url: "http://noise.supply", controller: "NoiseSupplyController.js"},
      "npr": {name: "NPR One Player", url: "http://one.npr.org"},
      "oplayer": {name: "oPlayer", url: "http://oplayer.org"},
      "palcomp3": {name: "Palco MP3", url: "http://palcomp3.com"},
      "pandora": {name: "Pandora", url: "http://www.pandora.com"},
      "player.fm": {name: "Player.fm", url: "http://player.fm", controller: "PlayerController.js"},
      "pleer": {name: "Pleer", url: "http://pleer.com"},
      "plex": {name: "Plex", url: "http://www.plex.tv"},
      "pocketcasts": {name: "Pocketcasts", url: "https://play.pocketcasts.com"},
      "radioparadise": {name: "RadioParadise", url: "http://www.radioparadise.com"},
      "radioswissjazz": {name: "RadioSwissJazz", url: "http://www.radioswissjazz.ch"},
      "rainwave": {name: "Rainwave.cc", url: "http://www.rainwave.cc"},
      "rdio": {name: "Rdio", url: "http://www.rdio.com"},
      "reddit.music.player.il": {name: "Reddit Music Player", url: "http://reddit.music.player.il.ly", controller: "RedditMusicPlayerController.js", alias: ["reddit.musicplayer"]},
      "reverbnation": {name: "Reverb Nation", url: "http://www.reverbnation.com"},
      "saavn": {name: "Saavn", url: "http://www.saavn.com"},
      "seesu": {name: "Seesu.me", url: "http://www.seesu.me"},
      "shortorange": {name: "ShortOrange", url: "http://www.shortorange.com"},
      "shuffler": {name: "Shuffler.fm", url: "http://www.shuffler.fm"},
      "slacker": {name: "Slacker", url: "http://www.slacker.com"},
      "songstr": {name: "Songstr", url: "http://www.songstr.com"},
      "songza": {name: "Songza", url: "http://www.songza.com"},
      "music.sonyentertainmentnetwork": {name: "Sony Music Unlimited", url: "https://music.sonyentertainmentnetwork.com", controller: "SonyMusicUnlimitedController.js"},
      "sound": {name: "Sound.is", url: "http://www.sound.is"},
      "soundcloud": {name: "Soundcloud", url: "http://www.soundcloud.com"},
      "soundsgood": {name: "Soundsgood.co", url: "http://www.soundsgood.co"},
      "spotify": {name: "Spotify Web Player", url: "http://www.spotify.com"},
      "spreaker": {name: "Spreaker", url: "http://www.spreaker.com"},
      "stitcher": {name: "Stitcher", url: "http://www.stitcher.com"},
      "tidal": {name: "Tidal", url: "https://www.tidal.com", alias: ["tidalhifi"]},
      "thedrop": {name: "TheDrop", url: "https://www.thedrop.club"},
      "thesixtyone": {name: "TheSixtyOne", url: "http://www.thesixtyone.com"},
      "tunein": {name: "TuneIn", url: "http://www.tunein.com"},
      "twitch": {name: "Twitch.tv", url: "http://www.twitch.tv"},
      "vk": {name: "Vkontakte", url: "http://www.vk.com"},
      "xbox": {name: "Xbox Music", url: "http://music.xbox.com"},
      "music.yandex": {name: "Yandex", url: "http://music.yandex.ru", controller: "YandexController.js"},
      "radio.yandex": {name: "Yandex Radio", url: "http://radio.yandex.ru", controller: "YandexRadioController.js"},
      "youarelistening": {name: "YouAreListening.to", url: "http://www.youarelistening.to", controller: "YouarelisteningtoController.js"},
      "youtube": {name: "YouTube", url: "http://www.youtube.com"},
      "zonga": {name: "Zonga", url: "http://asculta.zonga.ro", controller: "ZongaController.js"}
    };
  };

  var initLookupDone_ = false;

  var initLookup = function() {
    if (initLookupDone_)
      return;
    sites_ = getSites();
    var keys = Object.keys(sites_);
    var defaultMusicListObj = {};
    keys.forEach(function(key) {
      sites_[key].urlRegex = new urlCheck(key, sites_[key].alias);
      var domain = getDomain(sites_[key].url);
      defaultMusicListObj[domain] = true;
    });

    // Enable the following line to get JSON of a list of music URLS that can be copied into defaults
    //console.log(JSON.stringify(defaultMusicListObj));
    initLookupDone_ = true;
  };

  return {
    getController: function(url) {
      try {
        initLookup();

        var keys = Object.keys(sites_);
        var filteredSites = keys.filter(function(name) {
          return sites_[name].urlRegex.test(url);
        });

        if (!filteredSites.length) return null;
        var site = sites_[filteredSites[0]];
        if (site.controller) return site.controller;

        return (filteredSites[0][0].toUpperCase() + filteredSites[0].slice(1) + "Controller.js");

      } catch (ex) {
        console.error(ex);
        return null;
      }
    }
  };
};
