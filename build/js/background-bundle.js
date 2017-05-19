(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.nextTick()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected() {
            pendingCount--;
            if (pendingCount === 0) {
                deferred.reject(new Error(
                    "Can't get fulfillment value from any promise, all " +
                    "promises were rejected."
                ));
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require('_process'))
},{"_process":1}],3:[function(require,module,exports){
"use strict";var Q=require('q');var windowManager=require('./background/window_manager')(chrome);var chromeMisc=require('./background/chrome_misc')(chrome);var musicControllers=require('./background/music_controllers')(chrome);var prefsStore=require('./prefs_store')(chrome);var URL_OPTIONS=chrome.runtime.getURL('build/html/options.html');var URL_WEBSTORE='https://chrome.google.com/webstore/detail/acofndgbcimipbpeoplfjcapdbebbmca';var URL_SUPPORT='http://www.github.com/jaredsohn/mutetab/issues';// UI constants; not used right now (requires ui shown via keyboard shortcuts)
var PADDING_TOP=50;var PADDING_BOTTOM=50;var EXTENSION_UI_WIDTH=300;// other constants
var PLAY_PAUSE_WAIT=4;// we wait this long in seconds after asking a tab to play or be paused before we expect to be notified that it did
var URL_CHANGE_WAIT=10;var DUCKED_TIMEOUT_EXTRA_WAIT=60;// wait this additional length before clearing something that is ducked.  Otherwise it gets unducked too quickly.
var hideDucking_=false;var injectingEnabled_=false;// globals
var prefs_={};// User preferences
var tabState_={};// Current state.
var updateContextMenusTimeout_=null;var refreshUiTimeout_=null;var isFirstTime_=true;var updateContextMenusBusy_=false;var browserActionTitle_='MuteTab';var browserActionUnduckMessage_='';var browserActionMode_='';var checkMaybeAudibleCount_=0;var privacyModeToggleInProgress_=false;var prevDuckingTabState_=null;// Turn on/off logging; can be set via console
var loggingEnabled_=void 0;var logTypes_=['duckingReasoning','injected','events','music','ui'];var logTypeEnabled_=void 0;// a dict that indicates if each logtype is enabled or not
// Music ducking state
var musicDuckingIntervalId_=null;var duckingCountDown_=null;var unduckingOrder_=[];// tabs that are ducked, in order.  We'll skip over entries if not audible, though.
var unduckedTabId_=-1;var unduckedShortTimeTabId_=-1;var updateDuckingCount_=0;// Field names that start with '_' are should only be used for debugging purposes
var fields_=['mutedCached','audibleCached','domainCached','hasCustomMusicController','nonPrivateMuteStatus','nonPrivatePlayStatus','musicStateData','musicStateForFrame','tabCaptured','mutingError','lastAudibleStart','lastAudibleEnd','lastAudibleEndBackup','lastUnmuted','lastPlayed','lastPaused','lastAudibleAndUnmuted','playInProgress','pauseInProgress','checkMaybeAudible','urlChanged','playInProgressExpired','pauseInProgressExpired','playInProgressReason','pauseInProgressReason','mutedReason','playPauseReason','url','longestPrevDuration','ducked','_audibleTooShortCached','_inaudibleTooLongCached','_prevAudibleDuration','_timeSinceAudibleBecameFalse'];var monitoredFields_=['lastAudibleStart','audibleCached','lastPlayed','lastPaused','urlChanged','musicStateData','nonPrivateMuteStatus'];///////////////////////////////////////////////////////////////////////////////////////////////////
// Tab State
///////////////////////////////////////////////////////////////////////////////////////////////////
var getDefaultState=function getDefaultState(fieldName){switch(fieldName){case'mutedCached':case'audibleCached':case'ducked':case'hasCustomMusicController':case'nonPrivateMuteStatus':case'nonPrivatePlayStatus':case'mutingError':case'pauseInProgressExpired':case'playInProgressExpired':return false;case'lastPaused':case'lastPlayed':case'lastAudibleStart':case'lastAudibleEnd':case'lastUnmuted':case'lastAudibleEndBackup':case'lastAudibleAndUnmuted':case'playInProgress':case'pauseInProgress':case'urlChanged':return new Date(0);case'musicStateForFrame':return{};case'mutedReason':case'playPauseReason':return'';case'longestPrevDuration':return 0;default:return null;}};var getState=function getState(tabId,fieldName){if(fields_.indexOf(fieldName)===-1){console.error('Invalid field: '+fieldName);return null;}return!tabState_.hasOwnProperty(tabId)||!tabState_[tabId].hasOwnProperty(fieldName)?getDefaultState(fieldName):tabState_[tabId][fieldName];};var setState=function setState(tabId,fieldName,val,reason){if(fields_.indexOf(fieldName)===-1){console.error('Invalid field: '+fieldName);return;}var defaultFieldName=getDefaultState(fieldName);if(!tabState_.hasOwnProperty(tabId))tabState_[tabId]={};if(val===null&&defaultFieldName!==null){console.warn(tabId,fieldName,'Trying to set null to a field that has another default value');tabState_[tabId][fieldName]=defaultFieldName;}else{tabState_[tabId][fieldName]=val;}if(monitoredFields_.indexOf(fieldName)>=0)console.log(tabId,'monitored',fieldName,val,typeof reason!=='undefined'?reason:'');};var getAllTabIds=function getAllTabIds(){return Object.keys(tabState_).map(function(tabId){return parseInt(tabId,10);});};// Returns an object consisting of a list of tabIds with fieldName populated
// Only does so if actual data is stored.
var getStateForAllTabs=function getStateForAllTabs(fieldName){var obj={};Object.keys(tabState_).forEach(function(tabId){if(tabState_[tabId].hasOwnProperty(fieldName)){obj[tabId]={};obj[tabId][fieldName]=getState(tabId,fieldName);}});return obj;};var getFullState=function getFullState(tabId){return tabState_.hasOwnProperty(tabId)?tabState_[tabId]:{};};var getFullStateForAllTabs=function getFullStateForAllTabs(){return tabState_;};var clearState=function clearState(tabId){console.log(tabId,'clearing state');delete tabState_[tabId];};var clearStateFieldForAllTabs=function clearStateFieldForAllTabs(fieldName){if(fields_.indexOf(fieldName)===-1){console.error('Invalid field: '+fieldName);return;}Object.keys(tabState_).forEach(function(tabId){delete tabState_[tabId][fieldName];});};///////////////////////////////////////////////////////////////////////////////////////////////////
// Mute commands
///////////////////////////////////////////////////////////////////////////////////////////////////
// Mute everything (including whitelist and music)
// Do not update setting for saved mute and play status from before privacy mode
var muteEverything=function muteEverything(){return windowManager.getTabs().done(function(historyData){console.log('muteeverything!');var mutePromises=historyData.map(function(tabInfo){return updateMuted(tabInfo.id,true,{saveNonPrivate:false},'Muted due to privacy mode.');});var pausePromises=historyData.map(function(tabInfo){return pauseMusic(tabInfo.id,'Paused due to privacy mode.');});return Q.allSettled(mutePromises).then(Q.allSettled(pausePromises));});};// Excludes music list
var muteAll=function muteAll(excludeWhiteListedTabs){return windowManager.getTabs().then(function(tabs){if(typeof excludeWhiteListedTabs==='undefined')excludeWhiteListedTabs=true;var filtered=tabs.filter(function(tabInfo){var domain=getDomain(tabInfo.url);return(!excludeWhiteListedTabs||!prefsStore.domainInList(domain,prefs_.whitelist))&&!prefsStore.domainInList(domain,prefs_.musiclist);});var mutePromises=filtered.map(function(tabInfo){return updateMuted(tabInfo.id,true,{},'Muted by \'Mute all tabs\'.');});var pausePromises=filtered.map(function(tabInfo){return pauseMusic(tabInfo.id,'Paused by \'Mute all tabs\'.');});return Q.allSettled(mutePromises).then(Q.allSettled(pausePromises));});};var unmuteAll=function unmuteAll(){return windowManager.getTabs().then(function(tabs){var mutePromises=tabs.map(function(tabInfo){return updateMuted(tabInfo.id,false,{},'Unmuted by \'Unmute all tabs\'');});return Q.allSettled(mutePromises);});};var makeCurrentTabOnlyUnmuted=function makeCurrentTabOnlyUnmuted(){muteBackground();Q.when(windowManager.getCurrentTab()).then(function(currentTab){chromeMisc.setMuted(currentTab.id,false);});};var muteBackground=function muteBackground(){return Q.all([windowManager.getTabs(),windowManager.getCurrentTab()]).spread(function(tabs,currentTabInfo){var filtered=tabs.filter(function(tabInfo){var domain=getDomain(tabInfo.url);return tabInfo.id!==currentTabInfo.id&&!prefsStore.domainInList(domain,prefs_.musiclist);});var mutePromises=filtered.map(function(tabInfo){return updateMuted(tabInfo.id,true,{},'Muted by \'Mute background tabs\'.');});var pausePromises=filtered.map(function(tabInfo){return pauseMusic(tabInfo.id,'Paused by \'Mute background tabs\'.');});return Q.allSettled(mutePromises).then(Q.allSettled(pausePromises));});};var toggleCurrentMuted=function toggleCurrentMuted(){return windowManager.getCurrentTab().then(function(currentTabInfo){return updateMuted(currentTabInfo.id,!currentTabInfo.mutedInfo.muted,{},(!currentTabInfo.mutedInfo.muted?'Unmuted':'Muted')+' via keyboard shortcut');});};var setCurrentMuted=function setCurrentMuted(mute){return windowManager.getCurrentTab().then(function(currentTabInfo){var reason=mute?'Muted by user via MuteTab context menu.':'Unmuted by user via MuteTab context menu';return updateMuted(currentTabInfo.id,mute,{},reason);});};// We mute all audible unmuted tabs.  If ducking is active, this will cause the next sound to start up.
// Note: This is a legacy method only used by a single test; TODO: change test so this isn't needed any more.
var muteAudible=function muteAudible(){return windowManager.getTabs().then(function(tabs){var filtered=tabs.filter(function(tabInfo){return!getState(tabInfo.id,'mutedCached')&&getState(tabInfo.id,'audibleCached');});var promises=filtered.map(function(tabInfo){return updateMuted(tabInfo.id,true,null,'Muted because tab is audible (done via a test.)');});return Q.all(promises);});};///////////////////////////////////////////////////////////////////////////////////////////////////
// Event listeners
///////////////////////////////////////////////////////////////////////////////////////////////////
// The muted flag doesn't really matter for created tabs but we do so for consistency reasons
var onCreated=function onCreated(tab){if(prefs_.disableAutomuting)return;chromeMisc.ensureMutedInfo(tab);var muteInfo=null;try{if(prefs_.muteAllTabs)muteInfo={should:true,save:true,reason:'Muted by default'};else if(tab.incognito&&prefs_.muteNewIncognito)muteInfo={should:true,save:true,reason:'Incognito muted by default'};else muteInfo={should:false,save:true,reason:''};updateMuted(tab.id,muteInfo.should,{shouldUpdateDucking:false,saveNonPrivate:prefs_.privacyMode===false},muteInfo.reason).done();}catch(ex){console.error(ex);}};var onReplaced=function onReplaced(addedTabId,removedTabId){console.log("ONREPLACED!");if(logTypeEnabled_.events)console.log('onReplaced',addedTabId,removedTabId);if(windowManager.getLastTabIdSync()===removedTabId)windowManager.setLastTabId(addedTabId);// Update this so that we don't mute the wrong tab in mute background
setState(addedTabId,'domainCached',getState(removedTabId,'domainCached'));// copy this over so we can maybe not change muted state (assuming domain is same and pref is set)
clearState(removedTabId);var duckedTabIndex=unduckingOrder_.indexOf(removedTabId);if(duckedTabIndex!==-1)unduckingOrder_[duckedTabIndex]=addedTabId;windowManager.getTabInfo(addedTabId).then(function(tabInfo){updateStateForUrlChange(tabInfo);}).done();};var onUpdated=function onUpdated(tabId,changeInfo,tab){if(tabId===windowManager.extensionWindowIdSync)return;chromeMisc.ensureMutedInfo(tab);chromeMisc.ensureMutedInfo(changeInfo);var urlChanged=false;var oldUrl=getState(tab.id,'url')||null;if(oldUrl!==tab.url){urlChanged=true;}if(changeInfo.hasOwnProperty('status')&&changeInfo.status==='loading'){if(urlChanged){if(logTypeEnabled_.events)console.log('onUpdated (status=loading)',tabId,tab.url,changeInfo,tab);updateStateForUrlChange(tab).done();}else{if(logTypeEnabled_.events)console.log('(status=loading) but url did not change.',tabId,tab.url,changeInfo,tab);}}else if(urlChanged){if(logTypeEnabled_.events)console.log('onUpdated urlchanged',tabId,tab.url,changeInfo,tab);updateStateForUrlChange(tab).done();}if(changeInfo.hasOwnProperty('audible')){if(logTypeEnabled_.events)console.log(tabId,'onUpdated - audible',changeInfo.audible===true,getState(tabId,'mutedCached'),getState(tabId,'lastAudibleStart').getTime()===0);if(changeInfo.audible===true&&getState(tabId,'mutedCached')&&getState(tabId,'lastAudibleStart').getTime()===0){localStorage.noisesPrevented=parseInt(localStorage.noisesPrevented||0,10)+1;}if(logTypeEnabled_.events)console.log('onUpdated',tabId,tab.url,changeInfo,tab);updateAudible(tabId,changeInfo.audible,'onUpdated');if(!tab.audible&&!tab.mutedInfo.muted){setState(tabId,'lastAudibleAndUnmuted',new Date());refreshUi();}}// If muted by user, tab capture, or another extension
if(changeInfo.hasOwnProperty('mutedInfo')){if(tab.audible&&tab.mutedInfo.muted){setState(tabId,'lastAudibleAndUnmuted',new Date());refreshUi();}if(changeInfo.mutedInfo.extensionId!==chrome.runtime.id){if(logTypeEnabled_.events)console.log('onUpdated',tabId,tab.url,changeInfo,tab);var mutedCauseText=changeInfo.mutedInfo.reason;if(mutedCauseText==='extension')mutedCauseText='another extension. (id='+changeInfo.mutedInfo.extensionId+')';else if(mutedCauseText==='user')mutedCauseText='user through Chrome.';else mutedCauseText+='.';updateMuted(tabId,changeInfo.mutedInfo.muted,{saveNonPrivate:true},(tab.mutedInfo.muted?'Muted by ':'Unmuted by ')+mutedCauseText).done();}}};var onActivated=function onActivated(activeInfo){windowManager.getCurrentTab().then(function(currentTab){console.log("onActivated",activeInfo,currentTab);if(currentTab===null||currentTab.windowId!==activeInfo.windowId){console.log("onActivated - ignoring since not in active window",activeInfo,activeInfo.windowId,windowManager.getExtensionWindowIdSync());return;}console.log("onActivated",activeInfo,activeInfo.windowId,windowManager.getExtensionWindowIdSync());if(activeInfo.windowId===windowManager.getExtensionWindowIdSync())return;var prevTabId=windowManager.getLastTabIdSync();if(activeInfo.tabId===prevTabId){return;}moveToFrontOfUnduckingOrder(activeInfo.tabId);// if (logTypeEnabled_.events)
//   console.log(activeInfo.tabId, "onActivated");
windowManager.setLastWindowId(activeInfo.windowId);windowManager.setLastTabId(activeInfo.tabId);windowManager.getTabInfo(activeInfo.tabId).then(function(tabInfo){setState(activeInfo.tabId,'domainCached',getDomain(tabInfo.url));// console.log("just tabbed away from (will mute if not music)", prevTabId);
if(!prefs_.disableAutomuting&&prefs_.muteBackgroundTabs){var isMusic=prefsStore.domainInList(getState(prevTabId,'domainCached'),prefs_.musiclist);console.log(prevTabId,'bgdebug data',prefs_.disableAutomuting,prefs_.muteBackgroundTabs,getState(prevTabId,'domainCached'),prefs_.musiclist,isMusic);if(!isMusic)updateMuted(prevTabId,true,{},'Background muted by default.').done();}if(getState(activeInfo.tabId,'ducked')){var timeToCheck=Math.min(getCountdownForUnducking(activeInfo.tabId,false),prefs_.minTimeBeforeUnducking);addMaybeAudibleCheck(activeInfo.tabId,timeToCheck,true);unduckTabIds([activeInfo.tabId]).done();}updateContextMenus();});});};// When the user closes a tab, remove all of that tab's history.
var onRemoved=function onRemoved(tabId){//if (logTypeEnabled_.events)
// console.log("OnRemoved", tabId);
var domainText='';var domainCached=getState(tabId,'domainCached');if(domainCached!==null)domainText=' ('+domainCached+')';clearState(tabId);removeFromArray(unduckingOrder_,tabId);if(prefs_.enableDucking)updateDucking('removed tab: '+tabId+domainText).done();// don't worry about race conditions with this
if(logTypeEnabled_.events)console.log(tabId,'tab closed');refreshUi();};// All actions run by user-defined keys are here; we reuse some of the code for context menus
// and actions requested via the UI
var onCommand=function onCommand(command){onCommandAsPromise(command).done();};var onCommandAsPromise=function onCommandAsPromise(command){if(logTypeEnabled_.events)console.log('onCommand:',command);var promise=Q.when(null);// our default promise, used when calling sync code
switch(command){case'make_current_tab_only_unmuted':return makeCurrentTabOnlyUnmuted();case'show_tabs_window':return showTabsWindow();case'mute_all':return muteAll(false);case'unmute_all':return unmuteAll();case'mute_background':return muteBackground();case'mute_current':return setCurrentMuted(true);case'unmute_current':return setCurrentMuted(false);case'mute_audible':return muteAudible();case'toggle_current_muted':return toggleCurrentMuted();case'blacklist_remove':return updateListForCurrentTab('neither');case'blacklist_add':return updateListForCurrentTab('black');case'whitelist_remove':return updateListForCurrentTab('neither');case'whitelist_add':return updateListForCurrentTab('white');case'musiclist_remove':return updateListForCurrentTab('notmusic');case'musiclist_add':return updateListForCurrentTab('music');case'manualduckinglist_remove':return updateListForCurrentTab('notmanualduckinglist');case'manualduckinglist_add':return updateListForCurrentTab('manualducking');case'change_privacy_mode':return togglePrivacyMode();case'change_disable_automuting':prefs_.disableAutomuting=!prefs_.disableAutomuting;if(!prefs_.disableAutomuting){updateDucking('automuting reenabled');setFavicon();}else{setFavicon();}return prefsStore.save(prefs_);case'show_options':return windowManager.openUrl(URL_OPTIONS);case'show_webstore':return windowManager.openUrl(URL_WEBSTORE);case'show_support':return windowManager.openUrl(URL_SUPPORT);case'load_settings':return loadSettings();case'pause_current':return pauseCurrent();case'play_current':return playCurrent();case'mute_unducked':return updateMuted(unduckedTabId_,true,{},'Muted by user as \'unducked tab\' via MuteTab context menu.');case'pause_unducked':return pauseMusic(unduckedTabId_,'Paused by user as \'unducked tab\' via MuteTab context menu.');case'close_unducked':return windowManager.closeTab(unduckedTabId_);case'show_unducked':return windowManager.switchToTab(unduckedTabId_);case'mute_unducked':return muteOrPauseUnducked();default:console.warn('Unsupported command requested: '+command);}return promise;};// onMessage gets called from the popup.  Note that when we call respond,
// we get an error re: a no longer existing port object in the background page console.
var onMessage=function onMessage(request,sender,respond){var keys=Object.keys(request);var showMessageInConsole=true;var doNotLogKeys=['created','action','send_tab_data'];doNotLogKeys.forEach(function(doNotLogKey){if(request.hasOwnProperty(doNotLogKey))showMessageInConsole=false;});if(showMessageInConsole&&logTypeEnabled_.events)console.log('onMessage: '+keys,request,sender);keys.forEach(function(key){switch(key){case'mute_all':case'unmute_all':case'mute_background':case'show_options':case'show_webstore':case'show_share':case'show_support':case'load_settings':case'change_disable_automuting':case'change_privacy_mode':case'toggle_current_muted':case'mute_audible':onCommandAsPromise(key).done(function(data){respond(data);});break;// If no parameters, then use onCommand code.
case'change_enableDucking':prefs_.enableDucking=request[key];return prefsStore.save(prefs_).then(updateDucking('change_enableDucking')).done(respond);case'switch_to_tab':windowManager.switchToTab(request[key]).done(respond);break;case'switch_to_tabs':windowManager.switchToTabs(request[key]).done(respond);break;case'close_tab':windowManager.closeTab(request[key]).done(respond);break;case'create_tab':windowManager.createTab({url:request[key]}).done(respond);break;case'create_tabs':windowManager.createTabs(request[key]).then(windowManager.switchToTab(sender.tab.id)).done(respond);break;case'change_url':windowManager.changeUrl(request[key].tabId,request[key].url).done(respond);break;case'change_all_urls':windowManager.changeAllUrls().done(respond);break;case'set_muted':updateMuted(request[key].tabId,request[key].muted,{},(request[key].muted?'Muted':'Unmuted')+' by user via MuteTab.').done(respond);break;case'set_audible':updateAudible(request[key].tabId,request[key].audible,'tests');respond({});return false;case'send_tab_data':sendTabData(sender.hasOwnProperty('tab')?sender.tab.id:-1).done(respond);break;case'update_listtype':prefsStore.updateListAndSave(prefs_,request[key].listType,request[key].domain).then(updateContextMenus()).done(respond);break;case'change_show_other_tabs':prefs_.showOtherTabs=request[key];return prefsStore.save(prefs_).done(respond);case'play_music':/*ignore jslint start*/playMusic(request[key],'Played by user via MuteTab.').then(updateMuted(request[key],false,{skipPlay:true},'Unmuted by user when playing via MuteTab.')).done(respond);break;/*ignore jslint end*/// Note: cannot depend on this alerting when operation done; linting broken since catch here is from q
case'pause_music':/*ignore jslint start*/pauseMusic(request[key],'Paused by user via MuteTab.').done(respond);break;/*ignore jslint end*/// Note: same as for play_music
case'setup_test_scenario':setupTestScenario(sender.hasOwnProperty('tab')?sender.tab.id:-1,sender.hasOwnProperty('tab')?sender.tab.windowId:-1,request[key]).done(respond);break;case'set_properties_multiple':setPropertiesMultiple(request[key].tabIds,request[key].properties).done(respond);break;case'get_prefs':respond(prefs_);return false;case'set_prefs':prefs_=request[key];console.log('prefs set (in memory) to',prefs_);afterLoadSettings().then(setFavicon()).done(respond);break;// These messages come from music controllers (which originated with StreamKeys).
case'stateData':updateMusicStateData(sender.hasOwnProperty('tab')?sender.tab.id:-1,request[key]).done(function(){});return false;case'created':case'action':return false;// ignore these messages
default:console.warn('Unsupported onMessage key: '+key,request[key]);break;}return false;});// For async responses, we return true to tell Chrome to wait. If method is sync, then return false earlier.
return true;};/* 
  // TODO - Didn't work correctly in Chrome when checked in Fall 2015
  let onCaptured = function(captureInfo) {
  console.log('CAPTURED CHANGE!', captureInfo);
  setState(captureInfo.tabId, 'tabCaptured', (captureInfo.status === 'active'));
};*/var onContextMenuClicked=function onContextMenuClicked(info){onCommand(info.menuItemId);};////////////////////////////////////////////////////////////////////////
// Update tab's non-music UI-based state
////////////////////////////////////////////////////////////////////////
// Mute/unmute, update context menus, update data for when private mode is left, and record to history
// options is some boolean flags: {saveNonPrivate, shouldUpdateDucking, skipPlay};
// we assume they are true unless specified otherwise.
var updateMuted=function updateMuted(tabId,shouldMute,options,reason){tabId=parseInt(tabId,10);// ensure it is integer
return windowManager.getCurrentTab().then(function(currentTabInfo){options=options||{};var skipPlay=options.skipPlay||false;var maybeMutePromise=chromeMisc.setMuted(tabId,shouldMute);var maybePlayPromise=!skipPlay&&shouldMute===false&&getState(tabId,'ducked')?playMusic(tabId,'Played because unmuted.'):Q.when(null);return Q.allSettled([maybeMutePromise,maybePlayPromise]).then(function(output){if(output[0].value===undefined)return Q.when(null);chromeMisc.ensureMutedInfo(output[0].value);setState(tabId,'mutingError',output[0].value.mutedInfo.muted!==shouldMute);shouldMute=output[0].value.mutedInfo.muted;// maintain internal state
var saveNonPrivate=options.hasOwnProperty('saveNonPrivate')?options.saveNonPrivate:true;var shouldUpdateDucking=options.hasOwnProperty('shouldUpdateDucking')?options.shouldUpdateDucking:true;var recordLastUnmuted=options.hasOwnProperty('recordLastUnmuted')?options.recordLastUnmuted:true;var muteChanged=getState(tabId,'mutedCached')!==shouldMute;console.log(tabId,'updateMuted',shouldMute,options,reason);var now=new Date();if(!shouldMute&&recordLastUnmuted){setState(tabId,'lastUnmuted',now);}setState(tabId,'mutedCached',shouldMute);if(muteChanged)setState(tabId,'mutedReason',reason);if(saveNonPrivate)setState(tabId,'nonPrivateMuteStatus',shouldMute);refreshUi();if(currentTabInfo.id===tabId||unduckedTabId_===tabId)updateContextMenus();if(shouldUpdateDucking&&muteChanged){if(getState(tabId,'ducked')&&!shouldMute){console.log(tabId,"moveToFrontOfUnduckingOrder via updatemuted");moveToFrontOfUnduckingOrder(tabId);}updateDucking(tabId+' muted is '+shouldMute).done();}return Q.when(null);});});};// Marks it as audible in the simulator and updates history
// Unlike most methods in this file, this does _not_ return a promise
var updateAudible=function updateAudible(tabId,audible,reason){var timeToCheck=void 0;var now=new Date();if(logTypeEnabled_.events)console.log(tabId,'updateAudible',audible,reason);if(!audible){setState(tabId,'audibleCached',audible);if(okayToUpdateAudibleOrPlaying(tabId)){setState(tabId,'lastAudibleEndBackup',getState(tabId,'lastAudibleEnd'));// Make a backup in case silence is short and we need to reverse it
setState(tabId,'lastAudibleEnd',now);}}else{if(getCountdownForUnducking(tabId,true)>0){setState(tabId,'lastAudibleEnd',getState(tabId,'lastAudibleEndBackup'));// ignore the lul in the history
// we maintain the old lastAudibleStart time, too, unless it doesn't exist or is out of date
if(getState(tabId,'lastAudibleStart')<=getState(tabId,'lastAudibleEnd'))setState(tabId,'lastAudibleStart',now);}else{setState(tabId,'lastAudibleStart',now);}setState(tabId,'audibleCached',audible);if(!getState(tabId,'mutedCached')&&maybeAudible(unduckedTabId_)&&tabId!==windowManager.getLastTabIdSync()){if(unduckingOrder_.indexOf(tabId)>unduckingOrder_.indexOf(unduckedTabId_)&&tabId!==unduckedShortTimeTabId_){console.log(tabId,'ducking this to not interrupt what is currently unducked');duckTabIds([tabId]).done();}addMaybeAudibleCheck(tabId,PLAY_PAUSE_WAIT,true);}}refreshUi();// let duckingIsActive = ((prefs_.enableDucking) && (!prefs_.privacyMode) && (!prefs_.disableAutomuting))
// if (unduckingOrder_.indexOf(tabId) || duckingIsActive) {
// The Math.min prevents us from passing in MAX_SAFE_INTEGER
timeToCheck=audible?prefs_.minTimeBeforeDucking:Math.min(getCountdownForUnducking(tabId,false),prefs_.minTimeBeforeUnducking);addMaybeAudibleCheck(tabId,timeToCheck,false);//  } else {
//    console.log(tabId, "ducking is not active (but would normally check audible here"); //TO_DO (going to try it this way for a bit)
//  }
};var updateListForCurrentTab=function updateListForCurrentTab(listType){return windowManager.getCurrentTab().then(function(currentTabInfo){var domainToUpdate=getDomain(currentTabInfo.url);if(listType=='white'||listType=='black'){var blackOrWhiteListDomain=prefsStore.getDomainRuleForDomainInList(domainToUpdate,prefs_[listType+'list']);if(blackOrWhiteListDomain!==null)domainToUpdate=blackOrWhiteListDomain;}return prefsStore.updateListAndSave(prefs_,listType,domainToUpdate).then(updateContextMenus()).done();});};////////////////////////////////////////////////////////////////////////
// Update internal state
////////////////////////////////////////////////////////////////////////
var togglePrivacyMode=function togglePrivacyMode(){if(privacyModeToggleInProgress_)return Q.when(null);privacyModeToggleInProgress_=true;sendTabData(windowManager.getExtensionTabIdSync()).done();return!prefs_.privacyMode?setPrivacyModeOn():setPrivacyModeOff();};var setPrivacyModeOn=function setPrivacyModeOn(){return Q.when(null,function(){var mutePromises=[];var playPromises=[];clearStateFieldForAllTabs('nonPrivateMuteStatus');clearStateFieldForAllTabs('nonPrivatePlayStatus');console.log("~start");// Save what was muted or playing
Object.keys(getStateForAllTabs('mutedCached')).forEach(function(tabId){setState(tabId,'nonPrivateMuteStatus',getState(tabId,'mutedCached'));});console.log("~end");Object.keys(getStateForAllTabs('musicStateData')).forEach(function(tabId){if(getMusicState(tabId,'isPlaying'))setState(tabId,'nonPrivatePlayStatus',true);});// Mute/pause all tabs for privacy mode
mutePromises.push(muteEverything());prefs_.privacyMode=true;return prefsStore.save(prefs_).then(Q.allSettled(mutePromises)).then(Q.allSettled(playPromises)).then(updateDucking('privacy mode enabled'))// shouldn't do anything here
.then(updateContextMenus()).then(setFavicon()).then(function(){privacyModeToggleInProgress_=false;sendTabData(windowManager.getExtensionTabIdSync()).done();console.log('privacy mode turn on done');});});};var setPrivacyModeOff=function setPrivacyModeOff(){return Q.when(null,function(){var mutePromises=[];var playPromises=[];var needToDuckIds=[];console.log('nonprivatemutestatus',getStateForAllTabs('nonPrivateMuteStatus'));console.log('nonprivateplaystatus',getStateForAllTabs('nonPrivatePlayStatus'));// If a tqb is already audible while privacy mode is on, then do not
// restore sound to the old unducked tab.
// If the user has multiple unducked tabs open during privacy mode, then ending
// privacy mode will duck all but one (via normal ducking logic)
return windowManager.getTabs().then(function(tabs){var maybeAudibleUnmutedFound=false;tabs.forEach(function(tab){if(maybeAudible(tab.id)&&!getState(tab.id,'mutedCached')){maybeAudibleUnmutedFound=true;console.log(tab.id,'maybeAudibleUnmutedFound',tab,unduckedTabId_);}});if(maybeAudibleUnmutedFound)needToDuckIds.push(unduckedTabId_);// Restore muted state
Object.keys(getStateForAllTabs('nonPrivateMuteStatus')).forEach(function(tabId){if(!(unduckedTabId_===parseInt(tabId,10)&&maybeAudibleUnmutedFound)){mutePromises.push(updateMuted(tabId,getState(tabId,'nonPrivateMuteStatus'),{saveNonPrivate:false,recordLastUnmuted:false,skipPlay:true},'Unmuted while restoring from privacy mode.'));}else{console.log(tabId,'not unmuting since no longer should be unducked');}});// Restore play state
Object.keys(getStateForAllTabs('nonPrivatePlayStatus')).forEach(function(tabId){if(!(unduckedTabId_===parseInt(tabId,10)&&maybeAudibleUnmutedFound)){playPromises.push(playMusic(tabId,'Played while restoring from privacy mode.'));}else{console.log(tabId,'not playing since no longer should be unducked');}});// We make sure that we update muting/playing prior to enabling privacy mode (so that it unducks the proper tab)
return Q.allSettled(mutePromises).then(Q.allSettled(playPromises)).then(Q.allSettled(duckTabIds(needToDuckIds))).then(function(){prefs_.privacyMode=false;return prefsStore.save(prefs_).then(updateDucking('privacy mode disabled')).then(updateContextMenus()).then(setFavicon()).then(function(){privacyModeToggleInProgress_=false;sendTabData(windowManager.getExtensionTabIdSync()).done();console.log('privacy mode turn off done');});});});});};var updateStateForUrlChange=function updateStateForUrlChange(tab){chromeMisc.ensureMutedInfo(tab);console.log(tab.id,'updateStateForUrlChange',tab.url);var promise=Q.when(null);if(prefs_.muteBackgroundTabs)promise=windowManager.getLastTabId();return promise.then(function(lastTabId){// Note that this async can cause tab muting do vary in order (which can break tests)
var muteInfo=null;var domain=getDomain(tab.url);var oldDomain=getState(tab.id,'domainCached');var oldDucked=getState(tab.id,'ducked');var oldAudible=getState(tab.id,'audibleCached');var oldMuted=getState(tab.id,'mutedCached');var oldAudibleStart=getState(tab.id,'lastAudibleStart');// console.log("domain: ", domain, getState(tab.id, "domainCached"));
if(domain!==null){var wasMuted=getState(tab.id,'mutedCached');console.log(tab.id,"wasMuted",wasMuted);console.log(tab.id,"domain",domain);console.log(tab.id,"oldDomain",oldDomain);//console.log("~~~", prefs_.mutedRememberSameDomain, (domain === oldDomain), (!prefs_.disableAutomuting), domain, oldDomain);
if(prefs_.mutedRememberSameDomain&&domain===oldDomain&&!prefs_.disableAutomuting){muteInfo={should:wasMuted,reason:'Remember muted for same domain.'};}else{clearState(tab.id);var isWhiteList=prefsStore.domainInList(domain,prefs_.whitelist);var isBlackList=prefsStore.domainInList(domain,prefs_.blacklist);var isMusic=prefsStore.domainInList(domain,prefs_.musiclist);console.log(tab.id,'onupdate_debug',domain,prefs_,isWhiteList,isBlackList,isMusic,prefs_.muteAllTabs);//console.log("lists", isMusic, isWhiteList, isBlackList);
//console.log(tab, prefs_);
//console.log((tab.incognito && prefs_.muteNewIncognito && (!isWhiteList) && (!isMusic)));
if(prefs_.disableAutomuting||getState(tab.id,'ducked')){// do nothing
}else if(tab.incognito&&prefs_.muteNewIncognito){muteInfo={should:true,reason:'Incognito muted by default.'};}else if(prefs_.muteAllTabs){if(isMusic)muteInfo={should:false,reason:'Not muted by default since on music list.'};else if(isWhiteList)muteInfo={should:false,reason:'Not muted by default since on whitelist.'};else muteInfo={should:true,reason:'Muted by default.'};}else if(prefs_.muteBackgroundTabs){// mute background
if(tab.id===lastTabId){if(isBlackList)muteInfo={should:true,reason:'Muted because on blacklist.'};else muteInfo={should:false,reason:'Not muted by default since foreground tab.'};}else{if(isMusic)muteInfo={should:false,reason:'Not muted by default since on music list.'};else muteInfo={should:true,reason:'Background muted by default.'};}}else if(prefs_.unmuteAllTabs){// unmuted by default
if(isBlackList)muteInfo={should:true,reason:'Muted because on blacklist.'};else muteInfo={should:false,reason:'Unmuted by default.'};}}// We set these here rather than earlier to ensure they don't get cleared
setState(tab.id,'url',tab.url);setState(tab.id,'urlChanged',new Date());setState(tab.id,'domainCached',domain);setState(tab.id,'audibleCached',oldAudible);setState(tab.id,'mutedCached',muteInfo.should);setState(tab.id,'ducked',oldDucked);setState(tab.id,'lastAudibleStart',oldAudibleStart);// needed because we don't have an audible event happen to set it if it starts out audible from previous url
// The purpose of this 'maybe audible' check is determine when a tab is no longer considered to have a recent url change (since it is considered audible before then)
if(unduckedTabId_===tab.id)addMaybeAudibleCheck(tab.id,URL_CHANGE_WAIT,true);//TODO: set to false if handle multiple untils properly
}var maybeMutePromise=muteInfo?updateMuted(tab.id,muteInfo.should,{},muteInfo.reason):Q.when(null);maybeMutePromise.then(function(){if(prefs_.privacyMode&&!(prefs_.mutedRememberSameDomain&&domain===oldDomain))// mute because of privacy mode unless same domain and remembersamedomain is active
updateMuted(tab.id,true,{saveNonPrivate:false},'Muted due to privacy mode.').done();}).then(injectMusicApi(tab.id,tab.url,false)).then(function(){updateContextMenus();// We update context menus even if it wasn't the active tab that was updated; a little inefficient but there was bug when trying to compare the current tabId
}).done();});};////////////////////////////////////////////////////////////////////////
// UI-related code (for background page)
////////////////////////////////////////////////////////////////////////
// We batch up requests to improve performance and schedule updating context menus to run in the background
// Does not return a promise.
//
// A tradeoff of this it generates the full context menu from scratch every time.  A reason why
// we don't just use 'update' is there doesn't seem to be a clean way to hide the 'unducked' section
// when ducking isn't enabled instead of greying it out.
var updateContextMenus=function updateContextMenus(){clearTimeout(updateContextMenusTimeout_);updateContextMenusTimeout_=setTimeout(function(){updateContextMenusTimeout_=null;return windowManager.getCurrentTab().then(function(currentTabInfo){if(currentTabInfo===null){console.error("currentTabInfo is null");return Q.when(null);}// console.log("updateContextMenus", currentTabInfo.id, currentTabInfo.url, unduckedTabId_);
if(updateContextMenusBusy_){console.log(currentTabInfo.id,'context menus busy');return Q.when(null);}updateContextMenusBusy_=true;return chromeMisc.contextMenusRemoveAll().then(function(){try{var domain=getDomain(currentTabInfo.url);var listType=prefs_.muteAllTabs||currentTabInfo.incognito&&prefs_.muteNewIncognito?'white':'black';var inList=prefsStore.domainInList(domain,prefs_[listType+'list']);var blackOrWhiteListDomain=prefsStore.getDomainRuleForDomainInList(domain,prefs_[listType+'list']);var inMusicList=prefsStore.domainInList(domain,prefs_.musiclist);var inManualDuckingList=prefsStore.domainInList(domain,prefs_.manualduckinglist);var unduckedTabContextId=void 0;if(blackOrWhiteListDomain===null)blackOrWhiteListDomain=domain;var currentTabContextId=chrome.contextMenus.create({'title':'Current tab','contexts':['page']});var backgroundTabsContextId=chrome.contextMenus.create({'title':'Background tabs','contexts':['page']});var allTabsContextId=chrome.contextMenus.create({'title':'All tabs','contexts':['page']});if(!hideDucking_){if(duckingEffectivelyEnabled()&&unduckedTabId_>0){unduckedTabContextId=chrome.contextMenus.create({'id':'unducked_tab','title':'Unducked tab','contexts':['page']});}}chrome.contextMenus.create({'type':'separator','contexts':['page']});chrome.contextMenus.create({'id':'change_privacy_mode','type':'checkbox','checked':prefs_.privacyMode,'title':'Privacy Mode','contexts':['page'],'enabled':!prefs_.disableAutomuting});chrome.contextMenus.create({'id':'change_disable_automuting','type':'checkbox','checked':prefs_.disableAutomuting,'title':'Disable automuting','contexts':['page'],'enabled':!prefs_.privacyMode});chrome.contextMenus.create({'type':'separator','contexts':['page']});chrome.contextMenus.create({'id':'show_options','title':'Options','contexts':['page']});if(getState(currentTabInfo.id,'mutedCached')){chrome.contextMenus.create({'id':'unmute_current','title':'Unmute','contexts':['page'],'parentId':currentTabContextId});}else{chrome.contextMenus.create({'id':'mute_current','title':'Mute','contexts':['page'],'parentId':currentTabContextId});}var isPlaying=getMusicState(currentTabInfo.id,'isPlaying');if(isPlaying!==''){chrome.contextMenus.create({'id':isPlaying?'pause_current':'play_current','title':isPlaying?'Pause':'Play','contexts':['page'],'parentId':currentTabContextId});}var blackWhiteListCommand=listType==='black'?inList?'blacklist_remove':'blacklist_add':inList?'whitelist_remove':'whitelist_add';chrome.contextMenus.create({'id':blackWhiteListCommand,'title':(inList?'Remove ':'Add ')+blackOrWhiteListDomain+(inList?' from ':' to ')+listType+'list','contexts':['page'],'parentId':currentTabContextId});chrome.contextMenus.create({'id':inMusicList?'musiclist_remove':'musiclist_add','title':(inMusicList?'Remove ':'Add ')+getDomain(currentTabInfo.url)+(inMusicList?' from ':' to ')+'music list','contexts':['page'],'parentId':currentTabContextId});if(!hideDucking_){chrome.contextMenus.create({'id':inManualDuckingList?'manualduckinglist_remove':'manualduckinglist_add','title':(inManualDuckingList?'Remove ':'Add ')+getDomain(currentTabInfo.url)+(inManualDuckingList?' from ':' to ')+'manual ducking controls list','contexts':['page'],'parentId':currentTabContextId});}chrome.contextMenus.create({'id':'mute_all','title':'Mute','contexts':['page'],'parentId':allTabsContextId});chrome.contextMenus.create({'id':'unmute_all','title':'Unmute','contexts':['page'],'parentId':allTabsContextId});chrome.contextMenus.create({'id':'mute_background','title':'Mute','contexts':['page'],'parentId':backgroundTabsContextId});if(duckingEffectivelyEnabled()&&unduckedTabId_>0){chrome.contextMenus.create({'id':'show_unducked','title':'Show','contexts':['page'],'parentId':unduckedTabContextId});chrome.contextMenus.create({'id':'pause_unducked','title':'Pause','contexts':['page'],'parentId':unduckedTabContextId,'enabled':getMusicState(unduckedTabId_,'isPlaying')===true});chrome.contextMenus.create({'id':'mute_unducked','title':'Mute','contexts':['page'],'parentId':unduckedTabContextId,'enabled':!getState(unduckedTabId_,'mutedCached')});chrome.contextMenus.create({'id':'close_unducked','title':'Close','contexts':['page'],'parentId':unduckedTabContextId});}}catch(ex){console.error(ex);}updateContextMenusBusy_=false;return Q.when(null);});});},50);// delay before actually updating context menus so that we don't do it a bunch of times in a row
};var showTabsWindow=function showTabsWindow(){return Q.all([windowManager.getLastFocusedWindow(),windowManager.getExtensionWindowId()]).spread(function(currentWindow,extensionWindowId){// Don't activate the extension UI from an existing extension window.
if(currentWindow.id==extensionWindowId)return null;// When the user opens the UI in a separate window (not the popup) and
// doesn't have "show from all windows" enabled, we need to know which
// was the last non-extension UI window that was active.
windowManager.setLastWindowId(currentWindow.id);var left=currentWindow.left+Math.round((currentWindow.width-EXTENSION_UI_WIDTH)/2);var top=currentWindow.top+PADDING_TOP;var height=Math.max(currentWindow.height-PADDING_TOP-PADDING_BOTTOM,600);var width=EXTENSION_UI_WIDTH;return windowManager.showExtensionUi(width,height,left,top);});};var updateTabInfoWithMetaData=function updateTabInfoWithMetaData(tabInfo){try{var domain=getDomain(tabInfo.url);tabInfo.mutedInfo.muted=getState(tabInfo.id,'mutedCached');tabInfo.audible=getState(tabInfo.id,'audibleCached');tabInfo.mutedReason=getState(tabInfo.id,'mutedReason');tabInfo.playPauseReason=getState(tabInfo.id,'playPauseReason');tabInfo.maybeAudible=(tabInfo.audible||maybeAudible(tabInfo.id))&&getState(tabInfo.id,'lastAudibleStart').getTime();tabInfo.isMusic=prefsStore.domainInList(domain,prefs_.musiclist);tabInfo.isManualDucking=prefsStore.domainInList(domain,prefs_.manualduckinglist);tabInfo.ducked=tabInfo.ducked||false;tabInfo.domainForWhiteList=prefsStore.getDomainRuleForDomainInList(domain,prefs_.whitelist);tabInfo.domainForBlackList=prefsStore.getDomainRuleForDomainInList(domain,prefs_.blacklist);tabInfo.isWhiteList=prefsStore.domainInList(domain,prefs_.whitelist);tabInfo.isBlackList=prefsStore.domainInList(domain,prefs_.blacklist);tabInfo.isPlaying=getMusicState(tabInfo.id,'isPlaying');tabInfo.song=getMusicState(tabInfo.id,'song');tabInfo.artist=getMusicState(tabInfo.id,'artist');tabInfo.captured=getState(tabInfo.id,'tabCaptured');tabInfo.mutingError=getState(tabInfo.id,'mutingError');tabInfo.supportedPlayer=getState(tabInfo.id,'hasCustomMusicController');//console.log("tabinfo with domain for lists", tabInfo);
}catch(ex){console.error(ex);}};var sendTabData=function sendTabData(senderTabId){try{return windowManager.getTabs().then(function(tabs){var listType=prefs_.muteAllTabs||prefs_.muteBackgroundTabs?'white':'black';var tabIdDict={};var currentTabs=[];var mostRecentlyAudibleTabs=[];var audibleTabs=[];var recentlyAudibleTabs=[];var duckedTabs=[];var musicTabs=[];var otherTabs=[];tabs.forEach(function(tab){tabIdDict[tab.id]=tab;});unduckingOrder_.forEach(function(tabId){if(!getState(tabId,'ducked'))return;var tabInfo=tabIdDict[tabId];updateTabInfoWithMetaData(tabInfo);tabInfo.ducked=true;tabInfo.category='Ducked';duckedTabs.push(tabInfo);});if((tabs||[]).length){tabs.forEach(function(tabInfo){try{updateTabInfoWithMetaData(tabInfo);if(tabInfo.id===windowManager.getLastTabIdSync()){var currentTabInfo=JSON.parse(JSON.stringify(tabInfo));console.log("currenttabinfo",currentTabInfo);currentTabInfo.isCurrent=true;currentTabInfo.category='Current tab';currentTabs=[currentTabInfo];}if(tabInfo.ducked||false)// Ducked tabs were included earlier
return;// order here matters for setting categories
if((tabInfo.audible||tabInfo.isPlaying)&&!tabInfo.mutedInfo.muted&&getState(tabInfo.id,'lastAudibleStart').getTime()){tabInfo.category='Noisy or playing tabs';audibleTabs.push(tabInfo);}else if(!tabInfo.mutedInfo.muted&&tabInfo.maybeAudible&&duckingEffectivelyEnabled()){tabInfo.category='Most recently noisy or playing tab';mostRecentlyAudibleTabs.push(tabInfo);}else if(wasRecentlyAudible(tabInfo.id)){tabInfo.category='Recently noisy or playing tabs';recentlyAudibleTabs.push(tabInfo);}else{if(prefs_.showOtherTabs&&tabInfo.id!==windowManager.getLastTabIdSync()){tabInfo.category='Other tabs';otherTabs.push(tabInfo);}}}catch(ex){console.error(ex);}});}// combine tabs back together in order that will be used in UI
var tabLists=[currentTabs,audibleTabs,mostRecentlyAudibleTabs,duckedTabs,recentlyAudibleTabs,musicTabs,otherTabs];var newData={};newData.tabs=[];tabLists.forEach(function(tabList){newData.tabs=newData.tabs.concat(tabList);});newData.listType=listType;newData.incognitoListType=prefs_.muteNewIncognito?'white':newData.listType;newData.activeListType=prefs_.muteBackgroundTabs?'black':listType;newData.showOtherTabs=prefs_.showOtherTabs;newData.simulationMode=false;newData.privacyMode=prefs_.privacyMode;newData.disableAutomuting=prefs_.disableAutomuting;newData.senderTabId=senderTabId;newData.noisesPrevented=parseInt(localStorage.noisesPrevented||0,10);newData.duckingEffectivelyEnabled=duckingEffectivelyEnabled();newData.loggingEnabled=loggingEnabled_;newData.privacyModeToggleInProgress=privacyModeToggleInProgress_;if(logTypeEnabled_.ui)console.log('sendTabData data',newData);return newData;});}catch(ex){console.error(ex);return Q.when(null);}};// We refresh the UI from the background when our state changes
// and the user might have the UI already open.  This happens when:
// we detect an audible or muted change from a tab or when music
// ducking/unducking.  Normally the UI will be updated by calling this
// method from the ReactJS code.
var refreshUi=function refreshUi(){clearTimeout(refreshUiTimeout_);refreshUiTimeout_=setTimeout(function(){var popupFound=false;var views=chrome.extension.getViews();views.forEach(function(view){if(view.location.href===chrome.extension.getURL('build/html/popup.html'))popupFound=true;});if(popupFound){// console.log("refresh ui!");
if(typeof reactUi_!=='undefined')reactUi_.refreshTabs();}refreshUiTimeout_=null;},10);// delay before actually updating UI so that we don't do it a bunch of times in a row
};// Note that this method does not return a promise or use a callback but is async (we don't care about waiting for it right now)
var refreshUiCountDown=function refreshUiCountDown(){var displayedCountDownVal=duckingCountDown_;displayedCountDownVal=Math.ceil(displayedCountDownVal);var alreadyAudibleOrPlaying=unduckedTabId_!==-1&&(getAudibleOrPlaying(unduckedTabId_)||false);// console.log("refreshuicountdown", unduckedTabId_, unduckingOrder_, displayedCountDownVal, alreadyAudibleOrPlaying, getState(tabId, "audibleCached"), getMusicState(unduckedTabId_, "isPlaying"), getState(unduckedTabId_, "playInProgress"));
if(prefs_.minTimeBeforeUnducking>=prefs_.audioNotifierDelay+1&&!alreadyAudibleOrPlaying&&getFirstDuckedTabId()&&displayedCountDownVal>0&&displayedCountDownVal!==Number.MAX_SAFE_INTEGER){browserActionUnduckMessage_=': Your music will be unducked in '+displayedCountDownVal+' seconds.';chrome.browserAction.setBadgeText({text:displayedCountDownVal+' s'});}else{browserActionUnduckMessage_='';chrome.browserAction.setBadgeText({text:''});}chrome.browserAction.setTitle({title:browserActionTitle_+browserActionMode_+browserActionUnduckMessage_});};var getMutingBehaviorString=function getMutingBehaviorString(){var str='';if(prefs_.disableAutomuting){str+='\n(Automuting is disabled)';}else if(prefs_.privacyMode){str+='\n(Privacy mode)';}else{if(prefs_.muteAllTabs)str+=', mutes tabs by default';else if(prefs_.muteBackgroundTabs)str+=', mutes background tabs by default';if(prefs_.muteNewIncognito)str+=', mutes incognito tabs by default';if(prefs_.mutedRememberSameDomain)str+=', remembers muted for same domain';if(prefs_.enableDucking)str+=', ducks music';if(str.length){str=str.substr(2);// Remove first comma and space
str='\nAutomuting behavior: '+str+'.';}var inManualDuckingList=false;if(unduckedTabId_!==-1&&duckingEffectivelyEnabled())inManualDuckingList=prefsStore.domainInList(getState(unduckedTabId_,'domainCached'),prefs_.manualduckinglist);if(inManualDuckingList&&getState(unduckedTabId_,'lastAudibleStart').getTime())str+='\nManual intervention required to return to music in another tab.';}return str;};var setFavicon=function setFavicon(){return Q.fcall(function(){var faviconFileName='build/img/favicon.png';var inManualDuckingList=false;if(unduckedTabId_!==-1){inManualDuckingList=prefsStore.domainInList(getState(unduckedTabId_,'domainCached'),prefs_.manualduckinglist);}if(prefs_.privacyMode){faviconFileName='build/img/privacymode.png';}else if(prefs_.disableAutomuting){faviconFileName='build/img/disableautomuting.png';}else if(inManualDuckingList&&!getState(unduckedTabId_,'mutedCached')&&getState(unduckedTabId_,'lastAudibleStart').getTime()){faviconFileName='build/img/manualmode_favicon.png';}browserActionMode_=getMutingBehaviorString();chrome.browserAction.setTitle({title:browserActionTitle_+browserActionMode_+browserActionUnduckMessage_});return chromeMisc.setBrowserActionIcon({path:faviconFileName});});};////////////////////////////////////////////////////////////////////////
// Music Controls
////////////////////////////////////////////////////////////////////////
var clearPlayAndPauseInProgressIfExpired=function clearPlayAndPauseInProgressIfExpired(tabId){var playInProgressTimestamp=getState(tabId,'playInProgress');if(playInProgressTimestamp!==new Date(0)&&new Date().getTime()-playInProgressTimestamp.getTime()>PLAY_PAUSE_WAIT*1000){// console.log(tabId, "clearing playinprogress");
setState(tabId,'playInProgress',new Date(0));setState(tabId,'playInProgressExpired',true);}var pauseInProgressTimestamp=getState(tabId,'pauseInProgress');if(pauseInProgressTimestamp!==new Date(0)&&new Date().getTime()-pauseInProgressTimestamp.getTime()>PLAY_PAUSE_WAIT*1000){// console.log(tabId, "clearing pauseinprogress");
setState(tabId,'pauseInProgress',new Date(0));setState(tabId,'pauseInProgressExpired',true);}};var playMusic=function playMusic(tabId,reason){if(prefs_.disablePlayPause)return Q.when(null);return Q.fcall(function(){if(isPlayingOrPlayInProgress(tabId))return Q.when(null);if(logTypeEnabled_.music)console.log(tabId,'playMusic',reason,getMusicState(tabId,'isPlaying'));setState(tabId,'playInProgress',new Date());setState(tabId,'pauseInProgress',new Date(0));setState(tabId,'playInProgressReason',reason);setState(tabId,'playInProgressExpired',false);addMaybeAudibleCheck(tabId,PLAY_PAUSE_WAIT,false);chromeMisc.tabsSendMessage(parseInt(tabId,10),{'action':'playPause','customOnly':getState(tabId,'hasCustomMusicController'),'intendedCommand':'play'},{});return null;});};var pauseMusic=function pauseMusic(tabId,reason){if(prefs_.disablePlayPause)return Q.when(null);return Q.fcall(function(){if(!isPausedOrPauseInProgress(tabId)){if(logTypeEnabled_.music)console.log(tabId,'pauseMusic',reason);setState(tabId,'pauseInProgress',new Date());setState(tabId,'playInProgress',new Date(0));setState(tabId,'pauseInProgressReason',reason);setState(tabId,'pauseInProgressExpired',false);addMaybeAudibleCheck(tabId,PLAY_PAUSE_WAIT,false);chromeMisc.tabsSendMessage(parseInt(tabId,10),{'action':'playPause','customOnly':getState(tabId,'hasCustomMusicController'),'intendedCommand':'pause'},{});}return Q.when(null);});};var pauseCurrent=function pauseCurrent(){return windowManager.getCurrentTab().then(function(tabInfo){return pauseMusic(tabInfo.id,'Paused by user via MuteTab context menu.');});};var playCurrent=function playCurrent(){return windowManager.getCurrentTab().then(function(tabInfo){return updateMuted(tabInfo.id,false,{},'Unmuted by user when playing via MuteTab context menu.').then(playMusic(tabInfo.id,'Played by user via MuteTab context menu.'));});};var muteOrPauseUnducked=function muteOrPauseUnducked(){if(unduckedTabId_!==-1){return getMusicState(unduckedTabId_,'isPlaying')?pauseMusic(unduckedTabId_,'Paused by user as \'unducked tab\' via keyboard shortcut.'):updateMuted(unduckedTabId_,true,{},'Muted by user as \'unducked tab\' via keyboard shortcut.');}return Q.when(null);};var injectMusicApi=function injectMusicApi(tabId,url,injectDefault){if(!injectingEnabled_){return Q.when(null);}// Note: it is now okay to inject multiple times into the same tab.
// We do this rarely and the script makes sure it doesn't run more
// than once (used to check here if it already injected and bail if so)
if(url.startsWith('chrome://'))return Q.when(false);if(url.startsWith('chrome-devtools://'))return Q.when(false);if(url.startsWith('chrome-extension://'))return Q.when(false);if(url.startsWith('https://chrome.google.com/webstore'))return Q.when(false);if(url.startsWith('data:'))return Q.when(false);if(logTypeEnabled_.injected)console.log(tabId,'injectMusicApi',url,injectDefault);return Q.when(null).then(function(){var promises=[Q.when(null)];var disableDefaultController=false;var allFrames=false;var controllerFileName=musicControllers.getController(url);if(controllerFileName!==null)setState(tabId,'hasCustomMusicController',true);if(controllerFileName!==null){//disableDefaultController = (controllerFileName === "YoutubeController.js");
disableDefaultController=true;if(logTypeEnabled_.injected)console.log(tabId,'controllerFileName',controllerFileName);controllerFileName='./build/js/music_controllers/'+controllerFileName;promises.push(chromeMisc.executeScript(tabId,{file:controllerFileName,allFrames:allFrames}));}else if(injectDefault){// We only load the default controller into tabs that don't have a custom one since we'll just disable it
// and ignore it's messages anyway. Move this code before the if block if this requirement changes.
// The reason we use it as a contentscript in the manifest is that this ensures it is loaded within
// all frames (especially useful for reddit and facebook).
promises.push(chromeMisc.executeScript(tabId,{file:'./build/js/DefaultController.js',allFrames:true}));}return Q.allSettled(promises).then(function(){// console.log(tabId, "injectMusicApi promises finished");
return disableDefaultController?chromeMisc.tabsSendMessage(parseInt(tabId,10),{'action':'disable'},{}):Q.when(true);});}).catch(function(err){console.error(err);});};// We set isPlaying to true if at least one frame is playing
// Otherwise, if at least one frame is paused we set it to false
// And if we have no playing or paused, we set it as null
var computeStateDataAcrossFrames=function computeStateDataAcrossFrames(tabId){// console.log(tabId, "computeStateDataAcrossFrames", musicStateForFrame_[tabId]);
var playCount=0;var pauseCount=0;var savePausedCount=0;var noContentCount=0;var siteName=null;var musicStateForFrame=getState(tabId,'musicStateForFrame');var keys=Object.keys(musicStateForFrame);keys.forEach(function(key){playCount+=getState(tabId,'musicStateForFrame')[key].playCount;pauseCount+=getState(tabId,'musicStateForFrame')[key].pauseCount;savePausedCount+=getState(tabId,'musicStateForFrame')[key].savePausedCount;noContentCount+=getState(tabId,'musicStateForFrame')[key].noContentCount||0;if(siteName===null)siteName=getState(tabId,'musicStateForFrame')[key].siteName;});if(logTypeEnabled_.injected)console.log(tabId,'computeAcrossFrames',playCount,pauseCount,savePausedCount,noContentCount);var musicStateData={};if(playCount>0)musicStateData.isPlaying=true;else if(savePausedCount>0||pauseCount===1)// only allow clicking play if there is just one source
musicStateData.isPlaying=false;else musicStateData.isPlaying=null;musicStateData.siteName=siteName;musicStateData.artist=null;musicStateData.song=null;// console.log(tabId, "computed across frames", musicStateData);
return musicStateData;};// We don't update audible or playing if ducking is enabled, a site has been audible at least once for the
// current url, and a site is on the 'manual ducking controls list'
//
// This lets us not constantly duck/unduck a site that doesn't play audio consistently
// It is okay to update audibleCached, though.
var okayToUpdateAudibleOrPlaying=function okayToUpdateAudibleOrPlaying(tabId){return!prefs_.enableDucking||getNeverAudibleForUrl(tabId)||!prefsStore.domainInList(getState(tabId,'domainCached'),prefs_.manualduckinglist);};var updateMusicStateData=function updateMusicStateData(tabId,musicStateData){if(tabId===windowManager.getExtensionTabIdSync())return Q.when(null);if(prefs_.disablePlayPause)return Q.when(null);// Ignore HTML5 player state data for sites that have a custom player
if(getState(tabId,'hasCustomMusicController')===true&&(musicStateData.fromDefaultController||null))return Q.when(null);return windowManager.getCurrentTab().then(function(tabInfo){if(musicStateData.hasOwnProperty('frameId')){var musicStateForFrames=getState(tabId,'musicStateForFrame');musicStateForFrames[musicStateData.frameId]=musicStateData;setState(tabId,'musicStateForFrame',musicStateForFrames);musicStateData=computeStateDataAcrossFrames(tabId);}var firstInfo=false;var storedMusicStateData=getState(tabId,'musicStateData');if(!storedMusicStateData){// Set if first info for tab
firstInfo=true;setState(tabId,'musicStateData',musicStateData);}else if(storedMusicStateData.isPlaying!==musicStateData.isPlaying||storedMusicStateData.artist!==musicStateData.artist||storedMusicStateData.song!==musicStateData.song||storedMusicStateData.autoplayCountdown!==musicStateData.autoplayCountdown){// Update state, UI if changed
setState(tabId,'musicStateData',musicStateData);refreshUi();}if(firstInfo||storedMusicStateData.isPlaying!==musicStateData.isPlaying){if(musicStateData.isPlaying===true){// Don't treat it as ducked if played and unmuted (before it would pause again via pauseAllUnmutedDucked)
if(!getState(tabId,'mutedCached')){removeFromArray(unduckingOrder_,tabId);}if(okayToUpdateAudibleOrPlaying(tabId)){var now=new Date();if(now.getTime()-getState(tabId,'playInProgress').getTime()<PLAY_PAUSE_WAIT*1000){setState(tabId,'lastPlayed',getState(tabId,'playInProgress'));setState(tabId,'playPauseReason',getState(tabId,'playInProgressReason'));}else{setState(tabId,'lastPlayed',now);setState(tabId,'playPauseReason','Played via webpage.');}setState(tabId,'playInProgress',new Date(0));setState(tabId,'playInProgressExpired',false);}}else if(musicStateData.isPlaying===false){if(okayToUpdateAudibleOrPlaying(tabId)){setState(tabId,'lastPaused',new Date());if(getState(tabId,'lastPaused').getTime()-getState(tabId,'pauseInProgress').getTime()<PLAY_PAUSE_WAIT*1000){setState(tabId,'lastPaused',getState(tabId,'pauseInProgress'));setState(tabId,'playPauseReason',getState(tabId,'pauseInProgressReason'));}else{setState(tabId,'playPauseReason','Paused via webpage.');}setState(tabId,'pauseInProgress',new Date(0));setState(tabId,'pauseInProgressExpired',false);}}if(prefs_.enableDucking){var timeToCheck=musicStateData.isPlaying?prefs_.minTimeBeforeDucking:prefs_.minTimeBeforeUnducking;addMaybeAudibleCheck(tabId,timeToCheck,true);}refreshUi();if(logTypeEnabled_.music)console.log(tabId,'updateMusicStateData done',new Date(),musicStateData);}if(tabInfo.id===tabId||tabId===unduckedTabId_)updateContextMenus();return Q.when(null);});};var getMusicState=function getMusicState(tabId,field){var musicStateData=getState(tabId,'musicStateData');if(musicStateData===null||!musicStateData.hasOwnProperty(field)||musicStateData[field]===null){return'';}return musicStateData[field];};////////////////////////////////////////////////////////////////////////////////////////////////
// Music Ducking
////////////////////////////////////////////////////////////////////////////////////////////////
var moveToFrontOfUnduckingOrder=function moveToFrontOfUnduckingOrder(tabId){console.log(tabId,"moveToFrontOfUnduckingOrder");var index=unduckingOrder_.indexOf(tabId);if(index>=0){removeFromArray(unduckingOrder_,tabId);}unduckingOrder_.unshift(tabId);};// Returns when most recently became silent or paused (or new Date(0) if neither)
var getLastSilentOrPaused=function getLastSilentOrPaused(tabId){var lastAudibleEnd=getState(tabId,'lastAudibleEnd');var lastPaused=getState(tabId,'lastPaused');var results=lastAudibleEnd>lastPaused?lastAudibleEnd:lastPaused;return results;};// Returns when most recently became audible or played (or new Date(0) if neither)
var getLastAudibleOrPlayed=function getLastAudibleOrPlayed(tabId){var lastAudibleStart=getState(tabId,'lastAudibleStart');var lastPlayed=getState(tabId,'lastPlayed');var lastPlayInProgress=getState(tabId,'playInProgress');return new Date(Math.max.apply(null,[lastAudibleStart,lastPlayed,lastPlayInProgress]));};var getAudibleOrPlaying=function getAudibleOrPlaying(tabId){var audible=getState(tabId,'audibleCached')||false;// let isPlaying = isPlayingOrPlayInProgress(tabId);
var isPlaying=getMusicState(tabId,'isPlaying')===true||new Date().getTime()-getState(tabId,'playInProgress').getTime()<PLAY_PAUSE_WAIT*1000;return audible||isPlaying;};var isPlayingOrPlayInProgress=function isPlayingOrPlayInProgress(tabId){clearPlayAndPauseInProgressIfExpired(tabId);return getMusicState(tabId,'isPlaying')===true||getState(tabId,'playInProgress').getTime();};var isPausedOrPauseInProgress=function isPausedOrPauseInProgress(tabId){clearPlayAndPauseInProgressIfExpired(tabId);var result=getMusicState(tabId,'isPlaying')===false||getState(tabId,'pauseInProgress').getTime();return result;};var getNeverAudibleForUrl=function getNeverAudibleForUrl(tabId){// console.log(tabId, "going to check never audible for url", !getState(tabId, "audibleCached"), (!(getState(tabId, "lastAudibleStart").getTime()), (getState(tabId, "urlChanged").getTime() > getState(tabId, "lastAudibleEnd").getTime())));
return!getState(tabId,'audibleCached')&&(!getState(tabId,'lastAudibleStart').getTime()||getState(tabId,'urlChanged').getTime()>getState(tabId,'lastAudibleEnd').getTime());};// Returns countdown in seconds
var getUrlChangeCountdown=function getUrlChangeCountdown(tabId){return URL_CHANGE_WAIT-(new Date().getTime()-getState(tabId,'urlChanged').getTime())/1000;};// Return how many more seconds of silence must occur before we allow unducking another tab.
// (Reason: tab might be in a 'lul' in a video and we don't want it to jump back.)
var getCountdownForUnducking=function getCountdownForUnducking(tabId,ignoreAudibleOrPlaying){if(tabId==-1)return 0;// If it ever played and is on the manual ducking controls list, then it will stay unducked until the url is no longer active
var domainIsInList=prefsStore.domainInList(getState(tabId,'domainCached'),prefs_.manualduckinglist);if(getState(tabId,'lastAudibleStart').getTime()&&domainIsInList){if(logTypeEnabled_.duckingReasoning)console.log(tabId,'reason: has been audible and is on manual ducking controls list');return Number.MAX_SAFE_INTEGER;}// If url was just changed on unducked tab, then apply the normal countdown from the tab's load time.
// Means that if it was unducked before, it will stay that way.
var urlChangeCountdown=getUrlChangeCountdown(tabId);if(urlChangeCountdown>0&&tabId===unduckedTabId_){if(logTypeEnabled_.duckingReasoning)console.log(tabId,'reason: urlchanged; full state is ',getFullState(tabId));return urlChangeCountdown;}// No countdown if it never played audio for current url. (Lets us ignore silent ads and similar.)
if(getNeverAudibleForUrl(tabId)){if(logTypeEnabled_.duckingReasoning)console.log(tabId,'reason: never audible');return 0;}if(!ignoreAudibleOrPlaying){// If audible, wait is potentially forever.
if(tabId===-1||getAudibleOrPlaying(tabId)){if(logTypeEnabled_.duckingReasoning)console.log(tabId,'reason: audible or playing');return Number.MAX_SAFE_INTEGER;}}var now=new Date();var countDown=void 0;var prevAudibleDuration=getPrevAudibleDuration(tabId);if(prevAudibleDuration>0){prevAudibleDuration-=prefs_.audioNotifierDelay;// Subtract out the time we have waited for the audio indicator to go away
if(prevAudibleDuration<0)prevAudibleDuration=0;}// Use the user's preference after subtracting away the audio indicator time
var unduckWait=prefs_.minTimeBeforeUnducking;if(getState(tabId,'hasCustomMusicController')&&!getState(tabId,'audibleCached')&&!isPlayingOrPlayInProgress(tabId)&&getState(tabId,'lastPlayed').getTime()){unduckWait=prefs_.minTimeBeforeUnduckingPaused;// use different (likely shorter) delay for supported sites
}if(tabId!==unduckedTabId_)unduckWait+=DUCKED_TIMEOUT_EXTRA_WAIT;// It doesn't make sense to clear ducked tabs right away in case they need to play sound again.
var duckWait=prefs_.minTimeBeforeDucking-prefs_.audioNotifierDelay;var timeSinceAudibleBecameFalse=(now.getTime()-getLastSilentOrPaused(tabId).getTime())/1000+prefs_.audioNotifierDelay;setState(tabId,'_timeSinceAudibleBecameFalse',timeSinceAudibleBecameFalse);if(prevAudibleDuration<unduckWait-prefs_.audioNotifierDelay||prevAudibleDuration<duckWait)countDown=0;// If it isn't audible long, then unduck after we know it isn't audible anymore (i.e. two seconds)
else countDown=unduckWait-timeSinceAudibleBecameFalse;if(logTypeEnabled_.duckingReasoning){console.log(tabId,'reason: ducking timeout prefs');console.log(tabId,'countdown nums',countDown,unduckWait,timeSinceAudibleBecameFalse,getLastSilentOrPaused(tabId).getTime()/1000);}return countDown;};// Returns duration in seconds
// If a previous sound was longer than the current one, it returns the length of that.
var getPrevAudibleDuration=function getPrevAudibleDuration(tabId){var lastAudibleOrPlayed=getLastAudibleOrPlayed(tabId);var lastSilentOrPaused=getLastSilentOrPaused(tabId);// console.log(tabId, "getPrevAudibleDuration",  lastSilentOrPaused > lastAudibleOrPlayed, getFullState(tabId));
var prevAudibleDuration=0;// by default, assume there is no sound
// console.log(tabId, "getprevaudibleduration", lastAudibleOrPlayed, lastSilentOrPaused);
if(lastSilentOrPaused>lastAudibleOrPlayed&&lastAudibleOrPlayed.getTime()!==0){//console.log(tabId, "previous sound");
prevAudibleDuration=lastSilentOrPaused.getTime()-lastAudibleOrPlayed.getTime();// previous sound
setState(tabId,'longestPrevDuration',Math.max(getState(tabId,'longestPrevDuration'),prevAudibleDuration));}else if(lastAudibleOrPlayed!==new Date(0)){//console.log(tabId, "ongoing sound");
prevAudibleDuration=new Date().getTime()-lastAudibleOrPlayed.getTime();// ongoing sound
}var longestAudibleDuration=getState(tabId,'longestPrevDuration');prevAudibleDuration=Math.max(longestAudibleDuration,prevAudibleDuration);setState(tabId,'_prevAudibleDuration',prevAudibleDuration);return prevAudibleDuration/1000;};// Waits out short notifications or nonaudible playing tabs for ducking purposes
var audibleTooShort=function audibleTooShort(tabId){// If it ever played and is on the Manual Ducking Controls list, then it will stay unducked until the url is no longer active
var domainIsInList=prefsStore.domainInList(getState(tabId,'domainCached'),prefs_.manualduckinglist);if(getState(tabId,'lastAudibleStart').getTime()&&domainIsInList)return false;// If it is playing, then we require it made a sound at some point to be
// considered audible for long enough but don't care how long it was audible.
// This lets us ignore silent HTML5 ads, silent vines, etc.
// Otherwise, compare duration of most recent sound with the user's preference
// Note that this behavior is problematic for telegram notifications (it doesn't let us ignore them.)
if(isPlayingOrPlayInProgress(tabId)){if(logTypeEnabled_.duckingReasoning)console.log(tabId,'audibleTooShort1',getState(tabId,'lastAudibleStart')===0);return getState(tabId,'lastAudibleStart').getTime()===0;}var prevAudibleDuration=getPrevAudibleDuration(tabId);if(logTypeEnabled_.duckingReasoning)console.log(tabId,'audibleTooShort2',prevAudibleDuration,prefs_.minTimeBeforeDucking);return prevAudibleDuration<prefs_.minTimeBeforeDucking;};var inaudibleTooLong=function inaudibleTooLong(tabId){// console.log(tabId, "countdown=", getCountdownForUnducking(tabId, false));
return getCountdownForUnducking(tabId,false)<=0;};var wasRecentlyAudible=function wasRecentlyAudible(tabId){var lastAudibleAndUnmutedDelta=new Date().getTime()-getState(tabId,'lastAudibleAndUnmuted').getTime();return lastAudibleAndUnmutedDelta<60*60*1000;// last hour
};// Indicates if we should treat a tab as audible from a ducking perspective.
var maybeAudible=function maybeAudible(tabId){var tooShort=audibleTooShort(tabId);var tooLong=inaudibleTooLong(tabId);setState(tabId,'_audibleTooShortCached',tooShort);setState(tabId,'_inaudibleTooLongCached',tooLong);if(logTypeEnabled_.duckingReasoning)console.log(tabId,'maybeAudible',!tooShort,!tooLong);return!tooShort&&!tooLong;};var initMusicDucking=function initMusicDucking(){if(!prefs_.enableDucking&&getFirstDuckedTabId()===null)return;stopMusicDucking();musicDuckingIntervalId_=setInterval(function(){var checkMaybeAudibleAll=getStateForAllTabs('checkMaybeAudible');var shouldUpdateDucking=false;var reason='';checkMaybeAudibleCount_++;checkMaybeAudibleCount_%=1000;// prevent overflow
// console.log("checking maybeaudible", checkMaybeAudibleAll);
var now=new Date();var updateFrequently=false;Object.keys(checkMaybeAudibleAll).forEach(function(tabId){if(checkMaybeAudibleAll[tabId].checkMaybeAudible===null)return;if(checkMaybeAudibleAll[tabId].checkMaybeAudible.updateFrequently)updateFrequently=true;// TODO: remove this block if we allow multiple untils
var until=checkMaybeAudibleAll[tabId].checkMaybeAudible.until;var isDate=until instanceof Date&&!isNaN(until.valueOf());if(!isDate){console.error(tabId,'not a date',until);}if(now.getTime()>until.getTime()||!isDate){setState(tabId,'checkMaybeAudible',getDefaultState('checkMaybeAudible'));updateDucking(tabId+' - ducking interval over').done();// force it to run once at end (TODO: make code less dependent on this)
}// Remove if expired or not a date
/*      let untilsToRemove = [];      //TODO: allow multiple untils
            let updateDuckingSinceUntilReached = false;
            Object.keys(checkMaybeAudibleAll[tabId].checkMaybeAudible.until).forEach(function(until) {
              let isDate = until instanceof Date && !isNaN(until.valueOf());
              if (!isDate) {
                console.error(tabId, "not a date", until);
                untilsToRemove.push_back(until);
              }
              if ((now.getTime() > until.getTime()) || !isDate) {
                untilsToRemove.push_back(until);
                updateDuckingSinceUntilReached = true;
              }
            });
            if (updateDuckingSinceUntilReached)
              updateDucking(tabId + " - ducking interval over").done(); // Force it to run once at end (TODO: make this not necessary)

            untilsToRemove.forEach(function(until) {
              removeFromArray(checkMaybeAudibleAll[tabId].checkMaybeAudible.until, until);
            });
            if (checkMaybeAudibleAll[tabId].checkMaybeAudible.until.length === 0)
              delete checkMaybeAudibleAll[tabId].checkMaybeAudible;
            */var maybeAudibleResult=maybeAudible(tabId);if(maybeAudibleResult!==checkMaybeAudibleAll[tabId].checkMaybeAudible.maybeAudible||tabId===unduckedTabId_&&maybeAudibleResult===false){var checkMaybeAudible=getState(tabId,'checkMaybeAudible');if(checkMaybeAudible!==null){shouldUpdateDucking=true;reason+=' ['+tabId.toString()+' maybeaudible is '+maybeAudibleResult+']';checkMaybeAudible.maybeAudible=maybeAudibleResult;setState(tabId,'checkMaybeAudible',checkMaybeAudible);}}});if(updateFrequently&&checkMaybeAudibleCount_%5===0){updateDucking('try updating ducking a lot').done();// TODO
}checkMaybeAudibleAll=getStateForAllTabs('checkMaybeAudible');if(Object.keys(checkMaybeAudibleAll).length===0){stopMusicDucking();return;}var promise=shouldUpdateDucking?updateDucking(reason):updateCountdownForUnducked();promise.done();},prefs_.duckingInterval*1000);console.log('ducking interval started');};var stopMusicDucking=function stopMusicDucking(){if(!prefs_.enableDucking&&getFirstDuckedTabId()===null)return;console.log('stopping music ducking interval...');clearInterval(musicDuckingIntervalId_);musicDuckingIntervalId_=0;};// timeToCheck is in seconds; we add an extra second before removing the record to deal with timing issues
var addMaybeAudibleCheck=function addMaybeAudibleCheck(tabId,timeToCheck,updateFrequently){if(tabId===windowManager.getExtensionTabIdSync())return;var until=new Date(new Date().getTime()+(1+timeToCheck)*1000);// Update checkMaybeAudible to include new time
var checkMaybeAudible=getState(tabId,'checkMaybeAudible');/* TODO: multiple untils
    if (!checkMaybeAudible) {
      checkMaybeAudible = { until: [until], maybeAudible: null, updateFrequently: updateFrequently };
    } else {
      checkMaybeAudible.until.push(until);

      console.log(tabId, "checkMaybeAudible updated to", checkMaybeAudible);
      setState(tabId, "checkMaybeAudible", checkMaybeAudible);
    }
*///TODO: multiple untils - remove this block
if(!checkMaybeAudible||until.getTime()>checkMaybeAudible.until.getTime()){//console.log(tabId, "checkMaybeAudible until set to", until, timeToCheck);
setState(tabId,'checkMaybeAudible',{until:until,maybeAudible:null,updateFrequently:updateFrequently});}if(musicDuckingIntervalId_===0)initMusicDucking();};var showDuckingInfoInLog=function showDuckingInfoInLog(reason,showFullInfo){updateDuckingCount_++;if(!showFullInfo){console.log('==== updateducking');}else{console.log('==== updateducking - '+updateDuckingCount_+' - '+reason,{'lastAudibleStart':getStateForAllTabs('lastAudibleStart'),'lastPlayed':getStateForAllTabs('lastPlayed'),'lastUnmuted':getStateForAllTabs('lastUnmuted'),'unduckedTabId_':unduckedTabId_,'unduckedShortTimeTabId_':unduckedShortTimeTabId_,'unduckingOrder_':unduckingOrder_,'tabState_':getFullStateForAllTabs()});}};// Categorize tabs to assist updateDucking (based on what we need to do with it)
var categorizeTabIdsForUpdateDucking=function categorizeTabIdsForUpdateDucking(tabIds){var state={needToUnduck:[],needToDuck:[],needToClearDuck:[],unduckable:[],shortTime:[],ducked:[],other:[]};tabIds.forEach(function(tabId){var category=categorizeTabIdForUpdateDucking(tabId);if(!state.hasOwnProperty(category))state[category]=[];state[category].push(tabId);});//foreach
return state;};var categorizeTabIdForUpdateDucking=function categorizeTabIdForUpdateDucking(tabId){var determineDuckedOrOther=function determineDuckedOrOther(){return getState(tabId,'ducked')?'ducked':'other';};var category="unknown";try{var inManualDuckingList=prefsStore.domainInList(getState(tabId,'domainCached'),prefs_.manualduckinglist);if(getState(tabId,'ducked')&&inManualDuckingList){category='ducked';}else if(!getState(tabId,'lastAudibleStart').getTime()){category=determineDuckedOrOther();}else if(!maybeAudible(tabId)){if(inaudibleTooLong(tabId)){// order between checking toolong and tooshort matters for paused videos
if(getState(tabId,'ducked')){if(!isPausedOrPauseInProgress(tabId)){category='needToClearDuck';}else{category=determineDuckedOrOther();}}else{category=determineDuckedOrOther();}}else if(audibleTooShort(tabId)){if(!getState(tabId,'mutedCached')){category='shorttime';}else{category=determineDuckedOrOther();}}else{console.error(tabId,tabState_[tabId].url,'unexpected possibility');}}else{if(getState(tabId,'mutedCached')){category=determineDuckedOrOther();}else{category='unduckable';}}}catch(ex){console.error(ex);}if(category==='unknown'){category="other";console.error(tabId,'setting category to \'other\' but code should not get here');}return category;};var duckingEffectivelyEnabled=function duckingEffectivelyEnabled(){return!prefs_.disableAutomuting&&!prefs_.privacyMode&&prefs_.enableDucking;};// Show the table if it changed
var logDuckingTabState=function logDuckingTabState(duckingTabState,reason){if(!deepEqual(duckingTabState,prevDuckingTabState_)){prevDuckingTabState_=clone(duckingTabState);if(loggingEnabled_){showDuckingInfoInLog(reason,true);console.table(duckingTabState);}}else{showDuckingInfoInLog(reason,false);}};// When ducking is enabled, there can be at most one tab playing sound at a
// time (although shorter sounds can be played simultaneously) We wait awhile
// before unducking in case the user has encountered a lul in a video or needs
// a little time to switch videos in a playlist.
var updateDucking=function updateDucking(reason){if(!prefs_.enableDucking&&getFirstDuckedTabId()===null)return Q.when(null);var duckingTabState=updateDuckingInternal(reason);// Clear, duck, unduck and update UI
return clearDucked(duckingTabState.needToClearDuck).then(duckTabIds(duckingTabState.needToDuck)).then(unduckTabIds(duckingTabState.needToUnduck)).then(pauseAllUnmutedDucked()).then(muteAllAudiblePausedDucked()).then(updateCountdownForUnducked()).then(updateContextMenus()).then(setFavicon()).then(refreshUi());};// Updates unduckedShortTimeTabId_, unduckedTabId_, unduckingOrder_ and returns a duckingTabState
var updateDuckingInternal=function updateDuckingInternal(reason){var tabIds=getAllTabIds();var duckingTabState=categorizeTabIdsForUpdateDucking(tabIds);var nonBestTabIds=[];if(duckingEffectivelyEnabled()){// Ensure at most one shorttime tab
if(duckingTabState.shortTime.length>1){unduckedShortTimeTabId_=getBestTabIdAndAppendOthers(unduckedShortTimeTabId_,duckingTabState.shortTime,nonBestTabIds);duckingTabState.shortTime=[unduckedShortTimeTabId_];}else{unduckedShortTimeTabId_=-1;}// Find one unducked tabId (if possible and if there aren't any shorttime tabids)
if(duckingTabState.unduckable.length===1){if(duckingTabState.unduckable[0]!==unduckedTabId_){unduckedTabId_=duckingTabState.unduckable[0];console.log(unduckedTabId_,'set as unducked tabid');}}else if(duckingTabState.unduckable.length>1){// Choose one and duck the rest (if needed)
unduckedTabId_=getBestTabIdAndAppendOthers(unduckedTabId_,duckingTabState.unduckable,nonBestTabIds);}else if(duckingTabState.unduckable.length===0){// Choose one ducked
if(duckingTabState.shortTime.length===0){var firstDuckedTabId=getFirstDuckedTabId();if(firstDuckedTabId!==null){// We use unduckingOrder_ instead of duckingTabState.ducked since the latter isn't likely in the right order
unduckedTabId_=firstDuckedTabId;console.log(unduckedTabId_,'Unducking next ducked tab since nothing active.');}}else{if(unduckedShortTimeTabId_!==-1)unduckedTabId_=unduckedShortTimeTabId_;}}if(unduckedTabId_>=0){// Only unduck if necessary
if(getState(unduckedTabId_,'ducked'))duckingTabState.needToUnduck=[unduckedTabId_];}// Prepare to duck non-best tabids that could be ducked
duckingTabState.needToDuck=nonBestTabIds.filter(function(tabId){return!getState(tabId,'ducked')||!getState(tabId,'mutedCached')||getMusicState(tabId,'isPlaying')===true;});}logDuckingTabState(duckingTabState,reason);return duckingTabState;};// This function can be used for tabs where pausing doesn't mean tab
// is muted (perhaps because something else on the tab is playing)
// (so for these tabs, ducking happens in two parts - try to pause, then mute)
// It is important here that we don't needlessly pause videos (when this is done
// a user cannot play it from the page without unmuting it first.)
var muteAllAudiblePausedDucked=function muteAllAudiblePausedDucked(){if(prefs_.disableAutomuting)return Q.when(null);var mutePromises=[];unduckingOrder_.forEach(function(tabId){if(!getState(tabId,'mutedCached')&&getState(tabId,'audibleCached')&&getState(tabId,'ducked')&&getMusicState(tabId,'isPlaying')===false){var delta=(new Date().getTime()-getState(tabId,'lastPaused').getTime())/1000;// assuming that pausing always works; just verify that paused as well.
if(delta>prefs_.audioNotifierDelay+1)mutePromises.push(updateMuted(tabId,true,{shouldUpdateDucking:false},'Muted by music ducking.'));}});return Q.allSettled(mutePromises);};var getBestTabIdAndAppendOthers=function getBestTabIdAndAppendOthers(currentTabId,tabIds,othersArray){if(tabIds.length===0){return currentTabId;}var bestTabId=void 0;var bestIndex=void 0;var bestDict={};if(tabIds.indexOf(currentTabId)===-1){bestTabId=tabIds[0];}else{bestTabId=currentTabId;}bestIndex=unduckingOrder_.indexOf(bestTabId);tabIds.forEach(function(tabId){var index=unduckingOrder_.indexOf(tabId);bestDict[tabId]=index;if(index>=0&&index<bestIndex){bestIndex=index;bestTabId=tabId;}});var filter=tabIds.filter(function(tabId){return tabId!==bestTabId;});filter.forEach(function(tabId){addToArray(othersArray,tabId);});console.log('Calc best unduck tab: ',bestTabId,othersArray,bestDict);return bestTabId;};// This happens because a ducked tab has been silent/nonplaying for awhile
var clearDucked=function clearDucked(tabIdsToClear){var unmutePromises=[];tabIdsToClear.forEach(function(tabId){setState(tabId,'ducked',false);unmutePromises.push(updateMuted(tabId,false,{shouldUpdateDucking:false},'Unmuted while unducking since silent for awhile.'));});return Q.allSettled(unmutePromises);};function updateCountdownForUnducked(){return Q.when(null).then(function(){duckingCountDown_=getCountdownForUnducking(unduckedTabId_,false);refreshUiCountDown();return Q.when(null);});}// Ducked tabs that are playing should be paused
var pauseAllUnmutedDucked=function pauseAllUnmutedDucked(){if(prefs_.disableAutomuting)return Q.when(null);var injectPromises=[];unduckingOrder_.forEach(function(tabId){if(getState(tabId,'ducked')&&!getState(tabId,'mutedCached'))injectPromises.push(pauseMusic(tabId,'Paused because tab is ducked.'));});return Q.allSettled(injectPromises);};var getFirstDuckedTabId=function getFirstDuckedTabId(){var firstDuckedTabId=null;unduckingOrder_.forEach(function(tabId){if(!firstDuckedTabId&&getState(tabId,'ducked')){firstDuckedTabId=tabId;}});return firstDuckedTabId;};var duckTabIds=function duckTabIds(tabIds){return Q.when(null).then(function(){if(tabIds.length===0)return Q.when(null);console.log('unduckingOrder_',tabIds,unduckingOrder_);var mutePromises=[];var injectPromises=[];tabIds.forEach(function(tabId){var shouldBeDucked=false;if(!isPausedOrPauseInProgress(tabId)){shouldBeDucked=true;injectPromises.push(pauseMusic(tabId,'Paused by music ducking.'));}// We mute it if it never had a player or on the manual ducking list and still audible
// (except we forget it had a player for sites like Facebook in certain situations).
// (If had a player it gets muted via muteAllAudiblePausedDucked.)
var inManualDuckingList=prefsStore.domainInList(getState(tabId,'domainCached'),prefs_.manualduckinglist);var isPlaying=getMusicState(tabId,'isPlaying');var autoplayCountdown=getMusicState(tabId,'autoplayCountdown')||false;if((isPlaying===''||isPlaying===null||inManualDuckingList)&&!getState(tabId,'mutedCached')&&getState(tabId,'audibleCached')){mutePromises.push(updateMuted(tabId,true,{shouldUpdateDucking:false},'Muted by music ducking.'));shouldBeDucked=true;}else if(autoplayCountdown&&!getState(tabId,'mutedCached')){mutePromises.push(updateMuted(tabId,true,{shouldUpdateDucking:false},'Muted by music ducking.'));shouldBeDucked=true;}if(!getState(tabId,'ducked')&&shouldBeDucked){if(unduckingOrder_.indexOf(tabId)===-1){unduckingOrder_.push(tabId);}console.log(tabId,'added to unduckingOrder_',unduckingOrder_);setState(tabId,'ducked',true);}});if(mutePromises.length===0&&injectPromises.length===0)return Q.when(null);return Q.allSettled(injectPromises).then(function(){return Q.allSettled(mutePromises).then(function(){console.log('ducking finished...');});});});};// Restores ducked tabs
var unduckTabIds=function unduckTabIds(tabIds){return Q.when(null).then(function(){if(tabIds.length===0)return Q.when(null);console.log('unduckTabIds',tabIds,unduckingOrder_);var mutePromises=[];var injectPromises=[];tabIds.forEach(function(tabId){if(getState(tabId,'ducked')){console.log(tabId,'no longer ducked');}setState(tabId,'ducked',false);// Remove from unduckingOrder_
var index=unduckingOrder_.indexOf(tabId);if(index>-1){if(!isPlayingOrPlayInProgress(tabId))injectPromises.push(playMusic(tabId,'Played while music unducking.'));mutePromises.push(updateMuted(tabId,false,{shouldUpdateDucking:false},'Unmuted by music unducking.'));}});return Q.allSettled(mutePromises).done(Q.allSettled(injectPromises));});};////////////////////////////////////////////////////////////////////////
// Utility functions
////////////////////////////////////////////////////////////////////////
// This version compares JSON stringify; should work for ducking
// since we construct the objects consistently in the same way.
var deepEqual=function deepEqual(x,y){return JSON.stringify(x)===JSON.stringify(y);};var clone=function clone(obj){return JSON.parse(JSON.stringify(obj));};// Removes a value from an array if found
var removeFromArray=function removeFromArray(array,val){var index=array.indexOf(val);var found=index>-1;if(found)array.splice(index,1);return found;};// Add a value to an array if not already a member
var addToArray=function addToArray(array,val){var index=array.indexOf(val);if(index===-1)array.push(val);};// Get the domain from a url (and return null if an error)
var getDomain=function getDomain(url){try{if(url.indexOf('chrome://')===0)return'chrome://'+new URL(url).hostname+'/';if(url.indexOf('chrome-extension://')===0)return'chrome-extension://'+new URL(url).hostname+'/';return new URL(url).hostname||'';}catch(ex){console.error(ex);return'';}};// Allow toggling logging on/off via console
// from http://stackoverflow.com/questions/1215392/how-to-quickly-and-conveniently-disable-all-console-log-statements-in-my-code
(function(original){console.enableLogging=function(){console.log=original;loggingEnabled_=true;localStorage.enableLogging=true;console.log('Log types enabled:',logTypeEnabled_);};console.disableLogging=function(){console.log=function(){};loggingEnabled_=false;localStorage.enableLogging=false;};logTypeEnabled_={};logTypes_.forEach(function(logType){var logTypeFixedCase=logType.substr(0,1).toUpperCase()+logType.substr(1);logTypeEnabled_[logType]=localStorage['enableLog'+logTypeFixedCase];console['enableLog'+logTypeFixedCase]=function(){localStorage['enableLog'+logTypeFixedCase]=true;logTypeEnabled_[logType]=true;loggingEnabled_=true;localStorage.enableLogging=true;};console['disableLog'+logTypeFixedCase]=function(){localStorage['enableLog'+logTypeFixedCase]=false;logTypeEnabled_[logType]=false;};});})(console.log);////////////////////////////////////////////////////////////////////////
// Load Settings
////////////////////////////////////////////////////////////////////////
var updateMutingOnLoad=function updateMutingOnLoad(){console.log("updatemutingonload");if(prefs_.muteAllTabs){return muteAll(true);}else if(prefs_.muteBackgroundTabs){return muteBackground();}return Q.when(null);};var loadSettings=function loadSettings(){return prefsStore.load().then(function(prefs){prefs_=prefs;return setFavicon().then(afterLoadSettings());});};// Every time after loading settings we:
// -- inject the music controller into applicable tabs
// -- start up ducking if enabled
// -- update context menus
var afterLoadSettings=function afterLoadSettings(){return windowManager.getTabs().then(function(tabs){return afterLoadSettingsFirstTime(tabs).then(function(){console.log('afterLoadSettings tabs',tabs);var injectMusicPromises=tabs.map(function(tab){return Q.fcall(function(){injectMusicApi(tab.id,tab.url,true);});});return Q.allSettled(injectMusicPromises).then(function(){unduckingOrder_=tabs.map(function(tab){return tab.id;});// console.log("afterLoadSetings injectMusic all done");
if(prefs_.enableDucking){updateDucking('settings updated').done();initMusicDucking();}else{stopMusicDucking();}updateContextMenus();console.log('afterLoadSettings done');return Q.when(null);}).catch(function(err){console.error(err);});});});};// If loading for the first time, we do the following:
// -- do a mute all or mute background tabs if that is what the muting behavior is set to
// -- if privacy mode, we store away our current mute state and then mute everything (including music sites)
// -- ensure that mutedCached, audibleCached, lastAudibleStart, and lastAudibleEnd are initialized
var afterLoadSettingsFirstTime=function afterLoadSettingsFirstTime(tabs){if(!isFirstTime_)return Q.when(null);return Q.when(null).then(function(){return updateMutingOnLoad();}).then(function(){isFirstTime_=false;console.log('tabs on load',tabs);tabs.forEach(function(tab){setState(tab.id,'domainCached',getDomain(tab.url));setState(tab.id,'mutedCached',tab.mutedInfo.muted);updateAudible(tab.id,tab.audible,'afterloadsettingsfirsttime');setState(tab.id,'nonPrivateMuteStatus',getState(tab.id,'mutedCached'));setState(tab.id,'url',tab.url);if(getMusicState(tab.id,'isPlaying')===true){console.log(tab.id,'was playing on startup');setState(tab.id,'nonPrivatePlayStatus',getMusicState(tab.id,'isPlaying'));}});var maybePrivacyModePromise=Q.when(null);if(prefs_.privacyMode)maybePrivacyModePromise=muteEverything();return maybePrivacyModePromise;});};////////////////////////////////////////////////////////////////////////
// Test support
////////////////////////////////////////////////////////////////////////
// This creates a set of tabs, closes all other tabs but those and the sender,
// and sets the desired properties
//
// tabs are created in the order specified, followed by any new tabs.
// if testsUrlsInIncognito is set, the same urls will also be opened in incognito after that.
var setupTestScenario=function setupTestScenario(senderTabId,senderWindowId,setupConfig){console.log('setupTestScenario',setupConfig);var i=void 0;var maybeLaunchIncognitoWindow=Q.when(null);if(setupConfig.testUrlsInIncognito||false){maybeLaunchIncognitoWindow=windowManager.createWindow({incognito:true});}return maybeLaunchIncognitoWindow.then(function(incognitoWindow){var createdTabIds=[];var createdTabIdDict={};var createTabPromises=setupConfig.urls.map(function(url){return windowManager.createTab({url:url,windowId:senderWindowId});});if(setupConfig.hasOwnProperty('newTabCount')){for(i=0;i<setupConfig.newTabCount;i++){createTabPromises.push(new windowManager.createTab({windowId:senderWindowId}));}}if(setupConfig.testUrlsInIncognito||false){var createTabIncognitoPromises=setupConfig.urls.map(function(url){return windowManager.createTab({url:url,windowId:incognitoWindow.id});});createTabPromises=createTabPromises.concat(createTabIncognitoPromises);for(i=0;i<setupConfig.newTabCount;i++){createTabPromises.push(new windowManager.createTab({windowId:incognitoWindow.id}));}}return Q.all(createTabPromises).then(function(tabs){console.log(tabs);tabs.forEach(function(tabInfo){createdTabIds.push(tabInfo.id);createdTabIdDict[tabInfo.id]=true;});return windowManager.getTabs().then(function(tabs){console.log('windowManager.getTabs',tabs);var filtered=tabs.filter(function(tab){return!(createdTabIdDict.hasOwnProperty(tab.id)||tab.id===senderTabId);});var tabIdsToClose=filtered.map(function(tab){return tab.id;});console.log('tabIdsToClose',tabIdsToClose);return chromeMisc.removeTabIds(tabIdsToClose).then(function(){var setupInfo={tabIds:createdTabIds,senderTabId:senderTabId};if(setupConfig.skipSwitchBackToTest||false)return Q.when(setupInfo);return windowManager.switchToTab(senderTabId).then(function(){console.log('setupInfo',setupInfo);return Q.when(setupInfo);}).catch(function(error){console.error('ERROR!',error);return Q.when(null);});});});});});};// This is separated out from setupTestScenario to give time for onCreated and onUpdated events to settle
// Supports audible, playing, and muted right now (and playing_cheat_timestamps).
var setPropertiesMultiple=function setPropertiesMultiple(tabIds,properties){return Q.fcall(function(){var now=new Date();var count=void 0,index=void 0;var setPropertiesPromises=[];console.log('properties',properties);if(properties.audible===true){console.log('GOING TO UPDATE AUDIBLE');count=tabIds.length;index=0;tabIds.forEach(function(tabId){updateAudible(tabId,true,'test');setState(tabId,'lastAudibleStart',new Date(now.getTime()-(prefs_.minTimeBeforeDucking+count+tabIds.length-index)*1000));console.log(tabId,'setuppropertiesmultiple(audible)',getState(tabId,'lastAudibleStart'));if(getState(tabId,'lastUnmuted'))setState(tabId,'lastUnmuted',getState(tabId,'lastAudibleStart'));index++;});}// This works similar to how we update audible in that we do the actual work and then cheat
// with the internal timestamps we track.  It is a little different, though, in that getting
// the action to work here is async (one must wait for the contentscripts to perform the action).
// Thus, one should call this with playing: true and a few seconds later call it with playing_cheat_timestamps: true.
if(properties.playing_cheat_timestamps===true){console.log('GOING TO UPDATE PLAYING TIMESTAMPS');count=tabIds.length;index=0;tabIds.forEach(function(tabId){setState(tabId,'lastPlayed',new Date(now.getTime()-(prefs_.minTimeBeforeDucking+count+tabIds.length-index)*1000));setState(tabId,'lastAudibleStart',getState(tabId,'lastPlayed'));// match it up
if(getState(tabId,'lastUnmuted',false)){setState(tabId,'lastUnmuted',getState(tabId,'lastAudibleStart'));}index++;});}tabIds.forEach(function(tabId){if(properties.muted||false)setPropertiesPromises.push(updateMuted(tabId,true,{},'Muted as part of testing scenario.'));if(properties.isPlaying||false)// Be sure to follow up later with playing_cheat_timestamps: true.
setPropertiesPromises.push(playMusic(tabId,'Played as a part of test setup.'));});return Q.all(setPropertiesPromises);});};////////////////////////////////////////////////////////////////////////
// Run on startup
////////////////////////////////////////////////////////////////////////
if(localStorage.enableLogging==='true'||false){loggingEnabled_=true;console.log('Log types enabled:',logTypeEnabled_);}else{console.disableLogging();}windowManager.init().then(loadSettings()).then(function(){chrome.tabs.onCreated.addListener(onCreated);chrome.tabs.onActivated.addListener(onActivated);chrome.tabs.onReplaced.addListener(onReplaced);chrome.tabs.onUpdated.addListener(onUpdated);chrome.tabs.onRemoved.addListener(onRemoved);chrome.runtime.onMessage.addListener(onMessage);chrome.commands.onCommand.addListener(onCommand);chrome.contextMenus.onClicked.addListener(onContextMenuClicked);// chrome.tabCapture.onStatusChanged.addListener(onCaptured); // This doesn't work for tabs captured by other extensions
}).catch(function(err){console.error(err);}).done();

},{"./background/chrome_misc":4,"./background/music_controllers":5,"./background/window_manager":6,"./prefs_store":7,"q":2}],4:[function(require,module,exports){
"use strict";

var util = require("../util");

module.exports = function (chrome) {
  return {
    setMuted: function setMuted(tabId, muted) {
      return util.pcall(chrome.tabs.update.bind(chrome.tabs), tabId, { muted: muted });
    },

    createNotification: function createNotification(id, dict) {
      return util.pcall(chrome.notifications.create.bind(chrome.notifications), id, dict);
    },

    getFromSyncStorage: function getFromSyncStorage(keysDict) {
      return util.pcall(chrome.storage.sync.get.bind(chrome.storage.sync), keysDict);
    },

    setSyncStorage: function setSyncStorage(keysDict) {
      return util.pcall(chrome.storage.sync.set.bind(chrome.storage.sync), keysDict);
    },

    executeScript: function executeScript(tabId, dict) {
      return util.pcall(chrome.tabs.executeScript.bind(chrome.tabs), tabId, dict);
    },

    tabsSendMessage: function tabsSendMessage(tabId, message, options) {
      // console.log(tabId, "tabsSendMessage", message, options);
      return util.pcall(chrome.tabs.sendMessage.bind(chrome.tabs), tabId, message, options);
    },

    setBrowserActionIcon: function setBrowserActionIcon(options) {
      return util.pcall(chrome.browserAction.setIcon.bind(chrome.browserAction), options);
    },

    removeTabIds: function removeTabIds(tabIds) {
      return util.pcall(chrome.tabs.remove.bind(chrome.tabs), tabIds);
    },

    contextMenusRemoveAll: function contextMenusRemoveAll() {
      return util.pcall(chrome.contextMenus.removeAll.bind(chrome.contextMenus));
    },

    // updates a tab object to include a muted_info if there isn't already one
    ensureMutedInfo: function ensureMutedInfo(tab) {
      if (typeof tab === "undefined" || tab === null) return;
      if (!tab.hasOwnProperty("mutedInfo") && tab.hasOwnProperty("mutedCause")) {
        tab.mutedInfo = {};
        tab.mutedInfo.muted = tab.muted || false;
        var reasons = ["capture", "user", ""];
        if (reasons.indexOf(tab.mutedCause) >= 0) {
          tab.mutedInfo.reason = tab.mutedCause;
        } else {
          tab.mutedInfo.reason = "extension";
          tab.mutedInfo.extensionId = tab.mutedCause || "";
        }
      }
    }
  };
};

},{"../util":8}],5:[function(require,module,exports){
"use strict";

// Music controllers (and some of infrastructure code) comes from Streamkeys (https://github.com/berrberr/streamkeys)
// I've simplified the matching logic to just look for the same domain (which seems to usually be okay (except for Amazon music)

module.exports = function () {
  var sites_ = {};

  // Get the domain from a url (and return null if an error)
  var getDomain = function getDomain(url) {
    try {
      if (url.indexOf("chrome://") === 0) return "chrome://" + new URL(url).hostname + "/";
      return new URL(url).hostname || null;
    } catch (ex) {
      console.error(ex);
      return null;
    }
  };

  /**
   * @return {RegExp} a regex that matches where the string is in a url's (domain) name
   */
  var urlCheck = function urlCheck(domain, alias) {
    var inner = alias ? domain + "|www." + domain + "|" + alias.join("|") : domain + "|www." + domain;
    return new RegExp("^(http|https):\/\/(?:[^.]*\\.){0,3}(?:" + inner + ")+\\.");
  };

  var getSites = function getSites() {
    // from build/unpacked-dev/js/modules/Sitelist.js in Streamkeys; but change this.sites into return
    return {
      "7digital": { name: "7digital", url: "http://www.7digital.com" },
      "8tracks": { name: "8tracks", url: "http://www.8tracks.com" },
      "amazon": { name: "Amazon Cloud Player", url: "https://www.amazon.com/gp/dmusic/cloudplayer/player" },
      "ambientsleepingpill": { name: "Ambient Sleeping Pill", url: "http://www.ambientsleepingpill.com" },
      "asoftmurmur": { name: "A Soft Murmur", url: "http://www.asoftmurmur.com" },
      "audible": { name: "Audible", url: "http://www.audible.com" },
      "audiosplitter": { name: "Audiosplitter", url: "http://www.audiosplitter.fm" },
      "bandcamp": { name: "Bandcamp", url: "http://www.bandcamp.com" },
      "bbc": { name: "BBC Radio", url: "http://www.bbc.co.uk/radio", controller: "BBCRadioController.js" },
      "beatsmusic": { name: "Beats Web Player", url: "https://listen.beatsmusic.com" },
      "beatport": { name: "Beatport", url: "https://www.beatport.com" },
      "beta.last": { name: "LastFm", url: "http://beta.last.fm", controller: "BetaLastfmController.js" },
      "blitzr": { name: "Blitzr", url: "http://www.blitzr.com" },
      "bop": { name: "Bop.fm", url: "http://bop.fm" },
      "cubic": { name: "Cubic.fm", url: "http://www.cubic.fm" },
      "deezer": { name: "Deezer", url: "http://www.deezer.com" },
      "demodrop": { name: "DemoDrop", url: "http://www.demodrop.com" },
      "di": { name: "Di.fm", url: "http://www.di.fm" },
      "disco": { name: "Disco.io", url: "http://www.disco.io" },
      "earbits": { name: "Earbits", url: "http://www.earbits.com" },
      "player.edge": { name: "Edge Player", url: "http://player.edge.ca", controller: "EdgeController.js" },
      "emby": { name: "Emby", url: "http://app.emby.media" },
      "gaana": { name: "Gaana", url: "http://www.gaana.com" },
      "guvera": { name: "Guvera", url: "https://www.guvera.com" },
      "play.google": { name: "Google Play Music", url: "http://play.google.com", controller: "GoogleMusicController.js" },
      "grooveshark": { name: "Grooveshark", url: "http://www.grooveshark.com" },
      "hypem": { name: "Hypemachine", url: "http://www.hypem.com" },
      "hypster": { name: "Hypster", url: "http://www.hypster.com" },
      "iheart": { name: "iHeartRadio", url: "http://www.iheart.com" },
      "ivoox": { name: "ivoox", url: "http://www.ivoox.com" },
      "jango": { name: "Jango", url: "http://www.jango.com" },
      "kollekt": { name: "Kollekt.fm", url: "http://www.kollekt.fm" },
      "laracasts": { name: "Laracasts", url: "http://www.laracasts.com" },
      "last": { name: "LastFm", url: "http://www.last.fm", controller: "LastfmController.js", alias: ["lastfm"], blacklist: ["beta.last.fm"] },
      "mixcloud": { name: "Mixcloud", url: "http://www.mixcloud.com" },
      "mycloudplayers": { name: "My Cloud Player", url: "http://www.mycloudplayers.com" },
      "myspace": { name: "MySpace", url: "http://www.myspace.com" },
      "netflix": { name: "Netflix", url: "http://www.netflix.com" },
      "noise": { name: "NoiseSupply", url: "http://noise.supply", controller: "NoiseSupplyController.js" },
      "npr": { name: "NPR One Player", url: "http://one.npr.org" },
      "oplayer": { name: "oPlayer", url: "http://oplayer.org" },
      "palcomp3": { name: "Palco MP3", url: "http://palcomp3.com" },
      "pandora": { name: "Pandora", url: "http://www.pandora.com" },
      "player.fm": { name: "Player.fm", url: "http://player.fm", controller: "PlayerController.js" },
      "pleer": { name: "Pleer", url: "http://pleer.com" },
      "plex": { name: "Plex", url: "http://www.plex.tv" },
      "pocketcasts": { name: "Pocketcasts", url: "https://play.pocketcasts.com" },
      "radioparadise": { name: "RadioParadise", url: "http://www.radioparadise.com" },
      "radioswissjazz": { name: "RadioSwissJazz", url: "http://www.radioswissjazz.ch" },
      "rainwave": { name: "Rainwave.cc", url: "http://www.rainwave.cc" },
      "rdio": { name: "Rdio", url: "http://www.rdio.com" },
      "reddit.music.player.il": { name: "Reddit Music Player", url: "http://reddit.music.player.il.ly", controller: "RedditMusicPlayerController.js", alias: ["reddit.musicplayer"] },
      "reverbnation": { name: "Reverb Nation", url: "http://www.reverbnation.com" },
      "saavn": { name: "Saavn", url: "http://www.saavn.com" },
      "seesu": { name: "Seesu.me", url: "http://www.seesu.me" },
      "shortorange": { name: "ShortOrange", url: "http://www.shortorange.com" },
      "shuffler": { name: "Shuffler.fm", url: "http://www.shuffler.fm" },
      "slacker": { name: "Slacker", url: "http://www.slacker.com" },
      "songstr": { name: "Songstr", url: "http://www.songstr.com" },
      "songza": { name: "Songza", url: "http://www.songza.com" },
      "music.sonyentertainmentnetwork": { name: "Sony Music Unlimited", url: "https://music.sonyentertainmentnetwork.com", controller: "SonyMusicUnlimitedController.js" },
      "sound": { name: "Sound.is", url: "http://www.sound.is" },
      "soundcloud": { name: "Soundcloud", url: "http://www.soundcloud.com" },
      "soundsgood": { name: "Soundsgood.co", url: "http://www.soundsgood.co" },
      "spotify": { name: "Spotify Web Player", url: "http://www.spotify.com" },
      "spreaker": { name: "Spreaker", url: "http://www.spreaker.com" },
      "stitcher": { name: "Stitcher", url: "http://www.stitcher.com" },
      "tidal": { name: "Tidal", url: "https://www.tidal.com", alias: ["tidalhifi"] },
      "thedrop": { name: "TheDrop", url: "https://www.thedrop.club" },
      "thesixtyone": { name: "TheSixtyOne", url: "http://www.thesixtyone.com" },
      "tunein": { name: "TuneIn", url: "http://www.tunein.com" },
      "twitch": { name: "Twitch.tv", url: "http://www.twitch.tv" },
      "vk": { name: "Vkontakte", url: "http://www.vk.com" },
      "xbox": { name: "Xbox Music", url: "http://music.xbox.com" },
      "music.yandex": { name: "Yandex", url: "http://music.yandex.ru", controller: "YandexController.js" },
      "radio.yandex": { name: "Yandex Radio", url: "http://radio.yandex.ru", controller: "YandexRadioController.js" },
      "youarelistening": { name: "YouAreListening.to", url: "http://www.youarelistening.to", controller: "YouarelisteningtoController.js" },
      "youtube": { name: "YouTube", url: "http://www.youtube.com" },
      "zonga": { name: "Zonga", url: "http://asculta.zonga.ro", controller: "ZongaController.js" }
    };
  };

  var initLookupDone_ = false;

  var initLookup = function initLookup() {
    if (initLookupDone_) return;
    sites_ = getSites();
    var keys = Object.keys(sites_);
    var defaultMusicListObj = {};
    keys.forEach(function (key) {
      sites_[key].urlRegex = new urlCheck(key, sites_[key].alias);
      var domain = getDomain(sites_[key].url);
      defaultMusicListObj[domain] = true;
    });

    // Enable the following line to get JSON of a list of music URLS that can be copied into defaults
    //console.log(JSON.stringify(defaultMusicListObj));
    initLookupDone_ = true;
  };

  return {
    getController: function getController(url) {
      try {
        initLookup();

        var keys = Object.keys(sites_);
        var filteredSites = keys.filter(function (name) {
          return sites_[name].urlRegex.test(url);
        });

        if (!filteredSites.length) return null;
        var site = sites_[filteredSites[0]];
        if (site.controller) return site.controller;

        return filteredSites[0][0].toUpperCase() + filteredSites[0].slice(1) + "Controller.js";
      } catch (ex) {
        console.error(ex);
        return null;
      }
    }
  };
};

},{}],6:[function(require,module,exports){
"use strict";

var Q = require("q");
var util = require("../util");
var chromeMisc = require("./chrome_misc")(chrome);

module.exports = function (chrome) {
  var extensionTabId_ = null;
  var extensionWindowId_ = null;
  var lastWindowId_ = null;
  var lastTabId_ = null;

  return {
    getTabInfo: function getTabInfo(tabId) {
      return tabId === null ? null : util.pcall(chrome.tabs.get, tabId);
    },

    getLastFocusedWindow: function getLastFocusedWindow() {
      return util.pcall(chrome.windows.getLastFocused);
    },

    // Get the active tab from the active window
    getCurrentTab: function getCurrentTab() {
      var self = this;
      var options = { "active": true };
      return util.pcall(chrome.tabs.query, options).then(function (activeTabs) {
        return self.getLastFocusedWindow().then(function (lastFocusedWindow) {
          //console.log("getCurrentTab - 3");
          //console.log("currentwindowid", currentWindow.id);
          //console.log("activetabs", activeTabs);
          var activeTabForActiveWindow = null;
          activeTabs.forEach(function (activeTab) {
            if (activeTab.windowId === lastFocusedWindow.id) activeTabForActiveWindow = activeTab;
          });
          if (activeTabForActiveWindow === null && activeTabs.length) {
            activeTabForActiveWindow = activeTabs[0];
          }
          chromeMisc.ensureMutedInfo(activeTabForActiveWindow);
          //console.log("activetabforactivewindow", activeTabForActiveWindow);
          return Q.when(activeTabForActiveWindow);
        });
      }).catch(function (error) {
        console.error(error);
      });
    },

    getExtensionWindowId: function getExtensionWindowId() {
      return Q.when(extensionWindowId_);
    },
    getExtensionWindowIdSync: function getExtensionWindowIdSync() {
      return extensionWindowId_;
    },
    setExtensionWindowId: function setExtensionWindowId(id) {
      extensionWindowId_ = id;
      return Q.when(extensionWindowId_);
    },

    getExtensionTabId: function getExtensionTabId() {
      return Q.when(extensionTabId_);
    },
    getExtensionTabIdSync: function getExtensionTabIdSync() {
      return extensionTabId_;
    },
    setExtensionTabId: function setExtensionTabId(id) {
      extensionTabId_ = id;
      return Q.when(id);
    },

    getLastTabId: function getLastTabId() {
      return Q.when(lastTabId_);
    },
    getLastTabIdSync: function getLastTabIdSync() {
      return lastTabId_;
    },
    setLastTabId: function setLastTabId(id) {
      lastTabId_ = id;
      return Q.when(lastTabId_);
    },

    getLastWindowId: function getLastWindowId() {
      return Q.when(lastWindowId_);
    },
    getLastWindowIdSync: function getLastWindowIdSync() {
      return lastWindowId_;
    },
    setLastWindowId: function setLastWindowId(id) {
      lastWindowId_ = id;
      return Q.when(lastWindowId_);
    },

    showExtensionUi: function showExtensionUi(width, height, left, top) {
      var opts = {
        width: width,
        height: height,
        left: left,
        top: top,
        url: chrome.runtime.getURL("build/html/popup.html"),
        focused: true,
        type: "popup"
      };

      return util.pcall(chrome.windows.create.bind(chrome.windows), opts).then(function (extensionWindow) {
        return this.setExtensionWindowId(extensionWindow.id).then(this.setExtensionTabId(extensionWindow.tabs[0].id));
      }.bind(this));
    },

    createTab: function createTab(properties) {
      return util.pcall(chrome.tabs.create.bind(chrome.tabs), properties);
    },

    createTabs: function createTabs(urls) {
      var promises = [];
      var self = this;
      urls.forEach(function (url) {
        promises.push(self.createTab({ url: url }));
      });
      return Q.all(promises);
    },

    createWindow: function createWindow(properties) {
      return util.pcall(chrome.windows.create.bind(chrome.windows), properties);
    },

    getTabs: function getTabs() {
      return util.pcall(chrome.tabs.query.bind(chrome.tabs), {});
    },

    openUrl: function openUrl(url) {
      return util.pcall(chrome.tabs.create.bind(chrome.tabs), { url: url });
    },

    changeUrl: function changeUrl(tabId, url) {
      if (url.indexOf("chrome-extension://") !== -1) return Q.when(null);
      return util.pcall(chrome.tabs.update.bind(chrome.tabs), tabId, { url: url });
    },

    changeAllUrls: function changeAllUrls() {
      console.log("changeallurls");
      var self = this;
      return this.getTabs().then(function (tabs) {
        var promises = [];
        tabs.forEach(function (tab) {
          promises.push(self.changeUrl(tab.id, tab.url + "/urlchangetest"));
        });
        return Q.allSettled(promises);
      });
    },

    queryTabs: function queryTabs(senderTabId, showAudibleOnly, recentTabs, lastWindowId) {
      var options = {};
      if (showAudibleOnly) options.audible = true;
      return util.pcall(chrome.tabs.query, options).then(function (tabs) {
        tabs = tabs.filter(function (tab) {
          return tab.id != senderTabId;
        });
        tabs.forEach(function (tab) {
          chromeMisc.ensureMutedInfo(tab);
        });
        var results = { tabs: tabs };
        if (!(recentTabs === null && lastWindowId === null)) {
          var temp = recentTabs[lastWindowId] || [];
          results = {
            tabs: tabs,
            lastActive: temp[temp.length - 1] || null
          };
        }
        return results;
      });
    },

    switchToTab: function switchToTab(tabId) {
      console.log(tabId, "switchtotab");
      var self = this;
      return this.updateTab(tabId, { active: true }).then(this.getTabInfo(tabId)).then(function (tab) {
        return !tab ? Q.when(null) : self.updateWindow(tab.windowId, { focused: true });
      });
    },

    // This function is used to ensure that a set of tabids are all visited to allow the players to load;
    // the order doesn't matter. Used by tests.
    switchToTabs: function switchToTabs(tabIds) {
      var self = this;
      return tabIds.reduce(function (previous, tabId) {
        return previous.then(function () {
          return self.switchToTab(tabId);
        });
      }, Q());
    },

    closeTab: function closeTab(tabId) {
      return util.pcall(chrome.tabs.remove.bind(chrome.tabs), tabId);
    },

    updateTab: function updateTab(tabId, updateProperties) {
      // console.log("updateTab", tabId, updateProperties);
      return util.pcall(chrome.tabs.update.bind(chrome.tabs), tabId, updateProperties);
    },

    updateWindow: function updateWindow(windowId, updateProperties) {
      //console.log("updateWindow", windowId, updateProperties);
      return util.pcall(chrome.windows.update.bind(chrome.windows), windowId, updateProperties);
    },

    // Initialize the last windowid and tabid
    init: function init() {
      var self = this;
      return this.getCurrentTab().then(function (tabInfo) {
        self.setLastTabId(tabInfo.id);
        self.setLastWindowId(tabInfo.windowId);

        return Q.when(null);
      });
    }
  };
};

},{"../util":8,"./chrome_misc":4,"q":2}],7:[function(require,module,exports){
"use strict";

var Q = require("q");
var util = require("./util");

var hideDucking_ = false;

module.exports = function (chrome) {
  var prefsWhiteListDefaults_ = { "facebook.com": true };
  var prefsBlackListDefaults_ = { "chezpanisse.com": true };
  var prefsManualDuckingListDefaults_ = { "abcnews.go.com": true, "espn.go.com": true, "cnn.com": true, "pandora.com": true };

  // generated from music_controllers.js (copy from background page console)
  // let prefsMusicListDefaults_ = {"www.7digital.com": true,"www.8tracks.com": true,"www.amazon.com": true,"www.ambientsleepingpill.com": true,"www.asoftmurmur.com": true,"www.audible.com": true,"www.audiosplitter.fm": true,"www.bandcamp.com": true,"www.bbc.co.uk": true,"listen.beatsmusic.com": true,"www.beatport.com": true,"beta.last.fm": true,"www.blitzr.com": true,"bop.fm": true,"www.cubic.fm": true,"www.deezer.com": true,"www.demodrop.com": true,"www.di.fm": true,"www.disco.io": true,"www.earbits.com": true,"player.edge.ca": true,"app.emby.media": true,"www.gaana.com": true,"www.guvera.com": true,"play.google.com": true,"www.grooveshark.com": true,"www.hypem.com": true,"www.hypster.com": true,"www.iheart.com": true,"www.ivoox.com": true,"www.jango.com": true,"www.kollekt.fm": true,"www.laracasts.com": true,"www.last.fm": true,"www.mixcloud.com": true,"www.mycloudplayers.com": true,"www.myspace.com": true,"www.netflix.com": true,"noise.supply": true,"one.npr.org": true,"oplayer.org": true,"palcomp3.com": true,"www.pandora.com": true,"player.fm": true,"pleer.com": true,"www.plex.tv": true,"play.pocketcasts.com": true,"www.radioparadise.com": true,"www.radioswissjazz.ch": true,"www.rainwave.cc": true,"www.rdio.com": true,"reddit.music.player.il.ly": true,"www.reverbnation.com": true,"www.saavn.com": true,"www.seesu.me": true,"www.shortorange.com": true,"www.shuffler.fm": true,"www.slacker.com": true,"www.songstr.com": true,"www.songza.com": true,"music.sonyentertainmentnetwork.com": true,"www.sound.is": true,"www.soundcloud.com": true,"www.soundsgood.co": true,"www.spotify.com": true,"www.spreaker.com": true,"www.stitcher.com": true,"www.tidal.com": true,"www.thedrop.club": true,"www.thesixtyone.com": true,"www.tunein.com": true,"www.twitch.tv": true,"www.vk.com": true,"music.xbox.com": true,"music.yandex.ru": true,"radio.yandex.ru": true,"www.youarelistening.to": true,"www.youtube.com": true,"asculta.zonga.ro": true};
  var prefsMusicListDefaults_ = { "pandora.com": true };

  return {
    load: function load() {
      var defaults = this.getDefaults();
      defaults.whitelist = "(unknown)";
      defaults.blacklist = "(unknown)";
      defaults.musiclist = "(unknown)";
      defaults.manualduckinglist = "(unknown)";

      return util.pcall(chrome.storage.sync.get.bind(chrome.storage.sync), defaults).then(function (prefs) {
        if (prefs.whitelist === "(unknown)") prefs.whitelist = prefsWhiteListDefaults_;
        if (prefs.blacklist === "(unknown)") prefs.blacklist = prefsBlackListDefaults_;
        if (prefs.musiclist === "(unknown)") prefs.musiclist = prefsMusicListDefaults_;
        if (prefs.manualduckinglist === "(unknown)") prefs.manualduckinglist = prefsManualDuckingListDefaults_;

        console.log("prefs_store", prefs);
        // Force these values when reading prefs (can only get changed temporarily by tests)
        prefs.duckingInterval = 0.1; // in seconds. This and next param set so that constants can easily be changed in tests
        prefs.audioNotifierDelay = 2; // in seconds

        if (prefs.minTimeBeforeDucking !== 0 && prefs.minTimeBeforeDucking < 2) {
          // Set to defaults since invalid value was set (likely because of test code)
          prefs.minTimeBeforeDucking = 3.5;
          prefs.minTimeBeforeUnducking = 5;
          prefs.minTimeBeforeUnduckingPaused = 3;
        }

        if ((prefs.disablePlayPause || null) === null) prefs.disablePlayPause = true;

        // Ensure that only one of these muting preferences is set.
        if (prefs.muteAllTabs) {
          prefs.muteOtherTabs = false;
          prefs.unmuteAllTabs = false;
        } else if (prefs.muteOtherTabs) {
          prefs.unmuteAllTabs = false;
        }

        // might get turned on from tests but turn it off on load
        prefs.showOtherTabs = false;

        if (hideDucking_) prefs.enableDucking = false;

        return Q.when(prefs);
      });
    },

    save: function save(prefs) {
      console.log("save prefs", prefs);
      return util.pcall(chrome.storage.sync.set.bind(chrome.storage.sync), prefs);
    },

    getDefaults: function getDefaults() {
      // console.log("getdefaults!");
      var keysDict = {};
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
      keysDict.blacklist = JSON.parse(JSON.stringify(prefsBlackListDefaults_));
      keysDict.whitelist = JSON.parse(JSON.stringify(prefsWhiteListDefaults_));
      keysDict.musiclist = JSON.parse(JSON.stringify(prefsMusicListDefaults_));
      keysDict.manualduckinglist = JSON.parse(JSON.stringify(prefsManualDuckingListDefaults_));
      keysDict.duckingInterval = 0.1; // in seconds. This and next param set so that constants can easily be changed in tests
      keysDict.audioNotifierDelay = 2; // in seconds
      keysDict.disablePlayPause = true;

      // hidden options: used to determine behavior if a tab is playing sound for a longer time; set longSoundDuration to 0 to disable behavior
      keysDict.longSoundDuration = 0;
      keysDict.longCountDown = 0;

      if (hideDucking_) keysDict.enableDucking = false;

      console.log(keysDict);
      return keysDict;
    },

    updateListAndSave: function updateListAndSave(prefs, listType, domain) {
      console.log("updateListAndSave", listType, domain);
      if (listType === "neither") {
        delete prefs.blacklist[domain];
        delete prefs.whitelist[domain];
      } else if (listType === "notmusic") {
        delete prefs.musiclist[domain];
      } else if (listType === "notmanualduckinglist") {
        delete prefs.manualduckinglist[domain];
      } else {
        var list = prefs[listType + "list"];
        if (list === null) {
          console.error("could not find list: '" + listType + "list'");
          return Q.when(null);
        }

        list[domain] = true;
        if (listType === "black") delete prefs.whitelist[domain];else if (listType === "white") delete prefs.blacklist[domain];

        prefs[listType + "list"] = list;
      }

      return this.save(prefs);
    },

    getDomainRuleForDomainInList: function getDomainRuleForDomainInList(domain, list) {
      // console.log("getDomainRuleForDomainInList", domain, list);
      var temp = domain;
      while (!list.hasOwnProperty(temp)) {
        //console.log("looking at list for domain " + temp);

        var nextDotPos = temp.indexOf(".");
        if (nextDotPos >= 0 && nextDotPos < domain.length) {
          temp = temp.substring(nextDotPos + 1);
        } else {
          return null;
        }
      }
      return temp;
    },

    // Returns whether the domain for the url is within the list
    domainInList: function domainInList(domain, list) {
      if (domain === null) return false;

      var domainRule = this.getDomainRuleForDomainInList(domain, list);
      // console.log("domaininlist", domain, list, domainRule);
      return domainRule !== null;
    }
  };
};

},{"./util":8,"q":2}],8:[function(require,module,exports){
"use strict";

var Q = require("q");

module.exports = {
  // `pcall` takes a function that takes a set of arguments and
  // a callback (NON-Node.js style) and turns it into a promise
  // that gets resolved with the arguments to the callback.
  pcall: function pcall(fn) {
    var deferred = Q.defer();
    var callback = function callback() {
      deferred.resolve(Array.prototype.slice.call(arguments)[0]);
      var lastError = chrome.runtime.lastError;
      if (lastError && lastError.message) {
        console.log("pcall message: " + lastError.message);
      }
    };
    var newArgs = Array.prototype.slice.call(arguments, 1);
    newArgs.push(callback);
    fn.apply(null, newArgs);
    return deferred.promise;
  }
};

},{"q":2}]},{},[3]);
