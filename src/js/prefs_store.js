let Q = require("q");
let util = require("./util");

let hideDucking_ = false;

module.exports = function(chrome) {
  let prefsWhiteListDefaults_ = {"facebook.com": true};
  let prefsBlackListDefaults_ = {"chezpanisse.com": true};
  let prefsManualDuckingListDefaults_ = {"abcnews.go.com": true, "espn.go.com": true, "cnn.com": true, "pandora.com": true};

  // generated from music_controllers.js (copy from background page console)
  // let prefsMusicListDefaults_ = {"www.7digital.com": true,"www.8tracks.com": true,"www.amazon.com": true,"www.ambientsleepingpill.com": true,"www.asoftmurmur.com": true,"www.audible.com": true,"www.audiosplitter.fm": true,"www.bandcamp.com": true,"www.bbc.co.uk": true,"listen.beatsmusic.com": true,"www.beatport.com": true,"beta.last.fm": true,"www.blitzr.com": true,"bop.fm": true,"www.cubic.fm": true,"www.deezer.com": true,"www.demodrop.com": true,"www.di.fm": true,"www.disco.io": true,"www.earbits.com": true,"player.edge.ca": true,"app.emby.media": true,"www.gaana.com": true,"www.guvera.com": true,"play.google.com": true,"www.grooveshark.com": true,"www.hypem.com": true,"www.hypster.com": true,"www.iheart.com": true,"www.ivoox.com": true,"www.jango.com": true,"www.kollekt.fm": true,"www.laracasts.com": true,"www.last.fm": true,"www.mixcloud.com": true,"www.mycloudplayers.com": true,"www.myspace.com": true,"www.netflix.com": true,"noise.supply": true,"one.npr.org": true,"oplayer.org": true,"palcomp3.com": true,"www.pandora.com": true,"player.fm": true,"pleer.com": true,"www.plex.tv": true,"play.pocketcasts.com": true,"www.radioparadise.com": true,"www.radioswissjazz.ch": true,"www.rainwave.cc": true,"www.rdio.com": true,"reddit.music.player.il.ly": true,"www.reverbnation.com": true,"www.saavn.com": true,"www.seesu.me": true,"www.shortorange.com": true,"www.shuffler.fm": true,"www.slacker.com": true,"www.songstr.com": true,"www.songza.com": true,"music.sonyentertainmentnetwork.com": true,"www.sound.is": true,"www.soundcloud.com": true,"www.soundsgood.co": true,"www.spotify.com": true,"www.spreaker.com": true,"www.stitcher.com": true,"www.tidal.com": true,"www.thedrop.club": true,"www.thesixtyone.com": true,"www.tunein.com": true,"www.twitch.tv": true,"www.vk.com": true,"music.xbox.com": true,"music.yandex.ru": true,"radio.yandex.ru": true,"www.youarelistening.to": true,"www.youtube.com": true,"asculta.zonga.ro": true};
  let prefsMusicListDefaults_ = {"pandora.com": true};

  return {
    load: function() {
      let defaults = this.getDefaults();
      defaults.whitelist = "(unknown)";
      defaults.blacklist = "(unknown)";
      defaults.musiclist = "(unknown)";
      defaults.manualduckinglist = "(unknown)";

      return util.pcall(chrome.storage.sync.get.bind(chrome.storage.sync), defaults)
      .then(function(prefs) {
        if (prefs.whitelist === "(unknown)")
          prefs.whitelist = prefsWhiteListDefaults_;
        if (prefs.blacklist === "(unknown)")
          prefs.blacklist = prefsBlackListDefaults_;
        if (prefs.musiclist === "(unknown)")
          prefs.musiclist = prefsMusicListDefaults_;
        if (prefs.manualduckinglist === "(unknown)")
          prefs.manualduckinglist = prefsManualDuckingListDefaults_;

        console.log("prefs_store", prefs);
        // Force these values when reading prefs (can only get changed temporarily by tests)
        prefs.duckingInterval = 0.1; // in seconds. This and next param set so that constants can easily be changed in tests
        prefs.audioNotifierDelay = 2; // in seconds

        if ((prefs.minTimeBeforeDucking !== 0) && (prefs.minTimeBeforeDucking < 2)) {
          // Set to defaults since invalid value was set (likely because of test code)
          prefs.minTimeBeforeDucking = 3.5;
          prefs.minTimeBeforeUnducking = 5;
          prefs.minTimeBeforeUnduckingPaused = 3;
        }

        if ((prefs.disablePlayPause || null) === null)
          prefs.disablePlayPause = true;

        // Ensure that only one of these muting preferences is set.
        if (prefs.muteAllTabs) {
          prefs.muteOtherTabs = false;
          prefs.unmuteAllTabs = false;
        } else if (prefs.muteOtherTabs) {
          prefs.unmuteAllTabs = false;
        }

        // might get turned on from tests but turn it off on load
        prefs.showOtherTabs = false;

        if (hideDucking_)
          prefs.enableDucking = false;

        return Q.when(prefs);
      });
    },

    save: function(prefs) {
      console.log("save prefs", prefs);
      return util.pcall(chrome.storage.sync.set.bind(chrome.storage.sync), prefs);
    },

    getDefaults: function() {
      // console.log("getdefaults!");
      let keysDict = {};
      keysDict.muteAllTabs = false;
      keysDict.muteBackgroundTabs = false;
      keysDict.unmuteAllTabs = true;
      keysDict.muteNewIncognito = false;
      keysDict.mutedRememberSameDomain = true;
      keysDict.enableDucking = false;
      keysDict.minTimeBeforeUnducking = 5;
      keysDict.minTimeBeforeUnduckingPaused = 3;
      keysDict.minTimeBeforeDucking = 3.5;
      keysDict.privacyMode = false;
      keysDict.disableAutomuting = false;
      keysDict.showOtherTabs = false;
      keysDict.blacklist = (JSON.parse(JSON.stringify(prefsBlackListDefaults_)));
      keysDict.whitelist = (JSON.parse(JSON.stringify(prefsWhiteListDefaults_)));
      keysDict.musiclist = (JSON.parse(JSON.stringify(prefsMusicListDefaults_)));
      keysDict.manualduckinglist = (JSON.parse(JSON.stringify(prefsManualDuckingListDefaults_)));
      keysDict.duckingInterval = 0.1; // in seconds. This and next param set so that constants can easily be changed in tests
      keysDict.audioNotifierDelay = 2; // in seconds
      keysDict.disablePlayPause = true;

      // hidden options: used to determine behavior if a tab is playing sound for a longer time; set longSoundDuration to 0 to disable behavior
      keysDict.longSoundDuration = 0;
      keysDict.longCountDown = 0;

      if (hideDucking_)
        keysDict.enableDucking = false;

      console.log(keysDict);
      return keysDict;
    },

    updateListAndSave: function(prefs, listType, domain) {
      console.log("updateListAndSave", listType, domain);
      if (listType === "neither") {
        delete prefs.blacklist[domain];
        delete prefs.whitelist[domain];
      } else if (listType === "notmusic") {
        delete prefs.musiclist[domain];
      } else if (listType === "notmanualduckinglist") {
        delete prefs.manualduckinglist[domain];
      } else {
        let list = prefs[listType + "list"];
        if (list === null) {
          console.error("could not find list: '" + listType + "list'");
          return Q.when(null);
        }

        list[domain] = true;
        if (listType === "black")
          delete prefs.whitelist[domain];
        else if (listType === "white")
          delete prefs.blacklist[domain];

        prefs[listType + "list"] = list;
      }

      return this.save(prefs);
    },

    getDomainRuleForDomainInList: function(domain, list) {
      // console.log("getDomainRuleForDomainInList", domain, list);
      let temp = domain;
      while (!list.hasOwnProperty(temp)) {
        //console.log("looking at list for domain " + temp);

        let nextDotPos = temp.indexOf(".");
        if ((nextDotPos >= 0) && (nextDotPos < domain.length)) {
          temp = temp.substring(nextDotPos + 1);
        } else {
          return null;
        }
      }
      return temp;
    },

    // Returns whether the domain for the url is within the list
    domainInList: function(domain, list) {
      if (domain === null)
        return false;

      let domainRule = this.getDomainRuleForDomainInList(domain, list);
      // console.log("domaininlist", domain, list, domainRule);
      return (domainRule !== null);
    }
  };
};
