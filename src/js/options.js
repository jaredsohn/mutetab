let util = require("./util");
let prefsStore = require("./prefs_store")(chrome);

let hideDucking_ = false;

let mutetabPrefs = mutetabPrefs || {};
let mutetabPrefs_ = function() {
  let self = this;
  let prefs_;

  // from http://stackoverflow.com/questions/9716468/is-there-any-function-like-isnumeric-in-javascript-to-validate-numbers
  this.isNumeric = function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };

  let getDomain = function(url) {
    if (url.indexOf("chrome://") === 0) {
      return "chrome://" + new URL(url).hostname + "/";
    }
    if (url.indexOf("chrome-extension://") === 0) {
      return "chrome-extension://" + new URL(url).hostname + "/";
    }

    if (url.indexOf("://") === -1) {
      url = "http://" + url;
    }

    try {
      return new URL(url).hostname || null;
    } catch (ex) {
      console.log("url", url);
      console.error(ex);
      return null;
    }
  };
  let getPrimaryDomain = function(domain) {
    let parts = domain.split(".");
    return (parts.length >= 2)
      ? parts[parts.length - 2] + "." + parts[parts.length - 1]
      : domain;
  };

  this.initListEditor = function(elem, dict) {
    try {
      $("option", $(elem)).remove();

      Object.keys(dict).sort(function(a, b) {
        let primary1 = getPrimaryDomain(a);
        let primary2 = getPrimaryDomain(b);
        if (primary1 > primary2)
          return 1;
        if (primary1 < primary2)
          return -1;
        return 0;
      }).forEach(function(key) {
        let optionElem = document.createElement("option");
        optionElem.value = key;
        optionElem.innerText = key;
        elem.appendChild(optionElem);
      });
    } catch (ex) {
      console.error(ex);
    }
  };

  this.createTextList = function(dict) {
    let keys = Object.keys(dict);

    let str = "";
    if (keys.length !== 0) {
      str = keys.reduce(function(prev, current) {
        return prev + "\n" + current;
      });
    }

    return str;
  };

  let addDomainListEventListeners = function(elem) {
    $(".addDomainButton", $(elem))[0].addEventListener("click", onAddDomainClick);
    $(".removeDomainButton", $(elem))[0].addEventListener("click", onRemoveDomainClick);
    $(".rawFiltersButton", $(elem))[0].addEventListener("click", onRawFiltersClick);
    $(".importRawButton", $(elem))[0].addEventListener("click", onImportRawClick);
  };

  let onAddDomainClick = function(e) {
    e.preventDefault();
    let form = $(this).closest("form")[0];
    console.log(form);
    let $listSelect = $(".listSelect", $(form));
    let $urlTextBox = $(".urlTextBox", $(form));
    let domain = getDomain($urlTextBox[0].value);
    if (domain === null)
      return; // TODO: show better error message?

    if ((prefs_[form.id][domain] || null) === null) {
      prefs_[form.id][domain] = true;
      self.initListEditor($("#" + form.id + " .listSelect")[0], prefs_[form.id]);
      if (form.id === "blacklist") {
        delete prefs_.whitelist[domain];
        self.initListEditor($("#whitelist .listSelect")[0], prefs_.whitelist);
      } else if (form.id === "whitelist") {
        delete prefs_.blacklist[domain];
        self.initListEditor($("#blacklist .listSelect")[0], prefs_.blacklist);
      }
    }

    // Select what was added (or already exists)
    $listSelect.val(""); // unselect all
    let $options = $("option", $listSelect);
    let matchedNodes = $options.filter(function() {return this.value == domain;});
    if (matchedNodes.length) {
      matchedNodes[0].selected = true;
      // TODO: should scroll to it if needed
    }
    $urlTextBox[0].value = "";
    $urlTextBox[0].focus();
  };
  let onRemoveDomainClick = function(e) {
    e.preventDefault();
    let form = $(this).closest("form")[0];
    console.log(form);
    let $listSelect = $(".listSelect", $(form));
    let $options = $("option", $listSelect);
    let matchedNodes = $options.filter(function() {return this.selected === true;});
    console.log("matchedNodes", matchedNodes);
    [].slice.call(matchedNodes).forEach(function(matchedNode) {
      console.log(matchedNode);
      delete prefs_[form.id][matchedNode.value];
      matchedNode.remove();
    });
  };
  let onRawFiltersClick = function(e) {
    e.preventDefault();

    if (this.classList.contains("disabled"))
      return;

    let form = $(this).closest("form")[0];
    console.log(form);
    let $editRawSection = $(".editRawSection", $(form));
    let $rawTextArea = $(".rawTextArea", $(form));
    if ($editRawSection.is(":visible")) {
      $editRawSection.hide();
      $rawTextArea.hide();
      $(".removeDomainButton", $(form)).prop("disabled", false);
      $(".addDomainButton", $(form)).prop("disabled", false);
    } else {
      let domainList = prefs_[form.id];
      console.log("domainList", domainList);
      let str = "";
      Object.keys(domainList).forEach(function(key) {
        str += key + "\n";
      });
      console.log(str);
      $(".removeDomainButton", $(form)).prop("disabled", true);
      $(".addDomainButton", $(form)).prop("disabled", true);
      $editRawSection.show();
      $rawTextArea[0].value = str;
      $rawTextArea.show();
    }
  };
  let onImportRawClick = function(e) {
    e.preventDefault();

    let form = $(this).closest("form")[0];
    console.log(form);
    let $editRawSection = $(".editRawSection", $(form));
    let $rawTextArea = $(".rawTextArea", $(form));
    let otherList = "";

    console.log($rawTextArea[0]);
    prefs_[form.id] = self.populateDomainDict($rawTextArea[0].value);
    if (form.id === "whitelist") {
      otherList = "blacklist";
    } else if (form.id === "blacklist") {
      otherList = "whitelist";
    }

    if (otherList !== "") {
      Object.keys(prefs_[form.id]).forEach(function(domain) {
        if (prefs_[otherList].hasOwnProperty(domain)) {
          delete prefs_[otherList][domain];
        }
      });
      self.initListEditor($("#" + otherList + " .listSelect")[0], prefs_[otherList]);
    }

    self.initListEditor($("#" + form.id + " .listSelect")[0], prefs_[form.id]);

    $editRawSection.hide();
    $rawTextArea.hide();
    $(".removeDomainButton", $(form)).prop("disabled", false);
    $(".addDomainButton", $(form)).prop("disabled", false);
  };

  // Convert a string consisting of a list of URLs into a dict
  this.populateDomainDict = function(str) {
    console.log("populateDomainDict", str);
    let dict = {};
    let urls = str.split(/[\n,\,]+/);
    urls.forEach(function(url) {
      let domain = getDomain(url);
      if (domain !== null) {
        dict[domain] = true;
      }
    });
    console.log(dict);
    return dict;
  };

  this.init = function(prefs) {
    prefs_ = prefs;

    $("textarea").hide();
    $(".editRawSection").hide();
    $(".removeDomainButton").prop("disabled", false);
    $(".addDomainButton").prop("disabled", false);

    console.log("found settings:");
    console.log(prefs_);

    $("#unmute_by_default")[0].checked = prefs_.unmuteAllTabs;
    $("#bg_mute_by_default")[0].checked = prefs_.muteBackgroundTabs;
    $("#mute_by_default")[0].checked = prefs_.muteAllTabs;
    $("#incognito_mute_by_default")[0].checked = prefs_.muteNewIncognito;
    $("#muted_remember_same_domain")[0].checked = prefs_.mutedRememberSameDomain;
    self.initListEditor($("#blacklist .listSelect")[0], prefs_.blacklist);
    self.initListEditor($("#whitelist .listSelect")[0], prefs_.whitelist);
    self.initListEditor($("#musiclist .listSelect")[0], prefs_.musiclist);
    self.initListEditor($("#manualduckinglist .listSelect")[0], prefs_.manualduckinglist);

    $("#show_other_tabs")[0].checked = prefs_.showOtherTabs;
    $("#enable_ducking")[0].checked = prefs_.enableDucking;

    if (prefs_.minTimeBeforeDucking > 0) {
      $("#min_time_before_ducking")[0].value = prefs_.minTimeBeforeDucking;
      $("#enable_min_time_before_ducking")[0].checked = true;
    } else {
      $("#min_time_before_ducking")[0].value = 3.5;
      $("#enable_min_time_before_ducking")[0].checked = false;
    }
    $("#min_time_before_unducking")[0].value = prefs_.minTimeBeforeUnducking;
    self.onEnableDuckingChange(null);
    self.onEnableMinTimeBeforeDuckingChange(null);
    self.onMuteIncognitoByDefaultChange(null);
  };

  this.onValidate = function() {
    let minTimeBeforeDuckingStr = $("#enable_min_time_before_ducking")[0].checked ?
      $("#min_time_before_ducking")[0].value :
      0;

    let minTimeBeforeDuckingVal = parseFloat(minTimeBeforeDuckingStr);
    if (!self.isNumeric(minTimeBeforeDuckingStr) || (((minTimeBeforeDuckingVal) !== 0) && (minTimeBeforeDuckingVal <= 2))) {
      alert("Time before ducking must be unchecked or greater than two seconds.");
      return false;
    }

    let minTimeBeforeUnduckingStr = ($("#min_time_before_unducking")[0].value);
    if (!self.isNumeric(minTimeBeforeUnduckingStr) || (parseFloat(minTimeBeforeUnduckingStr) < 0)) {
      alert("The time before unducking must be a nonnegative number.");
      return false;
    }

    return true;
  };

  this.onSave = function(e) {
    e.preventDefault();

    if (self.onValidate()) {
      //prefs_ = {};
      prefs_.muteNewIncognito = $("#incognito_mute_by_default")[0].checked;
      prefs_.mutedRememberSameDomain = $("#muted_remember_same_domain")[0].checked;
      prefs_.muteAllTabs = $("#mute_by_default")[0].checked;
      prefs_.muteBackgroundTabs = $("#bg_mute_by_default")[0].checked;
      prefs_.unmuteAllTabs = $("#unmute_by_default")[0].checked;
      prefs_.enableDucking = $("#enable_ducking")[0].checked;
      prefs_.showOtherTabs = $("#show_other_tabs")[0].checked;
      prefs_.minTimeBeforeUnducking = parseFloat($("#min_time_before_unducking")[0].value);
      prefs_.duckingInterval = 0.5; // force these back to defaults (in case wrecked by tests)
      prefs_.audioNotifierDelay = 2;
      prefs_.longSoundDuration = 0;
      prefs_.longCountDown = 0;

      let minTimeBeforeDuckingStr = $("#enable_min_time_before_ducking")[0].checked ?
        $("#min_time_before_ducking")[0].value :
        "0";
      prefs_.minTimeBeforeDucking = parseFloat(minTimeBeforeDuckingStr);

      console.log("saving:", prefs_);
      prefsStore.save(prefs_)
      .then(function() {
        let opts = {
          load_settings: true
        };
        let fn = chrome.runtime.sendMessage.bind(chrome.runtime);
        return util.pcall(fn, opts).then(function() {
          alert("Saved");
        });
      });
    }
  };

  this.getDefaults = function() {
    prefs_ = prefsStore.getDefaults();

    console.log("defaults are:");
    console.log(prefs_);

    return prefs_;
  };

  this.onRestoreDefaults = function(e) {
    e.preventDefault();
    self.init(self.getDefaults());
  };

  this.onEnableDuckingChange = function() {
    let disable = ($("#enable_ducking")[0].checked === false);

    $("#min_time_before_unducking")[0].disabled = disable;
    // $("#show_ducking_notifications")[0].disabled = disable;
    $("#enable_min_time_before_ducking")[0].disabled = disable;
    $("#min_time_before_ducking")[0].disabled = disable;

    let form = $("#manualduckinglist")[0];
    [].slice.call(form.elements).forEach(function(elem) {
      elem.disabled = disable;
    });

    let $divs = $("div, label", $(".music_ducking_section"));
    [].slice.call($divs).forEach(function(elem) {
      if ((elem.id === "enable_ducking_div") || (elem.id === "enable_ducking_label"))
        return; // don't grey out the enable ducking div

      if (disable)
        elem.classList.add("disabled");
      else
        elem.classList.remove("disabled");
    });

    let rawFiltersButton = $(".music_ducking_section .rawFiltersButton")[0];
    if (disable)
      rawFiltersButton.classList.add("disabled");
    else
      rawFiltersButton.classList.remove("disabled");

    if (!disable)
      $("#muted_remember_same_domain")[0].checked = true;
    $("#muted_remember_same_domain")[0].disabled = !disable;
  };

  this.onEnableMinTimeBeforeDuckingChange = function() {
    let disable = ($("#enable_min_time_before_ducking")[0].checked === false);
    $("#min_time_before_ducking")[0].disabled = disable;
  };

  this.onMuteIncognitoByDefaultChange = function() {
    chrome.extension.isAllowedIncognitoAccess(function(isAllowedIncognitoAccess) {
      if ((!isAllowedIncognitoAccess) && $("#incognito_mute_by_default")[0].checked) {
        $("#no_incognito_warning").show();
      } else if ((!isAllowedIncognitoAccess) && !($("#incognito_mute_by_default")[0].checked)) {
        $("#no_incognito_warning").hide();
      }
    });
  };

  this.confirmExit = function() {
    return "You have attempted to leave this page.  If you have made any changes to the fields without clicking the Save button, your changes will be lost.  Are you sure you want to exit this page?";
  };

  $(document).ready(function() {
    document.getElementById("save").addEventListener("click", self.onSave);
    document.getElementById("defaults").addEventListener("click", self.onRestoreDefaults);
    document.getElementById("enable_ducking").addEventListener("change", self.onEnableDuckingChange);
    document.getElementById("enable_min_time_before_ducking").addEventListener("change", self.onEnableMinTimeBeforeDuckingChange);
    document.getElementById("incognito_mute_by_default").addEventListener("change", self.onMuteIncognitoByDefaultChange);

    return prefsStore.load()
    .then(function(prefs) {
      $("#whitelist_editor")[0].appendChild($($(".url-list-editor-template form")[0]).clone()[0]);
      $("#blacklist_editor")[0].appendChild($($(".url-list-editor-template form")[0]).clone()[0]);
      $("#musiclist_editor")[0].appendChild($($(".url-list-editor-template form")[0]).clone()[0]);
      $("#manualduckinglist_editor")[0].appendChild($($(".url-list-editor-template form")[0]).clone()[0]);
      $("#whitelist_editor form")[0].id = "whitelist";
      $("#blacklist_editor form")[0].id = "blacklist";
      $("#musiclist_editor form")[0].id = "musiclist";
      $("#manualduckinglist_editor form")[0].id = "manualduckinglist";

      $("#whitelist_editor .urlTextBox")[0].placeholder = "facebook.com";
      $("#blacklist_editor .urlTextBox")[0].placeholder = "chezpanisse.com";
      $("#musiclist_editor .urlTextBox")[0].placeholder = "www.youtube.com";
      $("#manualduckinglist_editor .urlTextBox")[0].placeholder = "abcnews.go.com";

      addDomainListEventListeners($("#whitelist")[0]);
      addDomainListEventListeners($("#blacklist")[0]);
      addDomainListEventListeners($("#musiclist")[0]);
      addDomainListEventListeners($("#manualduckinglist")[0]);

      if (hideDucking_) {
        $(".music_ducking_section").hide();
      }

      mutetabPrefs.init(prefs);
    });
  });
};
mutetabPrefs_.call(mutetabPrefs);
