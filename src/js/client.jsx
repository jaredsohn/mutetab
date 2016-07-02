Mousetrap.stopCallback = function() { return false; };
/*eslint-disable no-unused-vars*/
var TabSwitcher = require('./client/tab_switcher.jsx');
/*eslint-enable no-unused-vars*/

var bg = chrome.extension.getBackgroundPage();

bg.reactUi_ = ReactDOM.render(<TabSwitcher />, document.getElementById('switcher'));
