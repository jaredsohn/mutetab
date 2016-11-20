let Q = require("q");

module.exports = {
  // `pcall` takes a function that takes a set of arguments and
  // a callback (NON-Node.js style) and turns it into a promise
  // that gets resolved with the arguments to the callback.
  pcall: function(fn) {
    let deferred = Q.defer();
    let callback = function() {
      deferred.resolve(Array.prototype.slice.call(arguments)[0]);
      let lastError = chrome.runtime.lastError;
      if (lastError && lastError.message) {
        console.log("pcall message: " + lastError.message);
      }
    };
    let newArgs = Array.prototype.slice.call(arguments, 1);
    newArgs.push(callback);
    fn.apply(null, newArgs);
    return deferred.promise;
  }
};
