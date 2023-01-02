

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// See https://caniuse.com/mdn-javascript_builtins_object_assign

// See https://caniuse.com/mdn-javascript_builtins_bigint64array

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary,
    setWindowTitle;

// Normally we don't log exceptions but instead let them bubble out the top
// level where the embedding environment (e.g. the browser) can handle
// them.
// However under v8 and node we sometimes exit the process direcly in which case
// its up to use us to log the exception before exiting.
// If we fix https://github.com/emscripten-core/emscripten/issues/15080
// this may no longer be needed under node.
function logExceptionOnExit(e) {
  if (e instanceof ExitStatus) return;
  let toLog = e;
  if (e && typeof e == 'object' && e.stack) {
    toLog = [e, e.stack];
  }
  err('exiting due to exception: ' + toLog);
}

if (ENVIRONMENT_IS_NODE) {
  if (typeof process == 'undefined' || !process.release || process.release.name !== 'node') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require('path').dirname(scriptDirectory) + '/';
  } else {
    scriptDirectory = __dirname + '/';
  }

// include: node_shell_read.js


// These modules will usually be used on Node.js. Load them eagerly to avoid
// the complexity of lazy-loading. However, for now we must guard on require()
// actually existing: if the JS is put in a .mjs file (ES6 module) and run on
// node, then we'll detect node as the environment and get here, but require()
// does not exist (since ES6 modules should use |import|). If the code actually
// uses the node filesystem then it will crash, of course, but in the case of
// code that never uses it we don't want to crash here, so the guarding if lets
// such code work properly. See discussion in
// https://github.com/emscripten-core/emscripten/pull/17851
var fs, nodePath;
if (typeof require === 'function') {
  fs = require('fs');
  nodePath = require('path');
}

read_ = (filename, binary) => {
  filename = nodePath['normalize'](filename);
  return fs.readFileSync(filename, binary ? undefined : 'utf8');
};

readBinary = (filename) => {
  var ret = read_(filename, true);
  if (!ret.buffer) {
    ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
};

readAsync = (filename, onload, onerror) => {
  filename = nodePath['normalize'](filename);
  fs.readFile(filename, function(err, data) {
    if (err) onerror(err);
    else onload(data.buffer);
  });
};

// end include: node_shell_read.js
  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/');
  }

  arguments_ = process['argv'].slice(2);

  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  // Without this older versions of node (< v15) will log unhandled rejections
  // but return 0, which is not normally the desired behaviour.  This is
  // not be needed with node v15 and about because it is now the default
  // behaviour:
  // See https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode
  process['on']('unhandledRejection', function(reason) { throw reason; });

  quit_ = (status, toThrow) => {
    if (keepRuntimeAlive()) {
      process['exitCode'] = status;
      throw toThrow;
    }
    logExceptionOnExit(toThrow);
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };

} else
if (ENVIRONMENT_IS_SHELL) {

  if ((typeof process == 'object' && typeof require === 'function') || typeof window == 'object' || typeof importScripts == 'function') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      return read(f);
    };
  }

  readBinary = function readBinary(f) {
    let data;
    if (typeof readbuffer == 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data == 'object');
    return data;
  };

  readAsync = function readAsync(f, onload, onerror) {
    setTimeout(() => onload(readBinary(f)), 0);
  };

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit == 'function') {
    quit_ = (status, toThrow) => {
      logExceptionOnExit(toThrow);
      quit(status);
    };
  }

  if (typeof print != 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console == 'undefined') console = /** @type{!Console} */({});
    console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
    console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr != 'undefined' ? printErr : print);
  }

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }

  if (!(typeof window == 'object' || typeof importScripts == 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {
// include: web_or_worker_shell_read.js


  read_ = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
  }

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = (url, onload, onerror) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  }

// end include: web_or_worker_shell_read.js
  }

  setWindowTitle = (title) => document.title = title;
} else
{
  throw new Error('environment detection error');
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;
checkIncomingModuleAPI();

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];legacyModuleProp('arguments', 'arguments_');

if (Module['thisProgram']) thisProgram = Module['thisProgram'];legacyModuleProp('thisProgram', 'thisProgram');

if (Module['quit']) quit_ = Module['quit'];legacyModuleProp('quit', 'quit_');

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] == 'undefined', 'Module.read option was removed (modify read_ in JS)');
assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify setWindowTitle in JS)');
assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
legacyModuleProp('read', 'read_');
legacyModuleProp('readAsync', 'readAsync');
legacyModuleProp('readBinary', 'readBinary');
legacyModuleProp('setWindowTitle', 'setWindowTitle');
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");




var STACK_ALIGN = 16;
var POINTER_SIZE = 4;

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': case 'u8': return 1;
    case 'i16': case 'u16': return 2;
    case 'i32': case 'u32': return 4;
    case 'i64': case 'u64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length - 1] === '*') {
        return POINTER_SIZE;
      }
      if (type[0] === 'i') {
        const bits = Number(type.substr(1));
        assert(bits % 8 === 0, 'getNativeTypeSize invalid bits ' + bits + ', type ' + type);
        return bits / 8;
      }
      return 0;
    }
  }
}

// include: runtime_debug.js


function legacyModuleProp(prop, newName) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get: function() {
        abort('Module.' + prop + ' has been replaced with plain ' + newName + ' (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)');
      }
    });
  }
}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort('`Module.' + prop + '` was supplied but `' + prop + '` not included in INCOMING_MODULE_JS_API');
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

function missingLibrarySymbol(sym) {
  if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get: function() {
        // Can't `abort()` here because it would break code that does runtime
        // checks.  e.g. `if (typeof SDL === 'undefined')`.
        var msg = '`' + sym + '` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line';
        // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
        // library.js, which means $name for a JS name with no prefix, or name
        // for a JS name like _name.
        var librarySymbol = sym;
        if (!librarySymbol.startsWith('_')) {
          librarySymbol = '$' + sym;
        }
        msg += " (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=" + librarySymbol + ")";
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        warnOnce(msg);
        return undefined;
      }
    });
  }
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get: function() {
        var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      }
    });
  }
}

// end include: runtime_debug.js


// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];legacyModuleProp('wasmBinary', 'wasmBinary');
var noExitRuntime = Module['noExitRuntime'] || true;legacyModuleProp('noExitRuntime', 'noExitRuntime');

if (typeof WebAssembly != 'object') {
  abort('no native wasm support detected');
}

// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

// include: runtime_strings.js


// runtime_strings.js: String related runtime functions that are part of both
// MINIMAL_RUNTIME and regular runtime.

var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
 * array that contains uint8 values, returns a copy of that string as a
 * Javascript String object.
 * heapOrArray is either a regular array, or a JavaScript typed array view.
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.  Also, use the length info to avoid running tiny
  // strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation,
  // so that undefined means Infinity)
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;

  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
  }
  var str = '';
  // If building with TextDecoder, we have already computed the string length
  // above, so test loop end condition against that
  while (idx < endPtr) {
    // For UTF8 byte structure, see:
    // http://en.wikipedia.org/wiki/UTF-8#Description
    // https://www.ietf.org/rfc/rfc2279.txt
    // https://tools.ietf.org/html/rfc3629
    var u0 = heapOrArray[idx++];
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }

    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
  return str;
}

/**
 * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
 * emscripten HEAP, returns a copy of that string as a Javascript String object.
 *
 * @param {number} ptr
 * @param {number=} maxBytesToRead - An optional length that specifies the
 *   maximum number of bytes to read. You can omit this parameter to scan the
 *   string until the first \0 byte. If maxBytesToRead is passed, and the string
 *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
 *   string will cut short at that byte index (i.e. maxBytesToRead will not
 *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
 *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
 *   JS JIT optimizations off, so it is worth to consider consistently using one
 * @return {string}
 */
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

/**
 * Copies the given Javascript String object 'str' to the given byte array at
 * address 'outIdx', encoded in UTF8 form and null-terminated. The copy will
 * require at most str.length*4+1 bytes of space in the HEAP.  Use the function
 * lengthBytesUTF8 to compute the exact number of bytes (excluding null
 * terminator) that this function will write.
 *
 * @param {string} str - The Javascript string to copy.
 * @param {ArrayBufferView|Array<number>} heap - The array to copy to. Each
 *                                               index in this array is assumed
 *                                               to be one 8-byte element.
 * @param {number} outIdx - The starting offset in the array to begin the copying.
 * @param {number} maxBytesToWrite - The maximum number of bytes this function
 *                                   can write to the array.  This count should
 *                                   include the null terminator, i.e. if
 *                                   maxBytesToWrite=1, only the null terminator
 *                                   will be written and nothing else.
 *                                   maxBytesToWrite=0 does not write any bytes
 *                                   to the output, not even the null
 *                                   terminator.
 * @return {number} The number of bytes written, EXCLUDING the null terminator.
 */
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0))
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 0xC0 | (u >> 6);
      heap[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 0xE0 | (u >> 12);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
      heap[outIdx++] = 0xF0 | (u >> 18);
      heap[outIdx++] = 0x80 | ((u >> 12) & 63);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
}

/**
 * Copies the given Javascript String object 'str' to the emscripten HEAP at
 * address 'outPtr', null-terminated and encoded in UTF8 form. The copy will
 * require at most str.length*4+1 bytes of space in the HEAP.
 * Use the function lengthBytesUTF8 to compute the exact number of bytes
 * (excluding null terminator) that this function will write.
 *
 * @return {number} The number of bytes written, EXCLUDING the null terminator.
 */
function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

/**
 * Returns the number of bytes the given Javascript string takes if encoded as a
 * UTF8 byte array, EXCLUDING the null terminator byte.
 *
 * @param {string} str - JavaScript string to operator on
 * @return {number} Length, in bytes, of the UTF8 encoded string.
 */
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i); // possibly a lead surrogate
    if (c <= 0x7F) {
      len++;
    } else if (c <= 0x7FF) {
      len += 2;
    } else if (c >= 0xD800 && c <= 0xDFFF) {
      len += 4; ++i;
    } else {
      len += 3;
    }
  }
  return len;
}

// end include: runtime_strings.js
// Memory management

var HEAP,
/** @type {!ArrayBuffer} */
  buffer,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
}

var STACK_SIZE = 5242880;
if (Module['STACK_SIZE']) assert(STACK_SIZE === Module['STACK_SIZE'], 'the stack size can no longer be determined at runtime')

var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216;legacyModuleProp('INITIAL_MEMORY', 'INITIAL_MEMORY');

assert(INITIAL_MEMORY >= STACK_SIZE, 'INITIAL_MEMORY should be larger than STACK_SIZE, was ' + INITIAL_MEMORY + '! (STACK_SIZE=' + STACK_SIZE + ')');

// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array != 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
       'JS engine does not provide full typed array support');

// If memory is defined in wasm, the user can't provide it.
assert(!Module['wasmMemory'], 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
assert(INITIAL_MEMORY == 16777216, 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

// include: runtime_init_table.js
// In regular non-RELOCATABLE mode the table is exported
// from the wasm module and this will be assigned once
// the exports are available.
var wasmTable;

// end include: runtime_init_table.js
// include: runtime_stack_check.js


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with the (separate) address-zero check
  // below.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = 0x2135467;
  HEAPU32[(((max)+(4))>>2)] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  HEAPU32[0] = 0x63736d65; /* 'emsc' */
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x2135467 || cookie2 != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten at ' + ptrToString(max) + ', expected hex dwords 0x89BACDFE and 0x2135467, but received ' + ptrToString(cookie2) + ' ' + ptrToString(cookie1));
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[0] !== 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}

// end include: runtime_stack_check.js
// include: runtime_assertions.js


// Endianness check
(function() {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
})();

// end include: runtime_assertions.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function keepRuntimeAlive() {
  return noExitRuntime;
}

function preRun() {

  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  
if (!Module["noFSInit"] && !FS.init.initialized)
  FS.init();
FS.ignorePermissions = false;

TTY.init();
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  
  callRuntimeCallbacks(__ATMAIN__);
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js


// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');

// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err('dependency: ' + dep);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  if (what.indexOf('RuntimeError: unreachable') >= 0) {
    what += '. "unreachable" may be due to ASYNCIFY_STACK_SIZE not being large enough (try increasing it)';
  }

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // defintion for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// {{MEM_INITIALIZER}}

// include: memoryprofiler.js


// end include: memoryprofiler.js
// include: URIUtils.js


// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  // Prefix of data URIs emitted by SINGLE_FILE and related options.
  return filename.startsWith(dataURIPrefix);
}

// Indicates whether filename is delivered via file protocol (as opposed to http/https)
function isFileURI(filename) {
  return filename.startsWith('file://');
}

// end include: URIUtils.js
/** @param {boolean=} fixedasm */
function createExportWrapper(name, fixedasm) {
  return function() {
    var displayName = name;
    var asm = fixedasm;
    if (!fixedasm) {
      asm = Module['asm'];
    }
    assert(runtimeInitialized, 'native function `' + displayName + '` called before runtime initialization');
    if (!asm[name]) {
      assert(asm[name], 'exported native function `' + displayName + '` not found');
    }
    return asm[name].apply(null, arguments);
  };
}

var wasmBinaryFile;
  wasmBinaryFile = 'lua.wasm';
  if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
  }

function getBinary(file) {
  try {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise() {
  // If we don't have the binary yet, try to to load it asynchronously.
  // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
  // See https://github.com/github/fetch/pull/92#issuecomment-140665932
  // Cordova or Electron apps are typically loaded from a file:// url.
  // So use fetch if it is available and the url is not a file, otherwise fall back to XHR.
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch == 'function'
      && !isFileURI(wasmBinaryFile)
    ) {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        if (!response['ok']) {
          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
        }
        return response['arrayBuffer']();
      }).catch(function () {
          return getBinary(wasmBinaryFile);
      });
    }
    else {
      if (readAsync) {
        // fetch is not available or url is file => try XHR (readAsync uses XHR internally)
        return new Promise(function(resolve, reject) {
          readAsync(wasmBinaryFile, function(response) { resolve(new Uint8Array(/** @type{!ArrayBuffer} */(response))) }, reject)
        });
      }
    }
  }

  // Otherwise, getBinary should be able to get it synchronously
  return Promise.resolve().then(function() { return getBinary(wasmBinaryFile); });
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': asmLibraryArg,
    'wasi_snapshot_preview1': asmLibraryArg,
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    var exports = instance.exports;

    exports = Asyncify.instrumentWasmExports(exports);

    Module['asm'] = exports;

    wasmMemory = Module['asm']['memory'];
    assert(wasmMemory, "memory not found in wasm exports");
    // This assertion doesn't hold when emscripten is run in --post-link
    // mode.
    // TODO(sbc): Read INITIAL_MEMORY out of the wasm file in post-link mode.
    //assert(wasmMemory.buffer.byteLength === 16777216);
    updateGlobalBufferAndViews(wasmMemory.buffer);

    wasmTable = Module['asm']['__indirect_function_table'];
    assert(wasmTable, "table not found in wasm exports");

    addOnInit(Module['asm']['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');

  }
  // we can't run yet (except in a pthread, where we have a custom sync instantiator)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
    receiveInstance(result['instance']);
  }

  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(function (instance) {
      return instance;
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: ' + reason);

      // Warn on some common problems.
      if (isFileURI(wasmBinaryFile)) {
        err('warning: Loading from a file URI (' + wasmBinaryFile + ') is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing');
      }
      abort(reason);
    });
  }

  function instantiateAsync() {
    if (!wasmBinary &&
        typeof WebAssembly.instantiateStreaming == 'function' &&
        !isDataURI(wasmBinaryFile) &&
        // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
        !isFileURI(wasmBinaryFile) &&
        // Avoid instantiateStreaming() on Node.js environment for now, as while
        // Node.js v18.1.0 implements it, it does not have a full fetch()
        // implementation yet.
        //
        // Reference:
        //   https://github.com/emscripten-core/emscripten/pull/16917
        !ENVIRONMENT_IS_NODE &&
        typeof fetch == 'function') {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        // Suppress closure warning here since the upstream definition for
        // instantiateStreaming only allows Promise<Repsponse> rather than
        // an actual Response.
        // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure is fixed.
        /** @suppress {checkTypes} */
        var result = WebAssembly.instantiateStreaming(response, info);

        return result.then(
          receiveInstantiationResult,
          function(reason) {
            // We expect the most common failure cause to be a bad MIME type for the binary,
            // in which case falling back to ArrayBuffer instantiation should work.
            err('wasm streaming compile failed: ' + reason);
            err('falling back to ArrayBuffer instantiation');
            return instantiateArrayBuffer(receiveInstantiationResult);
          });
      });
    } else {
      return instantiateArrayBuffer(receiveInstantiationResult);
    }
  }

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
  // to any other async startup actions they are performing.
  // Also pthreads and wasm workers initialize the wasm instance through this path.
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      exports = Asyncify.instrumentWasmExports(exports);
      return exports;
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
        return false;
    }
  }

  instantiateAsync();
  return {}; // no exports yet; we'll fill them in later
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// === Body ===

var ASM_CONSTS = {
  5283528: ($0) => { print(UTF8ToString($0)); }
};
function __asyncjs__readline_js() { return Asyncify.handleAsync(async () => { const response = await readline_from_input(); const byteCount = (Module.lengthBytesUTF8(response) + 1); const linePointer = Module._malloc(byteCount); Module.stringToUTF8(response, linePointer, byteCount); return linePointer; }); }





  /** @constructor */
  function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = 'Program terminated with exit(' + status + ')';
      this.status = status;
    }

  function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    }

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
      if (type.endsWith('*')) type = '*';
      switch (type) {
        case 'i1': return HEAP8[((ptr)>>0)];
        case 'i8': return HEAP8[((ptr)>>0)];
        case 'i16': return HEAP16[((ptr)>>1)];
        case 'i32': return HEAP32[((ptr)>>2)];
        case 'i64': return HEAP32[((ptr)>>2)];
        case 'float': return HEAPF32[((ptr)>>2)];
        case 'double': return HEAPF64[((ptr)>>3)];
        case '*': return HEAPU32[((ptr)>>2)];
        default: abort('invalid type for getValue: ' + type);
      }
      return null;
    }

  function ptrToString(ptr) {
      return '0x' + ptr.toString(16).padStart(8, '0');
    }

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
      if (type.endsWith('*')) type = '*';
      switch (type) {
        case 'i1': HEAP8[((ptr)>>0)] = value; break;
        case 'i8': HEAP8[((ptr)>>0)] = value; break;
        case 'i16': HEAP16[((ptr)>>1)] = value; break;
        case 'i32': HEAP32[((ptr)>>2)] = value; break;
        case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)] = tempI64[0],HEAP32[(((ptr)+(4))>>2)] = tempI64[1]); break;
        case 'float': HEAPF32[((ptr)>>2)] = value; break;
        case 'double': HEAPF64[((ptr)>>3)] = value; break;
        case '*': HEAPU32[((ptr)>>2)] = value; break;
        default: abort('invalid type for setValue: ' + type);
      }
    }

  function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    }

  function ___assert_fail(condition, filename, line, func) {
      abort('Assertion failed: ' + UTF8ToString(condition) + ', at: ' + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);
    }

  function ___cxa_allocate_exception(size) {
      // Thrown object is prepended by exception metadata block
      return _malloc(size + 24) + 24;
    }

  /** @constructor */
  function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
  
      this.set_type = function(type) {
        HEAPU32[(((this.ptr)+(4))>>2)] = type;
      };
  
      this.get_type = function() {
        return HEAPU32[(((this.ptr)+(4))>>2)];
      };
  
      this.set_destructor = function(destructor) {
        HEAPU32[(((this.ptr)+(8))>>2)] = destructor;
      };
  
      this.get_destructor = function() {
        return HEAPU32[(((this.ptr)+(8))>>2)];
      };
  
      this.set_refcount = function(refcount) {
        HEAP32[((this.ptr)>>2)] = refcount;
      };
  
      this.set_caught = function (caught) {
        caught = caught ? 1 : 0;
        HEAP8[(((this.ptr)+(12))>>0)] = caught;
      };
  
      this.get_caught = function () {
        return HEAP8[(((this.ptr)+(12))>>0)] != 0;
      };
  
      this.set_rethrown = function (rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[(((this.ptr)+(13))>>0)] = rethrown;
      };
  
      this.get_rethrown = function () {
        return HEAP8[(((this.ptr)+(13))>>0)] != 0;
      };
  
      // Initialize native structure fields. Should be called once after allocated.
      this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false);
      }
  
      this.add_ref = function() {
        var value = HEAP32[((this.ptr)>>2)];
        HEAP32[((this.ptr)>>2)] = value + 1;
      };
  
      // Returns true if last reference released.
      this.release_ref = function() {
        var prev = HEAP32[((this.ptr)>>2)];
        HEAP32[((this.ptr)>>2)] = prev - 1;
        assert(prev > 0);
        return prev === 1;
      };
  
      this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[(((this.ptr)+(16))>>2)] = adjustedPtr;
      };
  
      this.get_adjusted_ptr = function() {
        return HEAPU32[(((this.ptr)+(16))>>2)];
      };
  
      // Get pointer which is expected to be received by catch clause in C++ code. It may be adjusted
      // when the pointer is casted to some of the exception object base classes (e.g. when virtual
      // inheritance is used). When a pointer is thrown this method should return the thrown pointer
      // itself.
      this.get_exception_ptr = function() {
        // Work around a fastcomp bug, this code is still included for some reason in a build without
        // exceptions support.
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
          return HEAPU32[((this.excPtr)>>2)];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
      };
    }
  
  var exceptionLast = 0;
  
  var uncaughtExceptionCount = 0;
  function ___cxa_throw(ptr, type, destructor) {
      var info = new ExceptionInfo(ptr);
      // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
      info.init(type, destructor);
      exceptionLast = ptr;
      uncaughtExceptionCount++;
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.";
    }

  var PATH = {isAbs:(path) => path.charAt(0) === '/',splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:(path) => {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },join:function() {
        var paths = Array.prototype.slice.call(arguments);
        return PATH.normalize(paths.join('/'));
      },join2:(l, r) => {
        return PATH.normalize(l + '/' + r);
      }};
  
  function getRandomDevice() {
      if (typeof crypto == 'object' && typeof crypto['getRandomValues'] == 'function') {
        // for modern web browsers
        var randomBuffer = new Uint8Array(1);
        return () => { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
      } else
      if (ENVIRONMENT_IS_NODE) {
        // for nodejs with or without crypto support included
        try {
          var crypto_module = require('crypto');
          // nodejs has crypto support
          return () => crypto_module['randomBytes'](1)[0];
        } catch (e) {
          // nodejs doesn't have crypto support
        }
      }
      // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
      return () => abort("no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: function(array) { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };");
    }
  
  var PATH_FS = {resolve:function() {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path != 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:(from, to) => {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  /** @type {function(string, boolean=, number=)} */
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  var TTY = {ttys:[],init:function () {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },fsync:function(stream) {
          stream.tty.ops.fsync(stream.tty);
        },read:function(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function(tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = Buffer.alloc(BUFSIZE);
              var bytesRead = 0;
  
              try {
                bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE, -1);
              } catch(e) {
                // Cross-platform differences: on Windows, reading EOF throws an exception, but on other OSes,
                // reading EOF returns 0. Uniformize behavior by treating the EOF exception to return 0.
                if (e.toString().includes('EOF')) bytesRead = 0;
                else throw e;
              }
  
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
            } else
            if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },fsync:function(tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },fsync:function(tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  function zeroMemory(address, size) {
      HEAPU8.fill(0, address, address + size);
      return address;
    }
  
  function alignMemory(size, alignment) {
      assert(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    }
  function mmapAlloc(size) {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (!ptr) return 0;
      return zeroMemory(ptr, size);
    }
  var MEMFS = {ops_table:null,mount:function(mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(63);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.timestamp = node.timestamp;
        }
        return node;
      },getFileDataAsTypedArray:function(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
      },resizeFileStorage:function(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
        }
      },node_ops:{getattr:function(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function(node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function(parent, name) {
          throw FS.genericErrors[44];
        },mknod:function(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function(old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.parent.timestamp = Date.now()
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          new_dir.timestamp = old_node.parent.timestamp;
          old_node.parent = new_dir;
        },unlink:function(parent, name) {
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },rmdir:function(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },readdir:function(node) {
          var entries = ['.', '..'];
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        }},stream_ops:{read:function(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function(stream, buffer, offset, length, position, canOwn) {
          // The data buffer should be a typed array view
          assert(!(buffer instanceof ArrayBuffer));
          // If the buffer is located in main memory (HEAP), and if
          // memory can grow, we can't hold on to references of the
          // memory buffer, as they may get invalidated. That means we
          // need to do copy its contents.
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
  
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) {
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },llseek:function(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },allocate:function(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            HEAP8.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};
  
  /** @param {boolean=} noRunDep */
  function asyncLoad(url, onload, onerror, noRunDep) {
      var dep = !noRunDep ? getUniqueRunDependency('al ' + url) : '';
      readAsync(url, (arrayBuffer) => {
        assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency(dep);
      }, (event) => {
        if (onerror) {
          onerror();
        } else {
          throw 'Loading data file "' + url + '" failed.';
        }
      });
      if (dep) addRunDependency(dep);
    }
  
  var ERRNO_MESSAGES = {0:"Success",1:"Arg list too long",2:"Permission denied",3:"Address already in use",4:"Address not available",5:"Address family not supported by protocol family",6:"No more processes",7:"Socket already connected",8:"Bad file number",9:"Trying to read unreadable message",10:"Mount device busy",11:"Operation canceled",12:"No children",13:"Connection aborted",14:"Connection refused",15:"Connection reset by peer",16:"File locking deadlock error",17:"Destination address required",18:"Math arg out of domain of func",19:"Quota exceeded",20:"File exists",21:"Bad address",22:"File too large",23:"Host is unreachable",24:"Identifier removed",25:"Illegal byte sequence",26:"Connection already in progress",27:"Interrupted system call",28:"Invalid argument",29:"I/O error",30:"Socket is already connected",31:"Is a directory",32:"Too many symbolic links",33:"Too many open files",34:"Too many links",35:"Message too long",36:"Multihop attempted",37:"File or path name too long",38:"Network interface is not configured",39:"Connection reset by network",40:"Network is unreachable",41:"Too many open files in system",42:"No buffer space available",43:"No such device",44:"No such file or directory",45:"Exec format error",46:"No record locks available",47:"The link has been severed",48:"Not enough core",49:"No message of desired type",50:"Protocol not available",51:"No space left on device",52:"Function not implemented",53:"Socket is not connected",54:"Not a directory",55:"Directory not empty",56:"State not recoverable",57:"Socket operation on non-socket",59:"Not a typewriter",60:"No such device or address",61:"Value too large for defined data type",62:"Previous owner died",63:"Not super-user",64:"Broken pipe",65:"Protocol error",66:"Unknown protocol",67:"Protocol wrong type for socket",68:"Math result not representable",69:"Read only file system",70:"Illegal seek",71:"No such process",72:"Stale file handle",73:"Connection timed out",74:"Text file busy",75:"Cross-device link",100:"Device not a stream",101:"Bad font file fmt",102:"Invalid slot",103:"Invalid request code",104:"No anode",105:"Block device required",106:"Channel number out of range",107:"Level 3 halted",108:"Level 3 reset",109:"Link number out of range",110:"Protocol driver not attached",111:"No CSI structure available",112:"Level 2 halted",113:"Invalid exchange",114:"Invalid request descriptor",115:"Exchange full",116:"No data (for no delay io)",117:"Timer expired",118:"Out of streams resources",119:"Machine is not on the network",120:"Package not installed",121:"The object is remote",122:"Advertise error",123:"Srmount error",124:"Communication error on send",125:"Cross mount point (not really error)",126:"Given log. name not unique",127:"f.d. invalid for this operation",128:"Remote address changed",129:"Can   access a needed shared lib",130:"Accessing a corrupted shared lib",131:".lib section in a.out corrupted",132:"Attempting to link in too many libs",133:"Attempting to exec a shared library",135:"Streams pipe error",136:"Too many users",137:"Socket type not supported",138:"Not supported",139:"Protocol family not supported",140:"Can't send after socket shutdown",141:"Too many references",142:"Host is down",148:"No medium (in tape drive)",156:"Level 2 not synchronized"};
  
  var ERRNO_CODES = {};
  
  function withStackSave(f) {
      var stack = stackSave();
      var ret = f();
      stackRestore(stack);
      return ret;
    }
  function demangle(func) {
      warnOnce('warning: build with -sDEMANGLE_SUPPORT to link in libcxxabi demangling');
      return func;
    }
  function demangleAll(text) {
      var regex =
        /\b_Z[\w\d_]+/g;
      return text.replace(regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : (y + ' [' + x + ']');
        });
    }
  var FS = {root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},filesystems:null,syncFSRequests:0,lookupPath:(path, opts = {}) => {
        path = PATH_FS.resolve(path);
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        opts = Object.assign(defaults, opts)
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(32);
        }
  
        // split the absolute path
        var parts = path.split('/').filter((p) => !!p);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(32);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:(node) => {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:(parentid, name) => {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:(node) => {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:(node) => {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:(parent, name) => {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:(parent, name, mode, rdev) => {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:(node) => {
        FS.hashRemoveNode(node);
      },isRoot:(node) => {
        return node === node.parent;
      },isMountpoint:(node) => {
        return !!node.mounted;
      },isFile:(mode) => {
        return (mode & 61440) === 32768;
      },isDir:(mode) => {
        return (mode & 61440) === 16384;
      },isLink:(mode) => {
        return (mode & 61440) === 40960;
      },isChrdev:(mode) => {
        return (mode & 61440) === 8192;
      },isBlkdev:(mode) => {
        return (mode & 61440) === 24576;
      },isFIFO:(mode) => {
        return (mode & 61440) === 4096;
      },isSocket:(mode) => {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"r+":2,"w":577,"w+":578,"a":1089,"a+":1090},modeStringToFlags:(str) => {
        var flags = FS.flagModes[str];
        if (typeof flags == 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:(flag) => {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:(node, perms) => {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },mayLookup:(dir) => {
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },mayCreate:(dir, name) => {
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:(dir, name, isdir) => {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },mayOpen:(node, flags) => {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' || // opening for write
              (flags & 512)) { // TODO: check for O_SEARCH? (== search for dir only)
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:(fd_start = 0, fd_end = FS.MAX_OPEN_FDS) => {
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },getStream:(fd) => FS.streams[fd],createStream:(stream, fd_start, fd_end) => {
        if (!FS.FSStream) {
          FS.FSStream = /** @constructor */ function() {
            this.shared = { };
          };
          FS.FSStream.prototype = {};
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              /** @this {FS.FSStream} */
              get: function() { return this.node; },
              /** @this {FS.FSStream} */
              set: function(val) { this.node = val; }
            },
            isRead: {
              /** @this {FS.FSStream} */
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              /** @this {FS.FSStream} */
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              /** @this {FS.FSStream} */
              get: function() { return (this.flags & 1024); }
            },
            flags: {
              /** @this {FS.FSStream} */
              get: function() { return this.shared.flags; },
              /** @this {FS.FSStream} */
              set: function(val) { this.shared.flags = val; },
            },
            position : {
              /** @this {FS.FSStream} */
              get: function() { return this.shared.position; },
              /** @this {FS.FSStream} */
              set: function(val) { this.shared.position = val; },
            },
          });
        }
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:(fd) => {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:(stream) => {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:() => {
          throw new FS.ErrnoError(70);
        }},major:(dev) => ((dev) >> 8),minor:(dev) => ((dev) & 0xff),makedev:(ma, mi) => ((ma) << 8 | (mi)),registerDevice:(dev, ops) => {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:(dev) => FS.devices[dev],getMounts:(mount) => {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:(populate, callback) => {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err('warning: ' + FS.syncFSRequests + ' FS.syncfs operations in flight at once, probably just doing extra work');
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:(type, opts, mountpoint) => {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:(mountpoint) => {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:(parent, name) => {
        return parent.node_ops.lookup(parent, name);
      },mknod:(path, mode, dev) => {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:(path, mode) => {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:(path, mode) => {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdirTree:(path, mode) => {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },mkdev:(path, mode, dev) => {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:(oldpath, newpath) => {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:(old_path, new_path) => {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existant directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:(path) => {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:(path) => {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(54);
        }
        return node.node_ops.readdir(node);
      },unlink:(path) => {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:(path) => {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:(path, dontFollow) => {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(63);
        }
        return node.node_ops.getattr(node);
      },lstat:(path) => {
        return FS.stat(path, true);
      },chmod:(path, mode, dontFollow) => {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:(path, mode) => {
        FS.chmod(path, mode, true);
      },fchmod:(fd, mode) => {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        FS.chmod(stream.node, mode);
      },chown:(path, uid, gid, dontFollow) => {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:(path, uid, gid) => {
        FS.chown(path, uid, gid, true);
      },fchown:(fd, uid, gid) => {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:(path, len) => {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:(fd, len) => {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.truncate(stream.node, len);
      },utime:(path, atime, mtime) => {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:(path, flags, mode) => {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode == 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path == 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },close:(stream) => {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },isClosed:(stream) => {
        return stream.fd === null;
      },llseek:(stream, offset, whence) => {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:(stream, buffer, offset, length, position) => {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:(stream, buffer, offset, length, position, canOwn) => {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:(stream, offset, length) => {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:(stream, length, position, prot, flags) => {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },msync:(stream, buffer, offset, length, mmapFlags) => {
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:(stream) => 0,ioctl:(stream, cmd, arg) => {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:(path, opts = {}) => {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:(path, data, opts = {}) => {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },cwd:() => FS.currentPath,chdir:(path) => {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:() => {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:() => {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device = getRandomDevice();
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:() => {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: () => {
            var node = FS.createNode(proc_self, 'fd', 16384 | 511 /* 0777 */, 73);
            node.node_ops = {
              lookup: (parent, name) => {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(8);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:() => {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:() => {
        if (FS.ErrnoError) return;
        FS.ErrnoError = /** @this{Object} */ function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = /** @this{Object} */ function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
  
          // Try to get a maximally helpful stack trace. On Node.js, getting Error.stack
          // now ensures it shows what we want.
          if (this.stack) {
            // Define the stack property for Node.js 4, which otherwise errors on the next line.
            Object.defineProperty(this, "stack", { value: (new Error).stack, writable: true });
            this.stack = demangleAll(this.stack);
          }
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [44].forEach((code) => {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:() => {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },init:(input, output, error) => {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:() => {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:(canRead, canWrite) => {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },findObject:(path, dontResolveLastLink) => {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },analyzePath:(path, dontResolveLastLink) => {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createPath:(parent, path, canRead, canWrite) => {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:(parent, name, properties, canRead, canWrite) => {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:(parent, name, data, canRead, canWrite, canOwn) => {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:(parent, name, input, output) => {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: (stream) => {
            stream.seekable = false;
          },
          close: (stream) => {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: (stream, buffer, offset, length, pos /* ignored */) => {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: (stream, buffer, offset, length, pos) => {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },forceLoadFile:(obj) => {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (read_) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(read_(obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
      },createLazyFile:(parent, name, url, canRead, canWrite) => {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        /** @constructor */
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = /** @this{Object} */ function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (from, to) => {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
            }
            return intArrayFromString(xhr.responseText || '', true);
          };
          var lazyArray = this;
          lazyArray.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') throw new Error('doXHR failed!');
            return lazyArray.chunks[chunkNum];
          });
  
          if (usesGzip || !datalength) {
            // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
            chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        };
        if (typeof XMLHttpRequest != 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperties(lazyArray, {
            length: {
              get: /** @this{Object} */ function() {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._length;
              }
            },
            chunkSize: {
              get: /** @this{Object} */ function() {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._chunkSize;
              }
            }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: /** @this {FSNode} */ function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            FS.forceLoadFile(node);
            return fn.apply(null, arguments);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr: ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          if (Browser.handledByPreloadPlugin(byteArray, fullname, finish, () => {
            if (onerror) onerror();
            removeRunDependency(dep);
          })) {
            return;
          }
          finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          asyncLoad(url, (byteArray) => processData(byteArray), onerror);
        } else {
          processData(url);
        }
      },indexedDB:() => {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:() => {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:(paths, onload, onerror) => {
        onload = onload || (() => {});
        onerror = onerror || (() => {});
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = () => {
          out('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = () => {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach((path) => {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = () => { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = () => { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:(paths, onload, onerror) => {
        onload = onload || (() => {});
        onerror = onerror || (() => {});
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = () => {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach((path) => {
            var getRequest = files.get(path);
            getRequest.onsuccess = () => {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = () => { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },absolutePath:() => {
        abort('FS.absolutePath has been removed; use PATH_FS.resolve instead');
      },createFolder:() => {
        abort('FS.createFolder has been removed; use FS.mkdir instead');
      },createLink:() => {
        abort('FS.createLink has been removed; use FS.symlink instead');
      },joinPath:() => {
        abort('FS.joinPath has been removed; use PATH.join instead');
      },mmapAlloc:() => {
        abort('FS.mmapAlloc has been replaced by the top level function mmapAlloc');
      },standardizePath:() => {
        abort('FS.standardizePath has been removed; use PATH.normalize instead');
      }};
  var SYSCALLS = {DEFAULT_POLLMASK:5,calculateAt:function(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return PATH.join2(dir, path);
      },doStat:function(func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -54;
          }
          throw e;
        }
        HEAP32[((buf)>>2)] = stat.dev;
        HEAP32[(((buf)+(8))>>2)] = stat.ino;
        HEAP32[(((buf)+(12))>>2)] = stat.mode;
        HEAPU32[(((buf)+(16))>>2)] = stat.nlink;
        HEAP32[(((buf)+(20))>>2)] = stat.uid;
        HEAP32[(((buf)+(24))>>2)] = stat.gid;
        HEAP32[(((buf)+(28))>>2)] = stat.rdev;
        (tempI64 = [stat.size>>>0,(tempDouble=stat.size,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((buf)+(40))>>2)] = tempI64[0],HEAP32[(((buf)+(44))>>2)] = tempI64[1]);
        HEAP32[(((buf)+(48))>>2)] = 4096;
        HEAP32[(((buf)+(52))>>2)] = stat.blocks;
        (tempI64 = [Math.floor(stat.atime.getTime() / 1000)>>>0,(tempDouble=Math.floor(stat.atime.getTime() / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((buf)+(56))>>2)] = tempI64[0],HEAP32[(((buf)+(60))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(64))>>2)] = 0;
        (tempI64 = [Math.floor(stat.mtime.getTime() / 1000)>>>0,(tempDouble=Math.floor(stat.mtime.getTime() / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((buf)+(72))>>2)] = tempI64[0],HEAP32[(((buf)+(76))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(80))>>2)] = 0;
        (tempI64 = [Math.floor(stat.ctime.getTime() / 1000)>>>0,(tempDouble=Math.floor(stat.ctime.getTime() / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((buf)+(88))>>2)] = tempI64[0],HEAP32[(((buf)+(92))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(96))>>2)] = 0;
        (tempI64 = [stat.ino>>>0,(tempDouble=stat.ino,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((buf)+(104))>>2)] = tempI64[0],HEAP32[(((buf)+(108))>>2)] = tempI64[1]);
        return 0;
      },doMsync:function(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },varargs:undefined,get:function() {
        assert(SYSCALLS.varargs != undefined);
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },getStreamFromFD:function(fd) {
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(8);
        return stream;
      }};
  function ___syscall_dup3(fd, suggestFD, flags) {
  try {
  
      var old = SYSCALLS.getStreamFromFD(fd);
      assert(!flags);
      if (old.fd === suggestFD) return -28;
      var suggest = FS.getStream(suggestFD);
      if (suggest) FS.close(suggest);
      return FS.createStream(old, suggestFD, suggestFD + 1).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return -e.errno;
  }
  }

  function setErrNo(value) {
      HEAP32[((___errno_location())>>2)] = value;
      return value;
    }
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = SYSCALLS.get();
          if (arg < 0) {
            return -28;
          }
          var newStream;
          newStream = FS.createStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = SYSCALLS.get();
          stream.flags |= arg;
          return 0;
        }
        case 5:
        /* case 5: Currently in musl F_GETLK64 has same value as F_GETLK, so omitted to avoid duplicate case blocks. If that changes, uncomment this */ {
          
          var arg = SYSCALLS.get();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 6:
        case 7:
        /* case 6: Currently in musl F_SETLK64 has same value as F_SETLK, so omitted to avoid duplicate case blocks. If that changes, uncomment this */
        /* case 7: Currently in musl F_SETLKW64 has same value as F_SETLKW, so omitted to avoid duplicate case blocks. If that changes, uncomment this */
          
          
          return 0; // Pretend that the locking is successful.
        case 16:
        case 8:
          return -28; // These are for sockets. We don't have them fully implemented yet.
        case 9:
          // musl trusts getown return values, due to a bug where they must be, as they overlap with errors. just return -1 here, so fcntl() returns that, and we set errno ourselves.
          setErrNo(28);
          return -1;
        default: {
          return -28;
        }
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return -e.errno;
  }
  }

  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509:
        case 21505: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21510:
        case 21511:
        case 21512:
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = SYSCALLS.get();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.get();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return -e.errno;
  }
  }

  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? SYSCALLS.get() : 0;
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return -e.errno;
  }
  }

  function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
  try {
  
      oldpath = SYSCALLS.getStr(oldpath);
      newpath = SYSCALLS.getStr(newpath);
      oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
      newpath = SYSCALLS.calculateAt(newdirfd, newpath);
      FS.rename(oldpath, newpath);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return -e.errno;
  }
  }

  function ___syscall_rmdir(path) {
  try {
  
      path = SYSCALLS.getStr(path);
      FS.rmdir(path);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return -e.errno;
  }
  }

  function ___syscall_unlinkat(dirfd, path, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (flags === 0) {
        FS.unlink(path);
      } else if (flags === 512) {
        FS.rmdir(path);
      } else {
        abort('Invalid flags passed to unlinkat');
      }
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return -e.errno;
  }
  }

  function __dlinit(main_dso_handle) {}

  var dlopenMissingError =  'To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking';
  function __dlopen_js(filename, flag) {
      abort(dlopenMissingError);
    }

  function __dlsym_js(handle, symbol) {
      abort(dlopenMissingError);
    }

  function __embind_register_bigint(primitiveType, name, size, minRange, maxRange) {}

  function getShiftFromSize(size) {
      switch (size) {
          case 1: return 0;
          case 2: return 1;
          case 4: return 2;
          case 8: return 3;
          default:
              throw new TypeError('Unknown type size: ' + size);
      }
    }
  
  function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }
  var embind_charCodes = undefined;
  function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
  
  var awaitingDependencies = {};
  
  var registeredTypes = {};
  
  var typeDependencies = {};
  
  var char_0 = 48;
  
  var char_9 = 57;
  function makeLegalFunctionName(name) {
      if (undefined === name) {
        return '_unknown';
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, '$');
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
        return '_' + name;
      }
      return name;
    }
  function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      /*jshint evil:true*/
      return new Function(
          "body",
          "return function " + name + "() {\n" +
          "    \"use strict\";" +
          "    return body.apply(this, arguments);\n" +
          "};\n"
      )(body);
    }
  function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
        this.name = errorName;
        this.message = message;
  
        var stack = (new Error(message)).stack;
        if (stack !== undefined) {
          this.stack = this.toString() + '\n' +
              stack.replace(/^Error(:[^\n]*)?\n/, '');
        }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
        if (this.message === undefined) {
          return this.name;
        } else {
          return this.name + ': ' + this.message;
        }
      };
  
      return errorClass;
    }
  var BindingError = undefined;
  function throwBindingError(message) {
      throw new BindingError(message);
    }
  
  var InternalError = undefined;
  function throwInternalError(message) {
      throw new InternalError(message);
    }
  function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
          typeDependencies[type] = dependentTypes;
      });
  
      function onComplete(typeConverters) {
          var myTypeConverters = getTypeConverters(typeConverters);
          if (myTypeConverters.length !== myTypes.length) {
              throwInternalError('Mismatched type converter count');
          }
          for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
          }
      }
  
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach((dt, i) => {
        if (registeredTypes.hasOwnProperty(dt)) {
          typeConverters[i] = registeredTypes[dt];
        } else {
          unregisteredTypes.push(dt);
          if (!awaitingDependencies.hasOwnProperty(dt)) {
            awaitingDependencies[dt] = [];
          }
          awaitingDependencies[dt].push(() => {
            typeConverters[i] = registeredTypes[dt];
            ++registered;
            if (registered === unregisteredTypes.length) {
              onComplete(typeConverters);
            }
          });
        }
      });
      if (0 === unregisteredTypes.length) {
        onComplete(typeConverters);
      }
    }
  /** @param {Object=} options */
  function registerType(rawType, registeredInstance, options = {}) {
      if (!('argPackAdvance' in registeredInstance)) {
          throw new TypeError('registerType registeredInstance requires argPackAdvance');
      }
  
      var name = registeredInstance.name;
      if (!rawType) {
          throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
              return;
          } else {
              throwBindingError("Cannot register type '" + name + "' twice");
          }
      }
  
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
  
      if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((cb) => cb());
      }
    }
  function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(wt) {
              // ambiguous emscripten ABI: sometimes return values are
              // true or false, and sometimes integers (0 or 1)
              return !!wt;
          },
          'toWireType': function(destructors, o) {
              return o ? trueValue : falseValue;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': function(pointer) {
              // TODO: if heap is fixed (like in asm.js) this could be executed outside
              var heap;
              if (size === 1) {
                  heap = HEAP8;
              } else if (size === 2) {
                  heap = HEAP16;
              } else if (size === 4) {
                  heap = HEAP32;
              } else {
                  throw new TypeError("Unknown boolean type size: " + name);
              }
              return this['fromWireType'](heap[pointer >> shift]);
          },
          destructorFunction: null, // This type does not need a destructor
      });
    }

  function ClassHandle_isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
        return false;
      }
      if (!(other instanceof ClassHandle)) {
        return false;
      }
  
      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;
  
      while (leftClass.baseClass) {
        left = leftClass.upcast(left);
        leftClass = leftClass.baseClass;
      }
  
      while (rightClass.baseClass) {
        right = rightClass.upcast(right);
        rightClass = rightClass.baseClass;
      }
  
      return leftClass === rightClass && left === right;
    }
  
  function shallowCopyInternalPointer(o) {
      return {
        count: o.count,
        deleteScheduled: o.deleteScheduled,
        preservePointerOnDelete: o.preservePointerOnDelete,
        ptr: o.ptr,
        ptrType: o.ptrType,
        smartPtr: o.smartPtr,
        smartPtrType: o.smartPtrType,
      };
    }
  
  function throwInstanceAlreadyDeleted(obj) {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      throwBindingError(getInstanceTypeName(obj) + ' instance already deleted');
    }
  
  var finalizationRegistry = false;
  
  function detachFinalizer(handle) {}
  
  function runDestructor($$) {
      if ($$.smartPtr) {
        $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
        $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    }
  function releaseClassHandle($$) {
      $$.count.value -= 1;
      var toDelete = 0 === $$.count.value;
      if (toDelete) {
        runDestructor($$);
      }
    }
  
  function downcastPointer(ptr, ptrClass, desiredClass) {
      if (ptrClass === desiredClass) {
        return ptr;
      }
      if (undefined === desiredClass.baseClass) {
        return null; // no conversion
      }
  
      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
        return null;
      }
      return desiredClass.downcast(rv);
    }
  
  var registeredPointers = {};
  
  function getInheritedInstanceCount() {
      return Object.keys(registeredInstances).length;
    }
  
  function getLiveInheritedInstances() {
      var rv = [];
      for (var k in registeredInstances) {
        if (registeredInstances.hasOwnProperty(k)) {
          rv.push(registeredInstances[k]);
        }
      }
      return rv;
    }
  
  var deletionQueue = [];
  function flushPendingDeletes() {
      while (deletionQueue.length) {
        var obj = deletionQueue.pop();
        obj.$$.deleteScheduled = false;
        obj['delete']();
      }
    }
  
  var delayFunction = undefined;
  function setDelayFunction(fn) {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
    }
  function init_embind() {
      Module['getInheritedInstanceCount'] = getInheritedInstanceCount;
      Module['getLiveInheritedInstances'] = getLiveInheritedInstances;
      Module['flushPendingDeletes'] = flushPendingDeletes;
      Module['setDelayFunction'] = setDelayFunction;
    }
  var registeredInstances = {};
  
  function getBasestPointer(class_, ptr) {
      if (ptr === undefined) {
          throwBindingError('ptr should not be undefined');
      }
      while (class_.baseClass) {
          ptr = class_.upcast(ptr);
          class_ = class_.baseClass;
      }
      return ptr;
    }
  function getInheritedInstance(class_, ptr) {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    }
  
  function makeClassHandle(prototype, record) {
      if (!record.ptrType || !record.ptr) {
        throwInternalError('makeClassHandle requires ptr and ptrType');
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
        throwInternalError('Both smartPtrType and smartPtr must be specified');
      }
      record.count = { value: 1 };
      return attachFinalizer(Object.create(prototype, {
        $$: {
            value: record,
        },
      }));
    }
  function RegisteredPointer_fromWireType(ptr) {
      // ptr is a raw pointer (or a raw smartpointer)
  
      // rawPointer is a maybe-null raw pointer
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
        this.destructor(ptr);
        return null;
      }
  
      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (undefined !== registeredInstance) {
        // JS object has been neutered, time to repopulate it
        if (0 === registeredInstance.$$.count.value) {
          registeredInstance.$$.ptr = rawPointer;
          registeredInstance.$$.smartPtr = ptr;
          return registeredInstance['clone']();
        } else {
          // else, just increment reference count on existing object
          // it already has a reference to the smart pointer
          var rv = registeredInstance['clone']();
          this.destructor(ptr);
          return rv;
        }
      }
  
      function makeDefaultHandle() {
        if (this.isSmartPointer) {
          return makeClassHandle(this.registeredClass.instancePrototype, {
            ptrType: this.pointeeType,
            ptr: rawPointer,
            smartPtrType: this,
            smartPtr: ptr,
          });
        } else {
          return makeClassHandle(this.registeredClass.instancePrototype, {
            ptrType: this,
            ptr: ptr,
          });
        }
      }
  
      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
        return makeDefaultHandle.call(this);
      }
  
      var toType;
      if (this.isConst) {
        toType = registeredPointerRecord.constPointerType;
      } else {
        toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(
          rawPointer,
          this.registeredClass,
          toType.registeredClass);
      if (dp === null) {
        return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
        return makeClassHandle(toType.registeredClass.instancePrototype, {
          ptrType: toType,
          ptr: dp,
          smartPtrType: this,
          smartPtr: ptr,
        });
      } else {
        return makeClassHandle(toType.registeredClass.instancePrototype, {
          ptrType: toType,
          ptr: dp,
        });
      }
    }
  function attachFinalizer(handle) {
      if ('undefined' === typeof FinalizationRegistry) {
        attachFinalizer = (handle) => handle;
        return handle;
      }
      // If the running environment has a FinalizationRegistry (see
      // https://github.com/tc39/proposal-weakrefs), then attach finalizers
      // for class handles.  We check for the presence of FinalizationRegistry
      // at run-time, not build-time.
      finalizationRegistry = new FinalizationRegistry((info) => {
        console.warn(info.leakWarning.stack.replace(/^Error: /, ''));
        releaseClassHandle(info.$$);
      });
      attachFinalizer = (handle) => {
        var $$ = handle.$$;
        var hasSmartPtr = !!$$.smartPtr;
        if (hasSmartPtr) {
          // We should not call the destructor on raw pointers in case other code expects the pointee to live
          var info = { $$: $$ };
          // Create a warning as an Error instance in advance so that we can store
          // the current stacktrace and point to it when / if a leak is detected.
          // This is more useful than the empty stacktrace of `FinalizationRegistry`
          // callback.
          var cls = $$.ptrType.registeredClass;
          info.leakWarning = new Error("Embind found a leaked C++ instance " + cls.name + " <" + ptrToString($$.ptr) + ">.\n" +
          "We'll free it automatically in this case, but this functionality is not reliable across various environments.\n" +
          "Make sure to invoke .delete() manually once you're done with the instance instead.\n" +
          "Originally allocated"); // `.stack` will add "at ..." after this sentence
          if ('captureStackTrace' in Error) {
            Error.captureStackTrace(info.leakWarning, RegisteredPointer_fromWireType);
          }
          finalizationRegistry.register(handle, info, handle);
        }
        return handle;
      };
      detachFinalizer = (handle) => finalizationRegistry.unregister(handle);
      return attachFinalizer(handle);
    }
  function ClassHandle_clone() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.preservePointerOnDelete) {
        this.$$.count.value += 1;
        return this;
      } else {
        var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), {
          $$: {
            value: shallowCopyInternalPointer(this.$$),
          }
        }));
  
        clone.$$.count.value += 1;
        clone.$$.deleteScheduled = false;
        return clone;
      }
    }
  
  function ClassHandle_delete() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError('Object already scheduled for deletion');
      }
  
      detachFinalizer(this);
      releaseClassHandle(this.$$);
  
      if (!this.$$.preservePointerOnDelete) {
        this.$$.smartPtr = undefined;
        this.$$.ptr = undefined;
      }
    }
  
  function ClassHandle_isDeleted() {
      return !this.$$.ptr;
    }
  
  function ClassHandle_deleteLater() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError('Object already scheduled for deletion');
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    }
  function init_ClassHandle() {
      ClassHandle.prototype['isAliasOf'] = ClassHandle_isAliasOf;
      ClassHandle.prototype['clone'] = ClassHandle_clone;
      ClassHandle.prototype['delete'] = ClassHandle_delete;
      ClassHandle.prototype['isDeleted'] = ClassHandle_isDeleted;
      ClassHandle.prototype['deleteLater'] = ClassHandle_deleteLater;
    }
  function ClassHandle() {
    }
  
  function ensureOverloadTable(proto, methodName, humanName) {
      if (undefined === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
        proto[methodName] = function() {
          // TODO This check can be removed in -O3 level "unsafe" optimizations.
          if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
              throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
          }
          return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
        };
        // Move the previous function into the overload table.
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }
  /** @param {number=} numArguments */
  function exposePublicSymbol(name, value, numArguments) {
      if (Module.hasOwnProperty(name)) {
        if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
          throwBindingError("Cannot register public name '" + name + "' twice");
        }
  
        // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
        // that routes between the two.
        ensureOverloadTable(Module, name, name);
        if (Module.hasOwnProperty(numArguments)) {
            throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
        }
        // Add the new function into the overload table.
        Module[name].overloadTable[numArguments] = value;
      }
      else {
        Module[name] = value;
        if (undefined !== numArguments) {
          Module[name].numArguments = numArguments;
        }
      }
    }
  
  /** @constructor */
  function RegisteredClass(name,
                               constructor,
                               instancePrototype,
                               rawDestructor,
                               baseClass,
                               getActualType,
                               upcast,
                               downcast) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }
  
  function upcastPointer(ptr, ptrClass, desiredClass) {
      while (ptrClass !== desiredClass) {
        if (!ptrClass.upcast) {
          throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
        }
        ptr = ptrClass.upcast(ptr);
        ptrClass = ptrClass.baseClass;
      }
      return ptr;
    }
  function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError('null is not a valid ' + this.name);
        }
        return 0;
      }
  
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  function genericPointerToWireType(destructors, handle) {
      var ptr;
      if (handle === null) {
        if (this.isReference) {
          throwBindingError('null is not a valid ' + this.name);
        }
  
        if (this.isSmartPointer) {
          ptr = this.rawConstructor();
          if (destructors !== null) {
            destructors.push(this.rawDestructor, ptr);
          }
          return ptr;
        } else {
          return 0;
        }
      }
  
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
        throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
  
      if (this.isSmartPointer) {
        // TODO: this is not strictly true
        // We could support BY_EMVAL conversions from raw pointers to smart pointers
        // because the smart pointer can hold a reference to the handle
        if (undefined === handle.$$.smartPtr) {
          throwBindingError('Passing raw pointer to smart pointer is illegal');
        }
  
        switch (this.sharingPolicy) {
          case 0: // NONE
            // no upcasting
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
            }
            break;
  
          case 1: // INTRUSIVE
            ptr = handle.$$.smartPtr;
            break;
  
          case 2: // BY_EMVAL
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              var clonedHandle = handle['clone']();
              ptr = this.rawShare(
                ptr,
                Emval.toHandle(function() {
                  clonedHandle['delete']();
                })
              );
              if (destructors !== null) {
                destructors.push(this.rawDestructor, ptr);
              }
            }
            break;
  
          default:
            throwBindingError('Unsupporting sharing policy');
        }
      }
      return ptr;
    }
  
  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError('null is not a valid ' + this.name);
        }
        return 0;
      }
  
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + handle.$$.ptrType.name + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  function simpleReadValueFromPointer(pointer) {
      return this['fromWireType'](HEAP32[((pointer)>>2)]);
    }
  
  function RegisteredPointer_getPointee(ptr) {
      if (this.rawGetPointee) {
        ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }
  
  function RegisteredPointer_destructor(ptr) {
      if (this.rawDestructor) {
        this.rawDestructor(ptr);
      }
    }
  
  function RegisteredPointer_deleteObject(handle) {
      if (handle !== null) {
        handle['delete']();
      }
    }
  function init_RegisteredPointer() {
      RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
      RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
      RegisteredPointer.prototype['argPackAdvance'] = 8;
      RegisteredPointer.prototype['readValueFromPointer'] = simpleReadValueFromPointer;
      RegisteredPointer.prototype['deleteObject'] = RegisteredPointer_deleteObject;
      RegisteredPointer.prototype['fromWireType'] = RegisteredPointer_fromWireType;
    }
  /** @constructor
      @param {*=} pointeeType,
      @param {*=} sharingPolicy,
      @param {*=} rawGetPointee,
      @param {*=} rawConstructor,
      @param {*=} rawShare,
      @param {*=} rawDestructor,
       */
  function RegisteredPointer(
      name,
      registeredClass,
      isReference,
      isConst,
  
      // smart pointer properties
      isSmartPointer,
      pointeeType,
      sharingPolicy,
      rawGetPointee,
      rawConstructor,
      rawShare,
      rawDestructor
    ) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;
  
      // smart pointer properties
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;
  
      if (!isSmartPointer && registeredClass.baseClass === undefined) {
        if (isConst) {
          this['toWireType'] = constNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        } else {
          this['toWireType'] = nonConstNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        }
      } else {
        this['toWireType'] = genericPointerToWireType;
        // Here we must leave this.destructorFunction undefined, since whether genericPointerToWireType returns
        // a pointer that needs to be freed up is runtime-dependent, and cannot be evaluated at registration time.
        // TODO: Create an alternative mechanism that allows removing the use of var destructors = []; array in
        //       craftInvokerFunction altogether.
      }
    }
  
  /** @param {number=} numArguments */
  function replacePublicSymbol(name, value, numArguments) {
      if (!Module.hasOwnProperty(name)) {
        throwInternalError('Replacing nonexistant public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
        Module[name].overloadTable[numArguments] = value;
      }
      else {
        Module[name] = value;
        Module[name].argCount = numArguments;
      }
    }
  
  function dynCallLegacy(sig, ptr, args) {
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - dynCall function not found for sig \'' + sig + '\'');
      if (args && args.length) {
        // j (64-bit integer) must be passed in as two numbers [low 32, high 32].
        assert(args.length === sig.substring(1).replace(/j/g, '--').length);
      } else {
        assert(sig.length == 1);
      }
      var f = Module['dynCall_' + sig];
      return args && args.length ? f.apply(null, [ptr].concat(args)) : f.call(null, ptr);
    }
  
  var wasmTableMirror = [];
  function getWasmTableEntry(funcPtr) {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
      return func;
    }
  /** @param {Object=} args */
  function dynCall(sig, ptr, args) {
      return dynCallLegacy(sig, ptr, args);
    }
  function getDynCaller(sig, ptr) {
      var argCache = [];
      return function() {
        argCache.length = 0;
        Object.assign(argCache, arguments);
        return dynCall(sig, ptr, argCache);
      };
    }
  function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
  
      function makeDynCaller() {
        return getDynCaller(signature, rawFunction);
      }
  
      var fp = makeDynCaller();
      if (typeof fp != "function") {
          throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
  
  var UnboundTypeError = undefined;
  
  function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }
  function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
        if (seen[type]) {
          return;
        }
        if (registeredTypes[type]) {
          return;
        }
        if (typeDependencies[type]) {
          typeDependencies[type].forEach(visit);
          return;
        }
        unboundTypes.push(type);
        seen[type] = true;
      }
      types.forEach(visit);
  
      throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
    }
  function __embind_register_class(rawType,
                                     rawPointerType,
                                     rawConstPointerType,
                                     baseClassRawType,
                                     getActualTypeSignature,
                                     getActualType,
                                     upcastSignature,
                                     upcast,
                                     downcastSignature,
                                     downcast,
                                     name,
                                     destructorSignature,
                                     rawDestructor) {
      name = readLatin1String(name);
      getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
      if (upcast) {
        upcast = embind__requireFunction(upcastSignature, upcast);
      }
      if (downcast) {
        downcast = embind__requireFunction(downcastSignature, downcast);
      }
      rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);
  
      exposePublicSymbol(legalFunctionName, function() {
        // this code cannot run if baseClassRawType is zero
        throwUnboundTypeError('Cannot construct ' + name + ' due to unbound types', [baseClassRawType]);
      });
  
      whenDependentTypesAreResolved(
        [rawType, rawPointerType, rawConstPointerType],
        baseClassRawType ? [baseClassRawType] : [],
        function(base) {
          base = base[0];
  
          var baseClass;
          var basePrototype;
          if (baseClassRawType) {
            baseClass = base.registeredClass;
            basePrototype = baseClass.instancePrototype;
          } else {
            basePrototype = ClassHandle.prototype;
          }
  
          var constructor = createNamedFunction(legalFunctionName, function() {
            if (Object.getPrototypeOf(this) !== instancePrototype) {
              throw new BindingError("Use 'new' to construct " + name);
            }
            if (undefined === registeredClass.constructor_body) {
              throw new BindingError(name + " has no accessible constructor");
            }
            var body = registeredClass.constructor_body[arguments.length];
            if (undefined === body) {
              throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
            }
            return body.apply(this, arguments);
          });
  
          var instancePrototype = Object.create(basePrototype, {
            constructor: { value: constructor },
          });
  
          constructor.prototype = instancePrototype;
  
          var registeredClass = new RegisteredClass(name,
                                                    constructor,
                                                    instancePrototype,
                                                    rawDestructor,
                                                    baseClass,
                                                    getActualType,
                                                    upcast,
                                                    downcast);
  
          var referenceConverter = new RegisteredPointer(name,
                                                         registeredClass,
                                                         true,
                                                         false,
                                                         false);
  
          var pointerConverter = new RegisteredPointer(name + '*',
                                                       registeredClass,
                                                       false,
                                                       false,
                                                       false);
  
          var constPointerConverter = new RegisteredPointer(name + ' const*',
                                                            registeredClass,
                                                            false,
                                                            true,
                                                            false);
  
          registeredPointers[rawType] = {
            pointerType: pointerConverter,
            constPointerType: constPointerConverter
          };
  
          replacePublicSymbol(legalFunctionName, constructor);
  
          return [referenceConverter, pointerConverter, constPointerConverter];
        }
      );
    }

  function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
          // TODO(https://github.com/emscripten-core/emscripten/issues/17310):
          // Find a way to hoist the `>> 2` or `>> 3` out of this loop.
          array.push(HEAPU32[(((firstElement)+(i * 4))>>2)]);
      }
      return array;
    }
  
  function runDestructors(destructors) {
      while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr);
      }
    }
  
  function new_(constructor, argumentList) {
      if (!(constructor instanceof Function)) {
        throw new TypeError('new_ called with constructor type ' + typeof(constructor) + " which is not a function");
      }
      /*
       * Previously, the following line was just:
       *   function dummy() {};
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even
       * though at creation, the 'dummy' has the correct constructor name.  Thus,
       * objects created with IMVU.new would show up in the debugger as 'dummy',
       * which isn't very helpful.  Using IMVU.createNamedFunction addresses the
       * issue.  Doublely-unfortunately, there's no way to write a test for this
       * behavior.  -NRD 2013.02.22
       */
      var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function(){});
      dummy.prototype = constructor.prototype;
      var obj = new dummy;
  
      var r = constructor.apply(obj, argumentList);
      return (r instanceof Object) ? r : obj;
    }
  
  function runAndAbortIfError(func) {
      try {
        return func();
      } catch (e) {
        abort(e);
      }
    }
  
  function handleException(e) {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to ' + STACK_SIZE + ')');
        }
      }
      quit_(1, e);
    }
  function callUserCallback(func) {
      if (ABORT) {
        err('user callback triggered after runtime exited or application aborted.  Ignoring.');
        return;
      }
      try {
        func();
      } catch (e) {
        handleException(e);
      }
    }
  
  function sigToWasmTypes(sig) {
      var typeNames = {
        'i': 'i32',
        // i64 values will be split into two i32s.
        'j': 'i32',
        'f': 'f32',
        'd': 'f64',
        'p': 'i32',
      };
      var type = {
        parameters: [],
        results: sig[0] == 'v' ? [] : [typeNames[sig[0]]]
      };
      for (var i = 1; i < sig.length; ++i) {
        assert(sig[i] in typeNames, 'invalid signature char: ' + sig[i]);
        type.parameters.push(typeNames[sig[i]]);
        if (sig[i] === 'j') {
          type.parameters.push('i32');
        }
      }
      return type;
    }
  
  function runtimeKeepalivePush() {
    }
  
  function runtimeKeepalivePop() {
    }
  var Asyncify = {instrumentWasmImports:function(imports) {
        var ASYNCIFY_IMPORTS = ["env.invoke_*","env.emscripten_sleep","env.emscripten_wget","env.emscripten_wget_data","env.emscripten_idb_load","env.emscripten_idb_store","env.emscripten_idb_delete","env.emscripten_idb_exists","env.emscripten_idb_load_blob","env.emscripten_idb_store_blob","env.SDL_Delay","env.emscripten_scan_registers","env.emscripten_lazy_load_code","env.emscripten_fiber_swap","wasi_snapshot_preview1.fd_sync","env.__wasi_fd_sync","env._emval_await","env._dlopen_js","env.__asyncjs__*"].map((x) => x.split('.')[1]);
        for (var x in imports) {
          (function(x) {
            var original = imports[x];
            var sig = original.sig;
            if (typeof original == 'function') {
              var isAsyncifyImport = ASYNCIFY_IMPORTS.indexOf(x) >= 0 ||
                                     x.startsWith('__asyncjs__');
              imports[x] = function() {
                var originalAsyncifyState = Asyncify.state;
                try {
                  return original.apply(null, arguments);
                } finally {
                  // Only asyncify-declared imports are allowed to change the
                  // state.
                  // Changing the state from normal to disabled is allowed (in any
                  // function) as that is what shutdown does (and we don't have an
                  // explicit list of shutdown imports).
                  var changedToDisabled =
                        originalAsyncifyState === Asyncify.State.Normal &&
                        Asyncify.state        === Asyncify.State.Disabled;
                  // invoke_* functions are allowed to change the state if we do
                  // not ignore indirect calls.
                  var ignoredInvoke = x.startsWith('invoke_') &&
                                      true;
                  if (Asyncify.state !== originalAsyncifyState &&
                      !isAsyncifyImport &&
                      !changedToDisabled &&
                      !ignoredInvoke) {
                    throw new Error('import ' + x + ' was not in ASYNCIFY_IMPORTS, but changed the state');
                  }
                }
              };
            }
          })(x);
        }
      },instrumentWasmExports:function(exports) {
        var ret = {};
        for (var x in exports) {
          (function(x) {
            var original = exports[x];
            if (typeof original == 'function') {
              ret[x] = function() {
                Asyncify.exportCallStack.push(x);
                try {
                  return original.apply(null, arguments);
                } finally {
                  if (!ABORT) {
                    var y = Asyncify.exportCallStack.pop();
                    assert(y === x);
                    Asyncify.maybeStopUnwind();
                  }
                }
              };
            } else {
              ret[x] = original;
            }
          })(x);
        }
        return ret;
      },State:{Normal:0,Unwinding:1,Rewinding:2,Disabled:3},state:0,StackSize:4096,currData:null,handleSleepReturnValue:0,exportCallStack:[],callStackNameToId:{},callStackIdToName:{},callStackId:0,asyncPromiseHandlers:null,sleepCallbacks:[],getCallStackId:function(funcName) {
        var id = Asyncify.callStackNameToId[funcName];
        if (id === undefined) {
          id = Asyncify.callStackId++;
          Asyncify.callStackNameToId[funcName] = id;
          Asyncify.callStackIdToName[id] = funcName;
        }
        return id;
      },maybeStopUnwind:function() {
        if (Asyncify.currData &&
            Asyncify.state === Asyncify.State.Unwinding &&
            Asyncify.exportCallStack.length === 0) {
          // We just finished unwinding.
          // Be sure to set the state before calling any other functions to avoid
          // possible infinite recursion here (For example in debug pthread builds
          // the dbg() function itself can call back into WebAssembly to get the
          // current pthread_self() pointer).
          Asyncify.state = Asyncify.State.Normal;
          
          // Keep the runtime alive so that a re-wind can be done later.
          runAndAbortIfError(_asyncify_stop_unwind);
          if (typeof Fibers != 'undefined') {
            Fibers.trampoline();
          }
        }
      },whenDone:function() {
        assert(Asyncify.currData, 'Tried to wait for an async operation when none is in progress.');
        assert(!Asyncify.asyncPromiseHandlers, 'Cannot have multiple async operations in flight at once');
        return new Promise((resolve, reject) => {
          Asyncify.asyncPromiseHandlers = {
            resolve: resolve,
            reject: reject
          };
        });
      },allocateData:function() {
        // An asyncify data structure has three fields:
        //  0  current stack pos
        //  4  max stack pos
        //  8  id of function at bottom of the call stack (callStackIdToName[id] == name of js function)
        //
        // The Asyncify ABI only interprets the first two fields, the rest is for the runtime.
        // We also embed a stack in the same memory region here, right next to the structure.
        // This struct is also defined as asyncify_data_t in emscripten/fiber.h
        var ptr = _malloc(12 + Asyncify.StackSize);
        Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
        Asyncify.setDataRewindFunc(ptr);
        return ptr;
      },setDataHeader:function(ptr, stack, stackSize) {
        HEAP32[((ptr)>>2)] = stack;
        HEAP32[(((ptr)+(4))>>2)] = stack + stackSize;
      },setDataRewindFunc:function(ptr) {
        var bottomOfCallStack = Asyncify.exportCallStack[0];
        var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
        HEAP32[(((ptr)+(8))>>2)] = rewindId;
      },getDataRewindFunc:function(ptr) {
        var id = HEAP32[(((ptr)+(8))>>2)];
        var name = Asyncify.callStackIdToName[id];
        var func = Module['asm'][name];
        return func;
      },doRewind:function(ptr) {
        var start = Asyncify.getDataRewindFunc(ptr);
        // Once we have rewound and the stack we no longer need to artificially
        // keep the runtime alive.
        
        return start();
      },handleSleep:function(startAsync) {
        assert(Asyncify.state !== Asyncify.State.Disabled, 'Asyncify cannot be done during or after the runtime exits');
        if (ABORT) return;
        if (Asyncify.state === Asyncify.State.Normal) {
          // Prepare to sleep. Call startAsync, and see what happens:
          // if the code decided to call our callback synchronously,
          // then no async operation was in fact begun, and we don't
          // need to do anything.
          var reachedCallback = false;
          var reachedAfterCallback = false;
          startAsync((handleSleepReturnValue) => {
            assert(!handleSleepReturnValue || typeof handleSleepReturnValue == 'number' || typeof handleSleepReturnValue == 'boolean'); // old emterpretify API supported other stuff
            if (ABORT) return;
            Asyncify.handleSleepReturnValue = handleSleepReturnValue || 0;
            reachedCallback = true;
            if (!reachedAfterCallback) {
              // We are happening synchronously, so no need for async.
              return;
            }
            // This async operation did not happen synchronously, so we did
            // unwind. In that case there can be no compiled code on the stack,
            // as it might break later operations (we can rewind ok now, but if
            // we unwind again, we would unwind through the extra compiled code
            // too).
            assert(!Asyncify.exportCallStack.length, 'Waking up (starting to rewind) must be done from JS, without compiled code on the stack.');
            Asyncify.state = Asyncify.State.Rewinding;
            runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
            if (typeof Browser != 'undefined' && Browser.mainLoop.func) {
              Browser.mainLoop.resume();
            }
            var asyncWasmReturnValue, isError = false;
            try {
              asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData);
            } catch (err) {
              asyncWasmReturnValue = err;
              isError = true;
            }
            // Track whether the return value was handled by any promise handlers.
            var handled = false;
            if (!Asyncify.currData) {
              // All asynchronous execution has finished.
              // `asyncWasmReturnValue` now contains the final
              // return value of the exported async WASM function.
              //
              // Note: `asyncWasmReturnValue` is distinct from
              // `Asyncify.handleSleepReturnValue`.
              // `Asyncify.handleSleepReturnValue` contains the return
              // value of the last C function to have executed
              // `Asyncify.handleSleep()`, where as `asyncWasmReturnValue`
              // contains the return value of the exported WASM function
              // that may have called C functions that
              // call `Asyncify.handleSleep()`.
              var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
              if (asyncPromiseHandlers) {
                Asyncify.asyncPromiseHandlers = null;
                (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
                handled = true;
              }
            }
            if (isError && !handled) {
              // If there was an error and it was not handled by now, we have no choice but to
              // rethrow that error into the global scope where it can be caught only by
              // `onerror` or `onunhandledpromiserejection`.
              throw asyncWasmReturnValue;
            }
          });
          reachedAfterCallback = true;
          if (!reachedCallback) {
            // A true async operation was begun; start a sleep.
            Asyncify.state = Asyncify.State.Unwinding;
            // TODO: reuse, don't alloc/free every sleep
            Asyncify.currData = Asyncify.allocateData();
            if (typeof Browser != 'undefined' && Browser.mainLoop.func) {
              Browser.mainLoop.pause();
            }
            runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData));
          }
        } else if (Asyncify.state === Asyncify.State.Rewinding) {
          // Stop a resume.
          Asyncify.state = Asyncify.State.Normal;
          runAndAbortIfError(_asyncify_stop_rewind);
          _free(Asyncify.currData);
          Asyncify.currData = null;
          // Call all sleep callbacks now that the sleep-resume is all done.
          Asyncify.sleepCallbacks.forEach((func) => callUserCallback(func));
        } else {
          abort('invalid state: ' + Asyncify.state);
        }
        return Asyncify.handleSleepReturnValue;
      },handleAsync:function(startAsync) {
        return Asyncify.handleSleep((wakeUp) => {
          // TODO: add error handling as a second param when handleSleep implements it.
          startAsync().then(wakeUp);
        });
      }};
  function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      var argCount = argTypes.length;
  
      if (argCount < 2) {
        throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
  
      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  
      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
  // TODO: This omits argument count check - enable only at -O3 or similar.
  //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == "void" && !isClassMethodFunc) {
  //       return FUNCTION_TABLE[fn];
  //    }
  
      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = false;
  
      for (var i = 1; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here.
        if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) { // The type does not define a destructor function - must use dynamic stack
          needsDestructorStack = true;
          break;
        }
      }
  
      var returns = (argTypes[0].name !== "void");
  
      var argsList = "";
      var argsListWired = "";
      for (var i = 0; i < argCount - 2; ++i) {
        argsList += (i!==0?", ":"")+"arg"+i;
        argsListWired += (i!==0?", ":"")+"arg"+i+"Wired";
      }
  
      var invokerFnBody =
          "return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n" +
          "if (arguments.length !== "+(argCount - 2)+") {\n" +
              "throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount - 2)+" args!');\n" +
          "}\n";
  
      if (needsDestructorStack) {
        invokerFnBody += "var destructors = [];\n";
      }
  
      var dtorStack = needsDestructorStack ? "destructors" : "null";
      var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
      var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
  
      if (isClassMethodFunc) {
        invokerFnBody += "var thisWired = classParam.toWireType("+dtorStack+", this);\n";
      }
  
      for (var i = 0; i < argCount - 2; ++i) {
        invokerFnBody += "var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";
        args1.push("argType"+i);
        args2.push(argTypes[i+2]);
      }
  
      if (isClassMethodFunc) {
        argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
      }
  
      invokerFnBody +=
          (returns?"var rv = ":"") + "invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";
  
      args1.push("Asyncify");
      args2.push(Asyncify);
      invokerFnBody += "function onDone(" + (returns ? "rv" : "") + ") {\n";
  
      if (needsDestructorStack) {
        invokerFnBody += "runDestructors(destructors);\n";
      } else {
        for (var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
          var paramName = (i === 1 ? "thisWired" : ("arg"+(i - 2)+"Wired"));
          if (argTypes[i].destructorFunction !== null) {
            invokerFnBody += paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";
            args1.push(paramName+"_dtor");
            args2.push(argTypes[i].destructorFunction);
          }
        }
      }
  
      if (returns) {
        invokerFnBody += "var ret = retType.fromWireType(rv);\n" +
                         "return ret;\n";
      } else {
      }
  
      invokerFnBody += "}\n";
      invokerFnBody += "return Asyncify.currData ? Asyncify.whenDone().then(onDone) : onDone(" + (returns ? "rv" : "") +");\n"
  
      invokerFnBody += "}\n";
  
      args1.push(invokerFnBody);
  
      var invokerFunction = new_(Function, args1).apply(null, args2);
      return invokerFunction;
    }
  function __embind_register_class_constructor(
      rawClassType,
      argCount,
      rawArgTypesAddr,
      invokerSignature,
      invoker,
      rawConstructor
    ) {
      assert(argCount > 0);
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      invoker = embind__requireFunction(invokerSignature, invoker);
      var args = [rawConstructor];
      var destructors = [];
  
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
        classType = classType[0];
        var humanName = 'constructor ' + classType.name;
  
        if (undefined === classType.registeredClass.constructor_body) {
          classType.registeredClass.constructor_body = [];
        }
        if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
          throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount-1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
        }
        classType.registeredClass.constructor_body[argCount - 1] = () => {
          throwUnboundTypeError('Cannot construct ' + classType.name + ' due to unbound types', rawArgTypes);
        };
  
        whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
          // Insert empty slot for context type (argTypes[1]).
          argTypes.splice(1, 0, null);
          classType.registeredClass.constructor_body[argCount - 1] = craftInvokerFunction(humanName, argTypes, null, invoker, rawConstructor);
          return [];
        });
        return [];
      });
    }

  function __embind_register_class_function(rawClassType,
                                              methodName,
                                              argCount,
                                              rawArgTypesAddr, // [ReturnType, ThisType, Args...]
                                              invokerSignature,
                                              rawInvoker,
                                              context,
                                              isPureVirtual) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
  
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
        classType = classType[0];
        var humanName = classType.name + '.' + methodName;
  
        if (methodName.startsWith("@@")) {
          methodName = Symbol[methodName.substring(2)];
        }
  
        if (isPureVirtual) {
          classType.registeredClass.pureVirtualFunctions.push(methodName);
        }
  
        function unboundTypesHandler() {
          throwUnboundTypeError('Cannot call ' + humanName + ' due to unbound types', rawArgTypes);
        }
  
        var proto = classType.registeredClass.instancePrototype;
        var method = proto[methodName];
        if (undefined === method || (undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2)) {
          // This is the first overload to be registered, OR we are replacing a
          // function in the base class with a function in the derived class.
          unboundTypesHandler.argCount = argCount - 2;
          unboundTypesHandler.className = classType.name;
          proto[methodName] = unboundTypesHandler;
        } else {
          // There was an existing function with the same name registered. Set up
          // a function overload routing table.
          ensureOverloadTable(proto, methodName, humanName);
          proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
        }
  
        whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
          var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
  
          // Replace the initial unbound-handler-stub function with the appropriate member function, now that all types
          // are resolved. If multiple overloads are registered for this function, the function goes into an overload table.
          if (undefined === proto[methodName].overloadTable) {
            // Set argCount in case an overload is registered later
            memberFunction.argCount = argCount - 2;
            proto[methodName] = memberFunction;
          } else {
            proto[methodName].overloadTable[argCount - 2] = memberFunction;
          }
  
          return [];
        });
        return [];
      });
    }

  var emval_free_list = [];
  
  var emval_handle_array = [{},{value:undefined},{value:null},{value:true},{value:false}];
  function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
        emval_handle_array[handle] = undefined;
        emval_free_list.push(handle);
      }
    }
  
  function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== undefined) {
          ++count;
        }
      }
      return count;
    }
  
  function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== undefined) {
          return emval_handle_array[i];
        }
      }
      return null;
    }
  function init_emval() {
      Module['count_emval_handles'] = count_emval_handles;
      Module['get_first_emval'] = get_first_emval;
    }
  var Emval = {toValue:(handle) => {
        if (!handle) {
            throwBindingError('Cannot use deleted val. handle = ' + handle);
        }
        return emval_handle_array[handle].value;
      },toHandle:(value) => {
        switch (value) {
          case undefined: return 1;
          case null: return 2;
          case true: return 3;
          case false: return 4;
          default:{
            var handle = emval_free_list.length ?
                emval_free_list.pop() :
                emval_handle_array.length;
  
            emval_handle_array[handle] = {refcount: 1, value: value};
            return handle;
          }
        }
      }};
  function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
        name: name,
        'fromWireType': function(handle) {
          var rv = Emval.toValue(handle);
          __emval_decref(handle);
          return rv;
        },
        'toWireType': function(destructors, value) {
          return Emval.toHandle(value);
        },
        'argPackAdvance': 8,
        'readValueFromPointer': simpleReadValueFromPointer,
        destructorFunction: null, // This type does not need a destructor
  
        // TODO: do we need a deleteObject here?  write a test where
        // emval is passed into JS via an interface
      });
    }

  function embindRepr(v) {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    }
  
  function floatReadValueFromPointer(name, shift) {
      switch (shift) {
          case 2: return function(pointer) {
              return this['fromWireType'](HEAPF32[pointer >> 2]);
          };
          case 3: return function(pointer) {
              return this['fromWireType'](HEAPF64[pointer >> 3]);
          };
          default:
              throw new TypeError("Unknown float type: " + name);
      }
    }
  function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, {
        name: name,
        'fromWireType': function(value) {
           return value;
        },
        'toWireType': function(destructors, value) {
          if (typeof value != "number" && typeof value != "boolean") {
            throw new TypeError('Cannot convert "' + embindRepr(value) + '" to ' + this.name);
          }
          // The VM will perform JS to Wasm value conversion, according to the spec:
          // https://www.w3.org/TR/wasm-js-api-1/#towebassemblyvalue
          return value;
        },
        'argPackAdvance': 8,
        'readValueFromPointer': floatReadValueFromPointer(name, shift),
        destructorFunction: null, // This type does not need a destructor
      });
    }

  function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn) {
      var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      name = readLatin1String(name);
  
      rawInvoker = embind__requireFunction(signature, rawInvoker);
  
      exposePublicSymbol(name, function() {
        throwUnboundTypeError('Cannot call ' + name + ' due to unbound types', argTypes);
      }, argCount - 1);
  
      whenDependentTypesAreResolved([], argTypes, function(argTypes) {
        var invokerArgsArray = [argTypes[0] /* return value */, null /* no class 'this'*/].concat(argTypes.slice(1) /* actual params */);
        replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null /* no class 'this'*/, rawInvoker, fn), argCount - 1);
        return [];
      });
    }

  function integerReadValueFromPointer(name, shift, signed) {
      // integers are quite common, so generate very specialized functions
      switch (shift) {
          case 0: return signed ?
              function readS8FromPointer(pointer) { return HEAP8[pointer]; } :
              function readU8FromPointer(pointer) { return HEAPU8[pointer]; };
          case 1: return signed ?
              function readS16FromPointer(pointer) { return HEAP16[pointer >> 1]; } :
              function readU16FromPointer(pointer) { return HEAPU16[pointer >> 1]; };
          case 2: return signed ?
              function readS32FromPointer(pointer) { return HEAP32[pointer >> 2]; } :
              function readU32FromPointer(pointer) { return HEAPU32[pointer >> 2]; };
          default:
              throw new TypeError("Unknown integer type: " + name);
      }
    }
  function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      // LLVM doesn't have signed and unsigned 32-bit types, so u32 literals come
      // out as 'i32 -1'. Always treat those as max u32.
      if (maxRange === -1) {
          maxRange = 4294967295;
      }
  
      var shift = getShiftFromSize(size);
  
      var fromWireType = (value) => value;
  
      if (minRange === 0) {
          var bitshift = 32 - 8*size;
          fromWireType = (value) => (value << bitshift) >>> bitshift;
      }
  
      var isUnsignedType = (name.includes('unsigned'));
      var checkAssertions = (value, toTypeName) => {
        if (typeof value != "number" && typeof value != "boolean") {
          throw new TypeError('Cannot convert "' + embindRepr(value) + '" to ' + toTypeName);
        }
        if (value < minRange || value > maxRange) {
          throw new TypeError('Passing a number "' + embindRepr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ', ' + maxRange + ']!');
        }
      }
      var toWireType;
      if (isUnsignedType) {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value >>> 0;
        }
      } else {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          // The VM will perform JS to Wasm value conversion, according to the spec:
          // https://www.w3.org/TR/wasm-js-api-1/#towebassemblyvalue
          return value;
        }
      }
      registerType(primitiveType, {
        name: name,
        'fromWireType': fromWireType,
        'toWireType': toWireType,
        'argPackAdvance': 8,
        'readValueFromPointer': integerReadValueFromPointer(name, shift, minRange !== 0),
        destructorFunction: null, // This type does not need a destructor
      });
    }

  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [
        Int8Array,
        Uint8Array,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
      ];
  
      var TA = typeMapping[dataTypeIndex];
  
      function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle]; // in elements
        var data = heap[handle + 1]; // byte offset into emscripten heap
        return new TA(buffer, data, size);
      }
  
      name = readLatin1String(name);
      registerType(rawType, {
        name: name,
        'fromWireType': decodeMemoryView,
        'argPackAdvance': 8,
        'readValueFromPointer': decodeMemoryView,
      }, {
        ignoreDuplicateRegistrations: true,
      });
    }

  function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      var stdStringIsUTF8
      //process only std::string bindings with UTF8 support, in contrast to e.g. std::basic_string<unsigned char>
      = (name === "std::string");
  
      registerType(rawType, {
        name: name,
        'fromWireType': function(value) {
          var length = HEAPU32[((value)>>2)];
          var payload = value + 4;
  
          var str;
          if (stdStringIsUTF8) {
            var decodeStartPtr = payload;
            // Looping here to support possible embedded '0' bytes
            for (var i = 0; i <= length; ++i) {
              var currentBytePtr = payload + i;
              if (i == length || HEAPU8[currentBytePtr] == 0) {
                var maxRead = currentBytePtr - decodeStartPtr;
                var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
                if (str === undefined) {
                  str = stringSegment;
                } else {
                  str += String.fromCharCode(0);
                  str += stringSegment;
                }
                decodeStartPtr = currentBytePtr + 1;
              }
            }
          } else {
            var a = new Array(length);
            for (var i = 0; i < length; ++i) {
              a[i] = String.fromCharCode(HEAPU8[payload + i]);
            }
            str = a.join('');
          }
  
          _free(value);
  
          return str;
        },
        'toWireType': function(destructors, value) {
          if (value instanceof ArrayBuffer) {
            value = new Uint8Array(value);
          }
  
          var length;
          var valueIsOfTypeString = (typeof value == 'string');
  
          if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
            throwBindingError('Cannot pass non-string to std::string');
          }
          if (stdStringIsUTF8 && valueIsOfTypeString) {
            length = lengthBytesUTF8(value);
          } else {
            length = value.length;
          }
  
          // assumes 4-byte alignment
          var base = _malloc(4 + length + 1);
          var ptr = base + 4;
          HEAPU32[((base)>>2)] = length;
          if (stdStringIsUTF8 && valueIsOfTypeString) {
            stringToUTF8(value, ptr, length + 1);
          } else {
            if (valueIsOfTypeString) {
              for (var i = 0; i < length; ++i) {
                var charCode = value.charCodeAt(i);
                if (charCode > 255) {
                  _free(ptr);
                  throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                }
                HEAPU8[ptr + i] = charCode;
              }
            } else {
              for (var i = 0; i < length; ++i) {
                HEAPU8[ptr + i] = value[i];
              }
            }
          }
  
          if (destructors !== null) {
            destructors.push(_free, base);
          }
          return base;
        },
        'argPackAdvance': 8,
        'readValueFromPointer': simpleReadValueFromPointer,
        destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  var UTF16Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf-16le') : undefined;;
  function UTF16ToString(ptr, maxBytesToRead) {
      assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
      var endPtr = ptr;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.
      // Also, use the length info to avoid running tiny strings through
      // TextDecoder, since .subarray() allocates garbage.
      var idx = endPtr >> 1;
      var maxIdx = idx + maxBytesToRead / 2;
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
      endPtr = idx << 1;
  
      if (endPtr - ptr > 32 && UTF16Decoder)
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  
      // Fallback: decode without UTF16Decoder
      var str = '';
  
      // If maxBytesToRead is not passed explicitly, it will be undefined, and the
      // for-loop's condition will always evaluate to true. The loop is then
      // terminated on the first null char.
      for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
        if (codeUnit == 0) break;
        // fromCharCode constructs a character from a UTF-16 code unit, so we can
        // pass the UTF16 string right through.
        str += String.fromCharCode(codeUnit);
      }
  
      return str;
    }
  
  function stringToUTF16(str, outPtr, maxBytesToWrite) {
      assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 0x7FFFFFFF;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2; // Null terminator.
      var startPtr = outPtr;
      var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
        var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
        HEAP16[((outPtr)>>1)] = codeUnit;
        outPtr += 2;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP16[((outPtr)>>1)] = 0;
      return outPtr - startPtr;
    }
  
  function lengthBytesUTF16(str) {
      return str.length*2;
    }
  
  function UTF32ToString(ptr, maxBytesToRead) {
      assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
      var i = 0;
  
      var str = '';
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
        if (utf32 == 0) break;
        ++i;
        // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        if (utf32 >= 0x10000) {
          var ch = utf32 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    }
  
  function stringToUTF32(str, outPtr, maxBytesToWrite) {
      assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 0x7FFFFFFF;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
        }
        HEAP32[((outPtr)>>2)] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP32[((outPtr)>>2)] = 0;
      return outPtr - startPtr;
    }
  
  function lengthBytesUTF32(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
        len += 4;
      }
  
      return len;
    }
  function __embind_register_std_wstring(rawType, charSize, name) {
      name = readLatin1String(name);
      var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
      if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        getHeap = () => HEAPU16;
        shift = 1;
      } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        getHeap = () => HEAPU32;
        shift = 2;
      }
      registerType(rawType, {
        name: name,
        'fromWireType': function(value) {
          // Code mostly taken from _embind_register_std_string fromWireType
          var length = HEAPU32[value >> 2];
          var HEAP = getHeap();
          var str;
  
          var decodeStartPtr = value + 4;
          // Looping here to support possible embedded '0' bytes
          for (var i = 0; i <= length; ++i) {
            var currentBytePtr = value + 4 + i * charSize;
            if (i == length || HEAP[currentBytePtr >> shift] == 0) {
              var maxReadBytes = currentBytePtr - decodeStartPtr;
              var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
              if (str === undefined) {
                str = stringSegment;
              } else {
                str += String.fromCharCode(0);
                str += stringSegment;
              }
              decodeStartPtr = currentBytePtr + charSize;
            }
          }
  
          _free(value);
  
          return str;
        },
        'toWireType': function(destructors, value) {
          if (!(typeof value == 'string')) {
            throwBindingError('Cannot pass non-string to C++ string type ' + name);
          }
  
          // assumes 4-byte alignment
          var length = lengthBytesUTF(value);
          var ptr = _malloc(4 + length + charSize);
          HEAPU32[ptr >> 2] = length >> shift;
  
          encodeString(value, ptr + 4, length + charSize);
  
          if (destructors !== null) {
            destructors.push(_free, ptr);
          }
          return ptr;
        },
        'argPackAdvance': 8,
        'readValueFromPointer': simpleReadValueFromPointer,
        destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          isVoid: true, // void return values can be optimized out sometimes
          name: name,
          'argPackAdvance': 0,
          'fromWireType': function() {
              return undefined;
          },
          'toWireType': function(destructors, o) {
              // TODO: assert if anything else is given?
              return undefined;
          },
      });
    }

  function __emscripten_dlopen_js(filename, flags, user_data, onsuccess, onerror) {
      abort(dlopenMissingError);
    }

  var nowIsMonotonic = true;;
  function __emscripten_get_now_is_monotonic() {
      return nowIsMonotonic;
    }

  function __emscripten_throw_longjmp() { throw Infinity; }


  function __emval_incref(handle) {
      if (handle > 4) {
        emval_handle_array[handle].refcount += 1;
      }
    }

  function requireRegisteredType(rawType, humanName) {
      var impl = registeredTypes[rawType];
      if (undefined === impl) {
          throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
      }
      return impl;
    }
  function __emval_take_value(type, arg) {
      type = requireRegisteredType(type, '_emval_take_value');
      var v = type['readValueFromPointer'](arg);
      return Emval.toHandle(v);
    }

  function readI53FromI64(ptr) {
      return HEAPU32[ptr>>2] + HEAP32[ptr+4>>2] * 4294967296;
    }
  function __gmtime_js(time, tmPtr) {
      var date = new Date(readI53FromI64(time)*1000);
      HEAP32[((tmPtr)>>2)] = date.getUTCSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getUTCMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getUTCHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getUTCDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getUTCMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getUTCFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = ((date.getTime() - start) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
    }

  function __isLeapYear(year) {
        return year%4 === 0 && (year%100 !== 0 || year%400 === 0);
    }
  
  var __MONTH_DAYS_LEAP_CUMULATIVE = [0,31,60,91,121,152,182,213,244,274,305,335];
  
  var __MONTH_DAYS_REGULAR_CUMULATIVE = [0,31,59,90,120,151,181,212,243,273,304,334];
  function __yday_from_date(date) {
      var isLeapYear = __isLeapYear(date.getFullYear());
      var monthDaysCumulative = (isLeapYear ? __MONTH_DAYS_LEAP_CUMULATIVE : __MONTH_DAYS_REGULAR_CUMULATIVE);
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1; // -1 since it's days since Jan 1
  
      return yday;
    }
  function __localtime_js(time, tmPtr) {
      var date = new Date(readI53FromI64(time)*1000);
      HEAP32[((tmPtr)>>2)] = date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();
  
      var yday = __yday_from_date(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      HEAP32[(((tmPtr)+(36))>>2)] = -(date.getTimezoneOffset() * 60);
  
      // Attention: DST is in December in South, and some regions don't have DST at all.
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset))|0;
      HEAP32[(((tmPtr)+(32))>>2)] = dst;
    }

  function __mktime_js(tmPtr) {
      var date = new Date(HEAP32[(((tmPtr)+(20))>>2)] + 1900,
                          HEAP32[(((tmPtr)+(16))>>2)],
                          HEAP32[(((tmPtr)+(12))>>2)],
                          HEAP32[(((tmPtr)+(8))>>2)],
                          HEAP32[(((tmPtr)+(4))>>2)],
                          HEAP32[((tmPtr)>>2)],
                          0);
  
      // There's an ambiguous hour when the time goes back; the tm_isdst field is
      // used to disambiguate it.  Date() basically guesses, so we fix it up if it
      // guessed wrong, or fill in tm_isdst with the guess if it's -1.
      var dst = HEAP32[(((tmPtr)+(32))>>2)];
      var guessedOffset = date.getTimezoneOffset();
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dstOffset = Math.min(winterOffset, summerOffset); // DST is in December in South
      if (dst < 0) {
        // Attention: some regions don't have DST at all.
        HEAP32[(((tmPtr)+(32))>>2)] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
      } else if ((dst > 0) != (dstOffset == guessedOffset)) {
        var nonDstOffset = Math.max(winterOffset, summerOffset);
        var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
        // Don't try setMinutes(date.getMinutes() + ...) -- it's messed up.
        date.setTime(date.getTime() + (trueOffset - guessedOffset)*60000);
      }
  
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();
      var yday = __yday_from_date(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      // To match expected behavior, update fields from date
      HEAP32[((tmPtr)>>2)] = date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getYear();
  
      return (date.getTime() / 1000)|0;
    }

  function __timegm_js(tmPtr) {
      var time = Date.UTC(HEAP32[(((tmPtr)+(20))>>2)] + 1900,
                          HEAP32[(((tmPtr)+(16))>>2)],
                          HEAP32[(((tmPtr)+(12))>>2)],
                          HEAP32[(((tmPtr)+(8))>>2)],
                          HEAP32[(((tmPtr)+(4))>>2)],
                          HEAP32[((tmPtr)>>2)],
                          0);
      var date = new Date(time);
  
      HEAP32[(((tmPtr)+(24))>>2)] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = ((date.getTime() - start) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
  
      return (date.getTime() / 1000)|0;
    }

  function allocateUTF8(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }
  function __tzset_js(timezone, daylight, tzname) {
      // TODO: Use (malleable) environment variables instead of system settings.
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
  
      // Local standard timezone offset. Local standard time is not adjusted for daylight savings.
      // This code uses the fact that getTimezoneOffset returns a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it compares whether the output of the given date the same (Standard) or less (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAPU32[((timezone)>>2)] = stdTimezoneOffset * 60;
  
      HEAP32[((daylight)>>2)] = Number(winterOffset != summerOffset);
  
      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : "GMT";
      };
      var winterName = extractZone(winter);
      var summerName = extractZone(summer);
      var winterNamePtr = allocateUTF8(winterName);
      var summerNamePtr = allocateUTF8(summerName);
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        HEAPU32[((tzname)>>2)] = winterNamePtr;
        HEAPU32[(((tzname)+(4))>>2)] = summerNamePtr;
      } else {
        HEAPU32[((tzname)>>2)] = summerNamePtr;
        HEAPU32[(((tzname)+(4))>>2)] = winterNamePtr;
      }
    }

  function _abort() {
      abort('native code called abort()');
    }

  var readAsmConstArgsArray = [];
  function readAsmConstArgs(sigPtr, buf) {
      // Nobody should have mutated _readAsmConstArgsArray underneath us to be something else than an array.
      assert(Array.isArray(readAsmConstArgsArray));
      // The input buffer is allocated on the stack, so it must be stack-aligned.
      assert(buf % 16 == 0);
      readAsmConstArgsArray.length = 0;
      var ch;
      // Most arguments are i32s, so shift the buffer pointer so it is a plain
      // index into HEAP32.
      buf >>= 2;
      while (ch = HEAPU8[sigPtr++]) {
        var chr = String.fromCharCode(ch);
        var validChars = ['d', 'f', 'i'];
        assert(validChars.includes(chr), 'Invalid character ' + ch + '("' + chr + '") in readAsmConstArgs! Use only [' + validChars + '], and do not specify "v" for void return argument.');
        // Floats are always passed as doubles, and doubles and int64s take up 8
        // bytes (two 32-bit slots) in memory, align reads to these:
        buf += (ch != 105/*i*/) & buf;
        readAsmConstArgsArray.push(
          ch == 105/*i*/ ? HEAP32[buf] :
         HEAPF64[buf++ >> 1]
        );
        ++buf;
      }
      return readAsmConstArgsArray;
    }
  function _emscripten_asm_const_int(code, sigPtr, argbuf) {
      var args = readAsmConstArgs(sigPtr, argbuf);
      if (!ASM_CONSTS.hasOwnProperty(code)) abort('No EM_ASM constant found at address ' + code);
      return ASM_CONSTS[code].apply(null, args);
    }

  function _emscripten_console_error(str) {
      assert(typeof str == 'number');
      console.error(UTF8ToString(str));
    }

  function _emscripten_date_now() {
      return Date.now();
    }

  function getHeapMax() {
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      return 2147483648;
    }
  function _emscripten_get_heap_max() {
      return getHeapMax();
    }

  var _emscripten_get_now;if (ENVIRONMENT_IS_NODE) {
    _emscripten_get_now = () => {
      var t = process['hrtime']();
      return t[0] * 1e3 + t[1] / 1e6;
    };
  } else _emscripten_get_now = () => performance.now();
  ;

  function _emscripten_get_now_res() { // return resolution of get_now, in nanoseconds
      if (ENVIRONMENT_IS_NODE) {
        return 1; // nanoseconds
      } else
      // Modern environment where performance.now() is supported:
      return 1000; // microseconds (1/1000 of a millisecond)
    }

  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }

  function emscripten_realloc_buffer(size) {
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow((size - buffer.byteLength + 65535) >>> 16); // .grow() takes a delta compared to the previous size
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1 /*success*/;
      } catch(e) {
        err('emscripten_realloc_buffer: Attempted to grow heap from ' + buffer.byteLength  + ' bytes to ' + size + ' bytes, but got error: ' + e);
      }
      // implicit 0 return to save code size (caller will cast "undefined" into 0
      // anyhow)
    }
  function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      // With multithreaded builds, races can happen (another thread might increase the size
      // in between), so return a failure, and let the caller retry.
      assert(requestedSize > oldSize);
  
      // Memory resize rules:
      // 1.  Always increase heap size to at least the requested size, rounded up
      //     to next page multiple.
      // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
      //     geometrically: increase the heap size according to
      //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
      //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
      //     linearly: increase the heap size by at least
      //     MEMORY_GROWTH_LINEAR_STEP bytes.
      // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
      //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 4.  If we were unable to allocate as much memory, it may be due to
      //     over-eager decision to excessively reserve due to (3) above.
      //     Hence if an allocation fails, cut down on the amount of excess
      //     growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit is set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err('Cannot enlarge memory, asked to go up to ' + requestedSize + ' bytes, but the limit is ' + maxHeapSize + ' bytes!');
        return false;
      }
  
      let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
  
      // Loop through potential heap size increases. If we attempt a too eager
      // reservation that fails, cut down on the attempted size and reserve a
      // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
  
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
  
          return true;
        }
      }
      err('Failed to grow the heap from ' + oldSize + ' bytes to ' + newSize + ' bytes, not enough memory!');
      return false;
    }

  var ENV = {};
  
  function getExecutableName() {
      return thisProgram || './this.program';
    }
  function getEnvStrings() {
      if (!getEnvStrings.strings) {
        // Default values.
        // Browser language detection #8751
        var lang = ((typeof navigator == 'object' && navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(x + '=' + env[x]);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    }
  
  /** @param {boolean=} dontAddNull */
  function writeAsciiToMemory(str, buffer, dontAddNull) {
      for (var i = 0; i < str.length; ++i) {
        assert(str.charCodeAt(i) === (str.charCodeAt(i) & 0xff));
        HEAP8[((buffer++)>>0)] = str.charCodeAt(i);
      }
      // Null-terminate the pointer to the HEAP.
      if (!dontAddNull) HEAP8[((buffer)>>0)] = 0;
    }
  function _environ_get(__environ, environ_buf) {
      var bufSize = 0;
      getEnvStrings().forEach(function(string, i) {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(i*4))>>2)] = ptr;
        writeAsciiToMemory(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    }

  function _environ_sizes_get(penviron_count, penviron_buf_size) {
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;
      var bufSize = 0;
      strings.forEach(function(string) {
        bufSize += string.length + 1;
      });
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;
      return 0;
    }

  function _proc_exit(code) {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        if (Module['onExit']) Module['onExit'](code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    }
  /** @param {boolean|number=} implicit */
  function exitJS(status, implicit) {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = 'program exited (with status: ' + status + '), but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)';
        err(msg);
      }
  
      _proc_exit(status);
    }
  var _exit = exitJS;

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return e.errno;
  }
  }

  function _fd_fdstat_get(fd, pbuf) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      // All character devices are terminals (other things a Linux system would
      // assume is a character device, like the mouse, we have special APIs for).
      var type = stream.tty ? 2 :
                 FS.isDir(stream.mode) ? 3 :
                 FS.isLink(stream.mode) ? 7 :
                 4;
      HEAP8[((pbuf)>>0)] = type;
      // TODO HEAP16[(((pbuf)+(2))>>1)] = ?;
      // TODO (tempI64 = [?>>>0,(tempDouble=?,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((pbuf)+(8))>>2)] = tempI64[0],HEAP32[(((pbuf)+(12))>>2)] = tempI64[1]);
      // TODO (tempI64 = [?>>>0,(tempDouble=?,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[(((pbuf)+(16))>>2)] = tempI64[0],HEAP32[(((pbuf)+(20))>>2)] = tempI64[1]);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return e.errno;
  }
  }

  /** @param {number=} offset */
  function doReadv(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.read(stream, HEAP8,ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
      }
      return ret;
    }
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return e.errno;
  }
  }

  function convertI32PairToI53Checked(lo, hi) {
      assert(lo == (lo >>> 0) || lo == (lo|0)); // lo should either be a i32 or a u32
      assert(hi === (hi|0));                    // hi should be a i32
      return ((hi + 0x200000) >>> 0 < 0x400001 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;
    }
  function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
  try {
  
      var offset = convertI32PairToI53Checked(offset_low, offset_high); if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      (tempI64 = [stream.position>>>0,(tempDouble=stream.position,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((newOffset)>>2)] = tempI64[0],HEAP32[(((newOffset)+(4))>>2)] = tempI64[1]);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return e.errno;
  }
  }

  /** @param {number=} offset */
  function doWritev(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.write(stream, HEAP8,ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
      }
      return ret;
    }
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e instanceof FS.ErrnoError)) throw e;
    return e.errno;
  }
  }

  function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]) {
        // no-op
      }
      return sum;
    }
  
  var __MONTH_DAYS_LEAP = [31,29,31,30,31,30,31,31,30,31,30,31];
  
  var __MONTH_DAYS_REGULAR = [31,28,31,30,31,30,31,31,30,31,30,31];
  function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  
        if (days > daysInCurrentMonth-newDate.getDate()) {
          // we spill over to next month
          days -= (daysInCurrentMonth-newDate.getDate()+1);
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth+1)
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear()+1);
          }
        } else {
          // we stay in current month
          newDate.setDate(newDate.getDate()+days);
          return newDate;
        }
      }
  
      return newDate;
    }
  
  function writeArrayToMemory(array, buffer) {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    }
  function _strftime(s, maxsize, format, tm) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html
  
      var tm_zone = HEAP32[(((tm)+(40))>>2)];
  
      var date = {
        tm_sec: HEAP32[((tm)>>2)],
        tm_min: HEAP32[(((tm)+(4))>>2)],
        tm_hour: HEAP32[(((tm)+(8))>>2)],
        tm_mday: HEAP32[(((tm)+(12))>>2)],
        tm_mon: HEAP32[(((tm)+(16))>>2)],
        tm_year: HEAP32[(((tm)+(20))>>2)],
        tm_wday: HEAP32[(((tm)+(24))>>2)],
        tm_yday: HEAP32[(((tm)+(28))>>2)],
        tm_isdst: HEAP32[(((tm)+(32))>>2)],
        tm_gmtoff: HEAP32[(((tm)+(36))>>2)],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : ''
      };
  
      var pattern = UTF8ToString(format);
  
      // expand format
      var EXPANSION_RULES_1 = {
        '%c': '%a %b %d %H:%M:%S %Y',     // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        '%D': '%m/%d/%y',                 // Equivalent to %m / %d / %y
        '%F': '%Y-%m-%d',                 // Equivalent to %Y - %m - %d
        '%h': '%b',                       // Equivalent to %b
        '%r': '%I:%M:%S %p',              // Replaced by the time in a.m. and p.m. notation
        '%R': '%H:%M',                    // Replaced by the time in 24-hour notation
        '%T': '%H:%M:%S',                 // Replaced by the time
        '%x': '%m/%d/%y',                 // Replaced by the locale's appropriate date representation
        '%X': '%H:%M:%S',                 // Replaced by the locale's appropriate time representation
        // Modified Conversion Specifiers
        '%Ec': '%c',                      // Replaced by the locale's alternative appropriate date and time representation.
        '%EC': '%C',                      // Replaced by the name of the base year (period) in the locale's alternative representation.
        '%Ex': '%m/%d/%y',                // Replaced by the locale's alternative date representation.
        '%EX': '%H:%M:%S',                // Replaced by the locale's alternative time representation.
        '%Ey': '%y',                      // Replaced by the offset from %EC (year only) in the locale's alternative representation.
        '%EY': '%Y',                      // Replaced by the full alternative year representation.
        '%Od': '%d',                      // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading zeros if there is any alternative symbol for zero; otherwise, with leading <space> characters.
        '%Oe': '%e',                      // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading <space> characters.
        '%OH': '%H',                      // Replaced by the hour (24-hour clock) using the locale's alternative numeric symbols.
        '%OI': '%I',                      // Replaced by the hour (12-hour clock) using the locale's alternative numeric symbols.
        '%Om': '%m',                      // Replaced by the month using the locale's alternative numeric symbols.
        '%OM': '%M',                      // Replaced by the minutes using the locale's alternative numeric symbols.
        '%OS': '%S',                      // Replaced by the seconds using the locale's alternative numeric symbols.
        '%Ou': '%u',                      // Replaced by the weekday as a number in the locale's alternative representation (Monday=1).
        '%OU': '%U',                      // Replaced by the week number of the year (Sunday as the first day of the week, rules corresponding to %U ) using the locale's alternative numeric symbols.
        '%OV': '%V',                      // Replaced by the week number of the year (Monday as the first day of the week, rules corresponding to %V ) using the locale's alternative numeric symbols.
        '%Ow': '%w',                      // Replaced by the number of the weekday (Sunday=0) using the locale's alternative numeric symbols.
        '%OW': '%W',                      // Replaced by the week number of the year (Monday as the first day of the week) using the locale's alternative numeric symbols.
        '%Oy': '%y',                      // Replaced by the year (offset from %C ) using the locale's alternative numeric symbols.
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_1[rule]);
      }
  
      var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
      function leadingSomething(value, digits, character) {
        var str = typeof value == 'number' ? value.toString() : (value || '');
        while (str.length < digits) {
          str = character[0]+str;
        }
        return str;
      }
  
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, '0');
      }
  
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : (value > 0 ? 1 : 0);
        }
  
        var compare;
        if ((compare = sgn(date1.getFullYear()-date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth()-date2.getMonth())) === 0) {
            compare = sgn(date1.getDate()-date2.getDate());
          }
        }
        return compare;
      }
  
      function getFirstWeekStartDate(janFourth) {
          switch (janFourth.getDay()) {
            case 0: // Sunday
              return new Date(janFourth.getFullYear()-1, 11, 29);
            case 1: // Monday
              return janFourth;
            case 2: // Tuesday
              return new Date(janFourth.getFullYear(), 0, 3);
            case 3: // Wednesday
              return new Date(janFourth.getFullYear(), 0, 2);
            case 4: // Thursday
              return new Date(janFourth.getFullYear(), 0, 1);
            case 5: // Friday
              return new Date(janFourth.getFullYear()-1, 11, 31);
            case 6: // Saturday
              return new Date(janFourth.getFullYear()-1, 11, 30);
          }
      }
  
      function getWeekBasedYear(date) {
          var thisDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
          var janFourthNextYear = new Date(thisDate.getFullYear()+1, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            // this date is after the start of the first week of this year
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
              return thisDate.getFullYear()+1;
            }
            return thisDate.getFullYear();
          }
          return thisDate.getFullYear()-1;
      }
  
      var EXPANSION_RULES_2 = {
        '%a': function(date) {
          return WEEKDAYS[date.tm_wday].substring(0,3);
        },
        '%A': function(date) {
          return WEEKDAYS[date.tm_wday];
        },
        '%b': function(date) {
          return MONTHS[date.tm_mon].substring(0,3);
        },
        '%B': function(date) {
          return MONTHS[date.tm_mon];
        },
        '%C': function(date) {
          var year = date.tm_year+1900;
          return leadingNulls((year/100)|0,2);
        },
        '%d': function(date) {
          return leadingNulls(date.tm_mday, 2);
        },
        '%e': function(date) {
          return leadingSomething(date.tm_mday, 2, ' ');
        },
        '%g': function(date) {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year.
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes
          // January 4th, which is also the week that includes the first Thursday of the year, and
          // is also the first week that contains at least four days in the year.
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of
          // the last week of the preceding year; thus, for Saturday 2nd January 1999,
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th,
          // or 31st is a Monday, it and any following days are part of week 1 of the following year.
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.
  
          return getWeekBasedYear(date).toString().substring(2);
        },
        '%G': function(date) {
          return getWeekBasedYear(date);
        },
        '%H': function(date) {
          return leadingNulls(date.tm_hour, 2);
        },
        '%I': function(date) {
          var twelveHour = date.tm_hour;
          if (twelveHour == 0) twelveHour = 12;
          else if (twelveHour > 12) twelveHour -= 12;
          return leadingNulls(twelveHour, 2);
        },
        '%j': function(date) {
          // Day of the year (001-366)
          return leadingNulls(date.tm_mday+__arraySum(__isLeapYear(date.tm_year+1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon-1), 3);
        },
        '%m': function(date) {
          return leadingNulls(date.tm_mon+1, 2);
        },
        '%M': function(date) {
          return leadingNulls(date.tm_min, 2);
        },
        '%n': function() {
          return '\n';
        },
        '%p': function(date) {
          if (date.tm_hour >= 0 && date.tm_hour < 12) {
            return 'AM';
          }
          return 'PM';
        },
        '%S': function(date) {
          return leadingNulls(date.tm_sec, 2);
        },
        '%t': function() {
          return '\t';
        },
        '%u': function(date) {
          return date.tm_wday || 7;
        },
        '%U': function(date) {
          var days = date.tm_yday + 7 - date.tm_wday;
          return leadingNulls(Math.floor(days / 7), 2);
        },
        '%V': function(date) {
          // Replaced by the week number of the year (Monday as the first day of the week)
          // as a decimal number [01,53]. If the week containing 1 January has four
          // or more days in the new year, then it is considered week 1.
          // Otherwise, it is the last week of the previous year, and the next week is week 1.
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var val = Math.floor((date.tm_yday + 7 - (date.tm_wday + 6) % 7 ) / 7);
          // If 1 Jan is just 1-3 days past Monday, the previous week
          // is also in this year.
          if ((date.tm_wday + 371 - date.tm_yday - 2) % 7 <= 2) {
            val++;
          }
          if (!val) {
            val = 52;
            // If 31 December of prev year a Thursday, or Friday of a
            // leap year, then the prev year has 53 weeks.
            var dec31 = (date.tm_wday + 7 - date.tm_yday - 1) % 7;
            if (dec31 == 4 || (dec31 == 5 && __isLeapYear(date.tm_year%400-1))) {
              val++;
            }
          } else if (val == 53) {
            // If 1 January is not a Thursday, and not a Wednesday of a
            // leap year, then this year has only 52 weeks.
            var jan1 = (date.tm_wday + 371 - date.tm_yday) % 7;
            if (jan1 != 4 && (jan1 != 3 || !__isLeapYear(date.tm_year)))
              val = 1;
          }
          return leadingNulls(val, 2);
        },
        '%w': function(date) {
          return date.tm_wday;
        },
        '%W': function(date) {
          var days = date.tm_yday + 7 - ((date.tm_wday + 6) % 7);
          return leadingNulls(Math.floor(days / 7), 2);
        },
        '%y': function(date) {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year+1900).toString().substring(2);
        },
        '%Y': function(date) {
          // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
          return date.tm_year+1900;
        },
        '%z': function(date) {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ).
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich).
          var off = date.tm_gmtoff;
          var ahead = off >= 0;
          off = Math.abs(off) / 60;
          // convert from minutes into hhmm format (which means 60 minutes = 100 units)
          off = (off / 60)*100 + (off % 60);
          return (ahead ? '+' : '-') + String("0000" + off).slice(-4);
        },
        '%Z': function(date) {
          return date.tm_zone;
        },
        '%%': function() {
          return '%';
        }
      };
  
      // Replace %% with a pair of NULLs (which cannot occur in a C string), then
      // re-inject them after processing.
      pattern = pattern.replace(/%%/g, '\0\0')
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
          pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
        }
      }
      pattern = pattern.replace(/\0\0/g, '%')
  
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }
  
      writeArrayToMemory(bytes, s);
      return bytes.length-1;
    }

  function _system(command) {
      if (ENVIRONMENT_IS_NODE) {
        if (!command) return 1; // shell is available
  
        var cmdstr = UTF8ToString(command);
        if (!cmdstr.length) return 0; // this is what glibc seems to do (shell works test?)
  
        var cp = require('child_process');
        var ret = cp.spawnSync(cmdstr, [], {shell:true, stdio:'inherit'});
  
        var _W_EXITCODE = (ret, sig) => ((ret) << 8 | (sig));
  
        // this really only can happen if process is killed by signal
        if (ret.status === null) {
          // sadly node doesn't expose such function
          var signalToNumber = (sig) => {
            // implement only the most common ones, and fallback to SIGINT
            switch (sig) {
              case 'SIGHUP': return 1;
              case 'SIGINT': return 2;
              case 'SIGQUIT': return 3;
              case 'SIGFPE': return 8;
              case 'SIGKILL': return 9;
              case 'SIGALRM': return 14;
              case 'SIGTERM': return 15;
            }
            return 2; // SIGINT
          }
          return _W_EXITCODE(0, signalToNumber(ret.signal));
        }
  
        return _W_EXITCODE(ret.status, 0);
      }
      // int system(const char *command);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/system.html
      // Can't call external programs.
      if (!command) return 0; // no shell available
      setErrNo(52);
      return -1;
    }



  function allocateUTF8OnStack(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }



  var FSNode = /** @constructor */ function(parent, name, mode, rdev) {
    if (!parent) {
      parent = this;  // root node sets parent to itself
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
  };
  var readMode = 292/*292*/ | 73/*73*/;
  var writeMode = 146/*146*/;
  Object.defineProperties(FSNode.prototype, {
   read: {
    get: /** @this{FSNode} */function() {
     return (this.mode & readMode) === readMode;
    },
    set: /** @this{FSNode} */function(val) {
     val ? this.mode |= readMode : this.mode &= ~readMode;
    }
   },
   write: {
    get: /** @this{FSNode} */function() {
     return (this.mode & writeMode) === writeMode;
    },
    set: /** @this{FSNode} */function(val) {
     val ? this.mode |= writeMode : this.mode &= ~writeMode;
    }
   },
   isFolder: {
    get: /** @this{FSNode} */function() {
     return FS.isDir(this.mode);
    }
   },
   isDevice: {
    get: /** @this{FSNode} */function() {
     return FS.isChrdev(this.mode);
    }
   }
  });
  FS.FSNode = FSNode;
  FS.staticInit();;
ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };;
embind_init_charCodes();
BindingError = Module['BindingError'] = extendError(Error, 'BindingError');;
InternalError = Module['InternalError'] = extendError(Error, 'InternalError');;
init_ClassHandle();
init_embind();;
init_RegisteredPointer();
UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');;
init_emval();;
var ASSERTIONS = true;

function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
}
var asmLibraryArg = {
  "__assert_fail": ___assert_fail,
  "__asyncjs__readline_js": __asyncjs__readline_js,
  "__cxa_allocate_exception": ___cxa_allocate_exception,
  "__cxa_throw": ___cxa_throw,
  "__syscall_dup3": ___syscall_dup3,
  "__syscall_fcntl64": ___syscall_fcntl64,
  "__syscall_ioctl": ___syscall_ioctl,
  "__syscall_openat": ___syscall_openat,
  "__syscall_renameat": ___syscall_renameat,
  "__syscall_rmdir": ___syscall_rmdir,
  "__syscall_unlinkat": ___syscall_unlinkat,
  "_dlinit": __dlinit,
  "_dlopen_js": __dlopen_js,
  "_dlsym_js": __dlsym_js,
  "_embind_register_bigint": __embind_register_bigint,
  "_embind_register_bool": __embind_register_bool,
  "_embind_register_class": __embind_register_class,
  "_embind_register_class_constructor": __embind_register_class_constructor,
  "_embind_register_class_function": __embind_register_class_function,
  "_embind_register_emval": __embind_register_emval,
  "_embind_register_float": __embind_register_float,
  "_embind_register_function": __embind_register_function,
  "_embind_register_integer": __embind_register_integer,
  "_embind_register_memory_view": __embind_register_memory_view,
  "_embind_register_std_string": __embind_register_std_string,
  "_embind_register_std_wstring": __embind_register_std_wstring,
  "_embind_register_void": __embind_register_void,
  "_emscripten_dlopen_js": __emscripten_dlopen_js,
  "_emscripten_get_now_is_monotonic": __emscripten_get_now_is_monotonic,
  "_emscripten_throw_longjmp": __emscripten_throw_longjmp,
  "_emval_decref": __emval_decref,
  "_emval_incref": __emval_incref,
  "_emval_take_value": __emval_take_value,
  "_gmtime_js": __gmtime_js,
  "_localtime_js": __localtime_js,
  "_mktime_js": __mktime_js,
  "_timegm_js": __timegm_js,
  "_tzset_js": __tzset_js,
  "abort": _abort,
  "emscripten_asm_const_int": _emscripten_asm_const_int,
  "emscripten_console_error": _emscripten_console_error,
  "emscripten_date_now": _emscripten_date_now,
  "emscripten_get_heap_max": _emscripten_get_heap_max,
  "emscripten_get_now": _emscripten_get_now,
  "emscripten_get_now_res": _emscripten_get_now_res,
  "emscripten_memcpy_big": _emscripten_memcpy_big,
  "emscripten_resize_heap": _emscripten_resize_heap,
  "environ_get": _environ_get,
  "environ_sizes_get": _environ_sizes_get,
  "exit": _exit,
  "fd_close": _fd_close,
  "fd_fdstat_get": _fd_fdstat_get,
  "fd_read": _fd_read,
  "fd_seek": _fd_seek,
  "fd_write": _fd_write,
  "invoke_vii": invoke_vii,
  "strftime": _strftime,
  "system": _system
};
Asyncify.instrumentWasmImports(asmLibraryArg);
var asm = createWasm();
/** @type {function(...*):?} */
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = createExportWrapper("__wasm_call_ctors");

/** @type {function(...*):?} */
var _add_history = Module["_add_history"] = createExportWrapper("add_history");

/** @type {function(...*):?} */
var _eprintf = Module["_eprintf"] = createExportWrapper("eprintf");

/** @type {function(...*):?} */
var _vsnprintf = Module["_vsnprintf"] = createExportWrapper("vsnprintf");

/** @type {function(...*):?} */
var _malloc = Module["_malloc"] = createExportWrapper("malloc");

/** @type {function(...*):?} */
var _vsprintf = Module["_vsprintf"] = createExportWrapper("vsprintf");

/** @type {function(...*):?} */
var _free = Module["_free"] = createExportWrapper("free");

/** @type {function(...*):?} */
var _readline = Module["_readline"] = createExportWrapper("readline");

/** @type {function(...*):?} */
var __Z9wrap_mainRKNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE = Module["__Z9wrap_mainRKNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE"] = createExportWrapper("_Z9wrap_mainRKNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE");

/** @type {function(...*):?} */
var __Znam = Module["__Znam"] = createExportWrapper("_Znam");

/** @type {function(...*):?} */
var _main = Module["_main"] = createExportWrapper("__main_argc_argv");

/** @type {function(...*):?} */
var __ZN20EmBindInit_my_moduleC2Ev = Module["__ZN20EmBindInit_my_moduleC2Ev"] = createExportWrapper("_ZN20EmBindInit_my_moduleC2Ev");

/** @type {function(...*):?} */
var __ZN10emscripten8internal8InitFuncC2EPFvvE = Module["__ZN10emscripten8internal8InitFuncC2EPFvvE"] = createExportWrapper("_ZN10emscripten8internal8InitFuncC2EPFvvE");

/** @type {function(...*):?} */
var __ZN10emscripten15register_vectorINSt3__212basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEEEENS_6class_INS1_6vectorIT_NS5_ISA_EEEENS_8internal11NoBaseClassEEEPKc = Module["__ZN10emscripten15register_vectorINSt3__212basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEEEENS_6class_INS1_6vectorIT_NS5_ISA_EEEENS_8internal11NoBaseClassEEEPKc"] = createExportWrapper("_ZN10emscripten15register_vectorINSt3__212basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEEEENS_6class_INS1_6vectorIT_NS5_ISA_EEEENS_8internal11NoBaseClassEEEPKc");

/** @type {function(...*):?} */
var __ZN10emscripten8functionIiJRKNSt3__26vectorINS1_12basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEENS6_IS8_EEEEEJEEEvPKcPFT_DpT0_EDpT1_ = Module["__ZN10emscripten8functionIiJRKNSt3__26vectorINS1_12basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEENS6_IS8_EEEEEJEEEvPKcPFT_DpT0_EDpT1_"] = createExportWrapper("_ZN10emscripten8functionIiJRKNSt3__26vectorINS1_12basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEENS6_IS8_EEEEEJEEEvPKcPFT_DpT0_EDpT1_");

/** @type {function(...*):?} */
var __embind_register_bindings = Module["__embind_register_bindings"] = createExportWrapper("_embind_register_bindings");

/** @type {function(...*):?} */
var __ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE6resizeEmRKS6_ = Module["__ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE6resizeEmRKS6_"] = createExportWrapper("_ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE6resizeEmRKS6_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11NoBaseClass6verifyINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvv = Module["__ZN10emscripten8internal11NoBaseClass6verifyINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvv"] = createExportWrapper("_ZN10emscripten8internal11NoBaseClass6verifyINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal13getActualTypeINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEPKvPT_ = Module["__ZN10emscripten8internal13getActualTypeINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEPKvPT_"] = createExportWrapper("_ZN10emscripten8internal13getActualTypeINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEPKvPT_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11NoBaseClass11getUpcasterINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEPFvvEv = Module["__ZN10emscripten8internal11NoBaseClass11getUpcasterINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEPFvvEv"] = createExportWrapper("_ZN10emscripten8internal11NoBaseClass11getUpcasterINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEPFvvEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11NoBaseClass13getDowncasterINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEPFvvEv = Module["__ZN10emscripten8internal11NoBaseClass13getDowncasterINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEPFvvEv"] = createExportWrapper("_ZN10emscripten8internal11NoBaseClass13getDowncasterINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEPFvvEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14raw_destructorINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEvPT_ = Module["__ZN10emscripten8internal14raw_destructorINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEvPT_"] = createExportWrapper("_ZN10emscripten8internal14raw_destructorINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEvPT_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal6TypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE3getEv = Module["__ZN10emscripten8internal6TypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE3getEv"] = createExportWrapper("_ZN10emscripten8internal6TypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvE3getEv = Module["__ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvE3getEv"] = createExportWrapper("_ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerINSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerIKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvE3getEv = Module["__ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerIKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvE3getEv"] = createExportWrapper("_ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerIKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEvE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11NoBaseClass3getEv = Module["__ZN10emscripten8internal11NoBaseClass3getEv"] = createExportWrapper("_ZN10emscripten8internal11NoBaseClass3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal12operator_newINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEJEEEPT_DpOT0_ = Module["__ZN10emscripten8internal12operator_newINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEJEEEPT_DpOT0_"] = createExportWrapper("_ZN10emscripten8internal12operator_newINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEJEEEPT_DpOT0_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal24RegisterClassConstructorIPFPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvEE6invokeISB_JEEEvSE_ = Module["__ZN10emscripten8internal24RegisterClassConstructorIPFPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvEE6invokeISB_JEEEvSE_"] = createExportWrapper("_ZN10emscripten8internal24RegisterClassConstructorIPFPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvEE6invokeISB_JEEEvSE_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EE6invokeISB_JEEEvPKcSF_ = Module["__ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EE6invokeISB_JEEEvPKcSF_"] = createExportWrapper("_ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EE6invokeISB_JEEEvPKcSF_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EE6invokeISB_JEEEvPKcSF_ = Module["__ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EE6invokeISB_JEEEvPKcSF_"] = createExportWrapper("_ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EE6invokeISB_JEEEvPKcSF_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEE6invokeISB_JEEEvPKcSD_ = Module["__ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEE6invokeISB_JEEEvPKcSD_"] = createExportWrapper("_ZN10emscripten8internal19RegisterClassMethodIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEE6invokeISB_JEEEvPKcSD_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal12VectorAccessINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getERKSB_m = Module["__ZN10emscripten8internal12VectorAccessINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getERKSB_m"] = createExportWrapper("_ZN10emscripten8internal12VectorAccessINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getERKSB_m");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19RegisterClassMethodIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmEE6invokeISC_JEEEvPKcSG_ = Module["__ZN10emscripten8internal19RegisterClassMethodIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmEE6invokeISC_JEEEvPKcSG_"] = createExportWrapper("_ZN10emscripten8internal19RegisterClassMethodIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmEE6invokeISC_JEEEvPKcSG_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal12VectorAccessINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3setERSB_mRKS9_ = Module["__ZN10emscripten8internal12VectorAccessINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3setERSB_mRKS9_"] = createExportWrapper("_ZN10emscripten8internal12VectorAccessINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3setERSB_mRKS9_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19RegisterClassMethodIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EE6invokeISB_JEEEvPKcSG_ = Module["__ZN10emscripten8internal19RegisterClassMethodIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EE6invokeISB_JEEEvPKcSG_"] = createExportWrapper("_ZN10emscripten8internal19RegisterClassMethodIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EE6invokeISB_JEEEvPKcSG_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal7InvokerIiJRKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEE6invokeEPFiSD_EPSB_ = Module["__ZN10emscripten8internal7InvokerIiJRKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEE6invokeEPFiSD_EPSB_"] = createExportWrapper("_ZN10emscripten8internal7InvokerIiJRKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEE6invokeEPFiSD_EPSB_");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJiRKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEE8getCountEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJiRKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEE8getCountEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJiRKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEE8getCountEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJiRKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEE8getTypesEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJiRKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEE8getTypesEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJiRKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEE8getTypesEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv");

/** @type {function(...*):?} */
var __ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE22__construct_one_at_endB6v15000IJRKS6_EEEvDpOT_ = Module["__ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE22__construct_one_at_endB6v15000IJRKS6_EEEvDpOT_"] = createExportWrapper("_ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE22__construct_one_at_endB6v15000IJRKS6_EEEvDpOT_");

/** @type {function(...*):?} */
var __ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21__push_back_slow_pathIRKS6_EEvOT_ = Module["__ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21__push_back_slow_pathIRKS6_EEvOT_"] = createExportWrapper("_ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21__push_back_slow_pathIRKS6_EEvOT_");

/** @type {function(...*):?} */
var __ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE8__appendEmRKS6_ = Module["__ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE8__appendEmRKS6_"] = createExportWrapper("_ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE8__appendEmRKS6_");

/** @type {function(...*):?} */
var __ZN10emscripten3valC2IRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEOT_ = Module["__ZN10emscripten3valC2IRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEOT_"] = createExportWrapper("_ZN10emscripten3valC2IRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEOT_");

/** @type {function(...*):?} */
var __ZN10emscripten3val9undefinedEv = Module["__ZN10emscripten3val9undefinedEv"] = createExportWrapper("_ZN10emscripten3val9undefinedEv");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_ = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_");

/** @type {function(...*):?} */
var __ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21_ConstructTransactionC2ERS8_m = Module["__ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21_ConstructTransactionC2ERS8_m"] = createExportWrapper("_ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21_ConstructTransactionC2ERS8_m");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE9constructB6v15000IS6_JRKS6_EvEEvRS7_PT_DpOT0_ = Module["__ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE9constructB6v15000IS6_JRKS6_EvEEvRS7_PT_DpOT0_"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE9constructB6v15000IS6_JRKS6_EvEEvRS7_PT_DpOT0_");

/** @type {function(...*):?} */
var __ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21_ConstructTransactionD2Ev = Module["__ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21_ConstructTransactionD2Ev"] = createExportWrapper("_ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE21_ConstructTransactionD2Ev");

/** @type {function(...*):?} */
var __ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEEC2EmmS8_ = Module["__ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEEC2EmmS8_"] = createExportWrapper("_ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEEC2EmmS8_");

/** @type {function(...*):?} */
var __ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE26__swap_out_circular_bufferERNS_14__split_bufferIS6_RS7_EE = Module["__ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE26__swap_out_circular_bufferERNS_14__split_bufferIS6_RS7_EE"] = createExportWrapper("_ZNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE26__swap_out_circular_bufferERNS_14__split_bufferIS6_RS7_EE");

/** @type {function(...*):?} */
var __ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEED2Ev = Module["__ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEED2Ev"] = createExportWrapper("_ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEED2Ev");

/** @type {function(...*):?} */
var __ZNSt3__29allocatorINS_12basic_stringIcNS_11char_traitsIcEENS0_IcEEEEE9constructB6v15000IS5_JRKS5_EEEvPT_DpOT0_ = Module["__ZNSt3__29allocatorINS_12basic_stringIcNS_11char_traitsIcEENS0_IcEEEEE9constructB6v15000IS5_JRKS5_EEEvPT_DpOT0_"] = createExportWrapper("_ZNSt3__29allocatorINS_12basic_stringIcNS_11char_traitsIcEENS0_IcEEEEE9constructB6v15000IS5_JRKS5_EEEvPT_DpOT0_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2ERKS5_ = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2ERKS5_"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2ERKS5_");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorIcEEE37select_on_container_copy_constructionB6v15000IS2_vvEES2_RKS2_ = Module["__ZNSt3__216allocator_traitsINS_9allocatorIcEEE37select_on_container_copy_constructionB6v15000IS2_vvEES2_RKS2_"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorIcEEE37select_on_container_copy_constructionB6v15000IS2_vvEES2_RKS2_");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagES5_EEOT_OT0_ = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagES5_EEOT_OT0_"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagES5_EEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EEC2B6v15000IS2_vEEOT_ = Module["__ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EEC2B6v15000IS2_vEEOT_"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EEC2B6v15000IS2_vEEOT_");

/** @type {function(...*):?} */
var __ZNKSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE8max_sizeEv = Module["__ZNKSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE8max_sizeEv"] = createExportWrapper("_ZNKSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEE8max_sizeEv");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEEC2B6v15000IDnS9_EEOT_OT0_ = Module["__ZNSt3__217__compressed_pairIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEEC2B6v15000IDnS9_EEOT_OT0_"] = createExportWrapper("_ZNSt3__217__compressed_pairIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEEC2B6v15000IDnS9_EEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE8max_sizeB6v15000IS7_vEEmRKS7_ = Module["__ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE8max_sizeB6v15000IS7_vEEmRKS7_"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE8max_sizeB6v15000IS7_vEEmRKS7_");

/** @type {function(...*):?} */
var __ZNSt12length_errorD1Ev = Module["__ZNSt12length_errorD1Ev"] = createExportWrapper("_ZNSt12length_errorD1Ev");

/** @type {function(...*):?} */
var __ZNSt11logic_errorC2EPKc = Module["__ZNSt11logic_errorC2EPKc"] = createExportWrapper("_ZNSt11logic_errorC2EPKc");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEELi0ELb0EEC2B6v15000IDnvEEOT_ = Module["__ZNSt3__222__compressed_pair_elemIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEELi0ELb0EEC2B6v15000IDnvEEOT_"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEELi0ELb0EEC2B6v15000IDnvEEOT_");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemIRNS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEELi1ELb0EEC2B6v15000IS8_vEEOT_ = Module["__ZNSt3__222__compressed_pair_elemIRNS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEELi1ELb0EEC2B6v15000IS8_vEEOT_"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemIRNS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEELi1ELb0EEC2B6v15000IS8_vEEOT_");

/** @type {function(...*):?} */
var __ZNSt20bad_array_new_lengthC1Ev = Module["__ZNSt20bad_array_new_lengthC1Ev"] = createExportWrapper("_ZNSt20bad_array_new_lengthC1Ev");

/** @type {function(...*):?} */
var __ZNSt20bad_array_new_lengthD1Ev = Module["__ZNSt20bad_array_new_lengthD1Ev"] = createExportWrapper("_ZNSt20bad_array_new_lengthD1Ev");

/** @type {function(...*):?} */
var __ZnwmSt11align_val_t = Module["__ZnwmSt11align_val_t"] = createExportWrapper("_ZnwmSt11align_val_t");

/** @type {function(...*):?} */
var __Znwm = Module["__Znwm"] = createExportWrapper("_Znwm");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE9constructB6v15000IS6_JS6_EvEEvRS7_PT_DpOT0_ = Module["__ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE9constructB6v15000IS6_JS6_EvEEvRS7_PT_DpOT0_"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE9constructB6v15000IS6_JS6_EvEEvRS7_PT_DpOT0_");

/** @type {function(...*):?} */
var __ZNSt3__29allocatorINS_12basic_stringIcNS_11char_traitsIcEENS0_IcEEEEE9constructB6v15000IS5_JS5_EEEvPT_DpOT0_ = Module["__ZNSt3__29allocatorINS_12basic_stringIcNS_11char_traitsIcEENS0_IcEEEEE9constructB6v15000IS5_JS5_EEEvPT_DpOT0_"] = createExportWrapper("_ZNSt3__29allocatorINS_12basic_stringIcNS_11char_traitsIcEENS0_IcEEEEE9constructB6v15000IS5_JS5_EEEvPT_DpOT0_");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE7destroyB6v15000IS6_vEEvRS7_PT_ = Module["__ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE7destroyB6v15000IS6_vEEvRS7_PT_"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorINS_12basic_stringIcNS_11char_traitsIcEENS1_IcEEEEEEE7destroyB6v15000IS6_vEEvRS7_PT_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev");

/** @type {function(...*):?} */
var __ZdlPvSt11align_val_t = Module["__ZdlPvSt11align_val_t"] = createExportWrapper("_ZdlPvSt11align_val_t");

/** @type {function(...*):?} */
var __ZdlPv = Module["__ZdlPv"] = createExportWrapper("_ZdlPv");

/** @type {function(...*):?} */
var __ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE18__construct_at_endEmRKS6_ = Module["__ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE18__construct_at_endEmRKS6_"] = createExportWrapper("_ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE18__construct_at_endEmRKS6_");

/** @type {function(...*):?} */
var __ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE21_ConstructTransactionC2EPPS6_m = Module["__ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE21_ConstructTransactionC2EPPS6_m"] = createExportWrapper("_ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE21_ConstructTransactionC2EPPS6_m");

/** @type {function(...*):?} */
var __ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE21_ConstructTransactionD2Ev = Module["__ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE21_ConstructTransactionD2Ev"] = createExportWrapper("_ZNSt3__214__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE21_ConstructTransactionD2Ev");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14getLightTypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEPKvRKT_ = Module["__ZN10emscripten8internal14getLightTypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEPKvRKT_"] = createExportWrapper("_ZN10emscripten8internal14getLightTypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEEEPKvRKT_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11LightTypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv = Module["__ZN10emscripten8internal11LightTypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal11LightTypeIDINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11LightTypeIDIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv = Module["__ZN10emscripten8internal11LightTypeIDIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal11LightTypeIDIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11LightTypeIDIPKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv = Module["__ZN10emscripten8internal11LightTypeIDIPKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal11LightTypeIDIPKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal7InvokerIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEJEE6invokeEPFSC_vE = Module["__ZN10emscripten8internal7InvokerIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEJEE6invokeEPFSC_vE"] = createExportWrapper("_ZN10emscripten8internal7InvokerIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEJEE6invokeEPFSC_vE");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEE8getCountEv = Module["__ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEE8getCountEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEE8getCountEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEE8getTypesEv = Module["__ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEE8getTypesEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEE8getTypesEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE10toWireTypeESC_ = Module["__ZN10emscripten8internal11BindingTypeIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE10toWireTypeESC_"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE10toWireTypeESC_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEv = Module["__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEv");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEC2B6v15000IDnNS_18__default_init_tagEEEOT_OT0_ = Module["__ZNSt3__217__compressed_pairIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEC2B6v15000IDnNS_18__default_init_tagEEEOT_OT0_"] = createExportWrapper("_ZNSt3__217__compressed_pairIPNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEC2B6v15000IDnNS_18__default_init_tagEEEOT_OT0_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EvPSB_JSD_EE6invokeERKSF_SG_PNS0_11BindingTypeIS9_vEUt_E = Module["__ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EvPSB_JSD_EE6invokeERKSF_SG_PNS0_11BindingTypeIS9_vEUt_E"] = createExportWrapper("_ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EvPSB_JSD_EE6invokeERKSF_SG_PNS0_11BindingTypeIS9_vEUt_E");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEERKSC_EE8getCountEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEERKSC_EE8getCountEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEERKSC_EE8getCountEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEERKSC_EE8getTypesEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEERKSC_EE8getTypesEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEERKSC_EE8getTypesEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EEEPT_RKSG_ = Module["__ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EEEPT_RKSG_"] = createExportWrapper("_ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvRKS9_EEEPT_RKSG_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE12fromWireTypeESC_ = Module["__ZN10emscripten8internal11BindingTypeIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE12fromWireTypeESC_"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeIPNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE12fromWireTypeESC_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE12fromWireTypeEPNS9_Ut_E = Module["__ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE12fromWireTypeEPNS9_Ut_E"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE12fromWireTypeEPNS9_Ut_E");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEERKSB_EEEE3getEv = Module["__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEERKSB_EEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEERKSB_EEEE3getEv");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagESA_EEOT_OT0_ = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagESA_EEOT_OT0_"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagESA_EEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm");

/** @type {function(...*):?} */
var __ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EvPSB_JmSD_EE6invokeERKSF_SG_mPNS0_11BindingTypeIS9_vEUt_E = Module["__ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EvPSB_JmSD_EE6invokeERKSF_SG_mPNS0_11BindingTypeIS9_vEUt_E"] = createExportWrapper("_ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EvPSB_JmSD_EE6invokeERKSF_SG_mPNS0_11BindingTypeIS9_vEUt_E");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEmRKSC_EE8getCountEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEmRKSC_EE8getCountEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEmRKSC_EE8getCountEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEmRKSC_EE8getTypesEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEmRKSC_EE8getTypesEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEmRKSC_EE8getTypesEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJviiiiEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJviiiiEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJviiiiEEEPKcv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EEEPT_RKSG_ = Module["__ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EEEPT_RKSG_"] = createExportWrapper("_ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEFvmRKS9_EEEPT_RKSG_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeImvE12fromWireTypeEm = Module["__ZN10emscripten8internal11BindingTypeImvE12fromWireTypeEm"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeImvE12fromWireTypeEm");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEmRKSB_EEEE3getEv = Module["__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEmRKSB_EEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEmRKSB_EEEE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEmPKSB_JEE6invokeERKSD_SF_ = Module["__ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEmPKSB_JEE6invokeERKSD_SF_"] = createExportWrapper("_ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEmPKSB_JEE6invokeERKSD_SF_");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEEE8getCountEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEEE8getCountEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEEE8getCountEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEEE8getTypesEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEEE8getTypesEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEEEEE8getTypesEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEEEPT_RKSE_ = Module["__ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEEEPT_RKSE_"] = createExportWrapper("_ZN10emscripten8internal10getContextIMNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEKFmvEEEPT_RKSE_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeIPKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE12fromWireTypeESD_ = Module["__ZN10emscripten8internal11BindingTypeIPKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE12fromWireTypeESD_"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeIPKNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEvE12fromWireTypeESD_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeImvE10toWireTypeERKm = Module["__ZN10emscripten8internal11BindingTypeImvE10toWireTypeERKm"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeImvE10toWireTypeERKm");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEv = Module["__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal15FunctionInvokerIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmES2_SE_JmEE6invokeEPSG_PSC_m = Module["__ZN10emscripten8internal15FunctionInvokerIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmES2_SE_JmEE6invokeEPSG_PSC_m"] = createExportWrapper("_ZN10emscripten8internal15FunctionInvokerIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmES2_SE_JmEE6invokeEPSG_PSC_m");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEmEE8getCountEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEmEE8getCountEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEmEE8getCountEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEmEE8getTypesEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEmEE8getTypesEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorINS5_12basic_stringIcNS5_11char_traitsIcEENS5_9allocatorIcEEEENSA_ISC_EEEEmEE8getTypesEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal10getContextIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmEEEPT_RKSH_ = Module["__ZN10emscripten8internal10getContextIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmEEEPT_RKSH_"] = createExportWrapper("_ZN10emscripten8internal10getContextIPFNS_3valERKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmEEEPT_RKSH_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE12fromWireTypeEPSB_ = Module["__ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE12fromWireTypeEPSB_"] = createExportWrapper("_ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEE12fromWireTypeEPSB_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeINS_3valEvE10toWireTypeERKS2_ = Module["__ZN10emscripten8internal11BindingTypeINS_3valEvE10toWireTypeERKS2_"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeINS_3valEvE10toWireTypeERKS2_");

/** @type {function(...*):?} */
var __ZN10emscripten3valD2Ev = Module["__ZN10emscripten3valD2Ev"] = createExportWrapper("_ZN10emscripten3valD2Ev");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS_3valERKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmEEEE3getEv = Module["__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS_3valERKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS_3valERKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmEEEE3getEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal12WireTypePackIJRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEC2ESA_ = Module["__ZN10emscripten8internal12WireTypePackIJRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEC2ESA_"] = createExportWrapper("_ZN10emscripten8internal12WireTypePackIJRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEC2ESA_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal6TypeIDIRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE3getEv = Module["__ZN10emscripten8internal6TypeIDIRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE3getEv"] = createExportWrapper("_ZN10emscripten8internal6TypeIDIRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE3getEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WireTypePackIJRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEcvPKvEv = Module["__ZNK10emscripten8internal12WireTypePackIJRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEcvPKvEv"] = createExportWrapper("_ZNK10emscripten8internal12WireTypePackIJRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEEEcvPKvEv");

/** @type {function(...*):?} */
var __ZN10emscripten3valC2EPNS_7_EM_VALE = Module["__ZN10emscripten3valC2EPNS_7_EM_VALE"] = createExportWrapper("_ZN10emscripten3valC2EPNS_7_EM_VALE");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE10toWireTypeERKS8_ = Module["__ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE10toWireTypeERKS8_"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEvE10toWireTypeERKS8_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal20writeGenericWireTypeINS0_11BindingTypeINSt3__212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEvEUt_EEEvRPNS0_15GenericWireTypeEPT_ = Module["__ZN10emscripten8internal20writeGenericWireTypeINS0_11BindingTypeINSt3__212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEvEUt_EEEvRPNS0_15GenericWireTypeEPT_"] = createExportWrapper("_ZN10emscripten8internal20writeGenericWireTypeINS0_11BindingTypeINSt3__212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEvEUt_EEEvRPNS0_15GenericWireTypeEPT_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal21writeGenericWireTypesERPNS0_15GenericWireTypeE = Module["__ZN10emscripten8internal21writeGenericWireTypesERPNS0_15GenericWireTypeE"] = createExportWrapper("_ZN10emscripten8internal21writeGenericWireTypesERPNS0_15GenericWireTypeE");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11LightTypeIDIRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv = Module["__ZN10emscripten8internal11LightTypeIDIRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal11LightTypeIDIRKNSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv");

/** @type {function(...*):?} */
var _memcpy = Module["_memcpy"] = createExportWrapper("memcpy");

/** @type {function(...*):?} */
var __ZN10emscripten8internal15FunctionInvokerIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EbSC_JmSE_EE6invokeEPSG_PSB_mPNS0_11BindingTypeIS9_vEUt_E = Module["__ZN10emscripten8internal15FunctionInvokerIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EbSC_JmSE_EE6invokeEPSG_PSB_mPNS0_11BindingTypeIS9_vEUt_E"] = createExportWrapper("_ZN10emscripten8internal15FunctionInvokerIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EbSC_JmSE_EE6invokeEPSG_PSB_mPNS0_11BindingTypeIS9_vEUt_E");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmRKSB_EE8getCountEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmRKSB_EE8getCountEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmRKSB_EE8getCountEv");

/** @type {function(...*):?} */
var __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmRKSB_EE8getTypesEv = Module["__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmRKSB_EE8getTypesEv"] = createExportWrapper("_ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmRKSB_EE8getTypesEv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal19getGenericSignatureIJiiiiiEEEPKcv = Module["__ZN10emscripten8internal19getGenericSignatureIJiiiiiEEEPKcv"] = createExportWrapper("_ZN10emscripten8internal19getGenericSignatureIJiiiiiEEEPKcv");

/** @type {function(...*):?} */
var __ZN10emscripten8internal10getContextIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EEEPT_RKSH_ = Module["__ZN10emscripten8internal10getContextIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EEEPT_RKSH_"] = createExportWrapper("_ZN10emscripten8internal10getContextIPFbRNSt3__26vectorINS2_12basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEENS7_IS9_EEEEmRKS9_EEEPT_RKSH_");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeIbvE10toWireTypeEb = Module["__ZN10emscripten8internal11BindingTypeIbvE10toWireTypeEb"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeIbvE10toWireTypeEb");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbRNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmRKSA_EEEE3getEv = Module["__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbRNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmRKSA_EEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbRNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmRKSA_EEEE3getEv");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm");

/** @type {function(...*):?} */
var __ZN10emscripten8internal11BindingTypeIivE10toWireTypeERKi = Module["__ZN10emscripten8internal11BindingTypeIivE10toWireTypeERKi"] = createExportWrapper("_ZN10emscripten8internal11BindingTypeIivE10toWireTypeERKi");

/** @type {function(...*):?} */
var __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJiRKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEEE3getEv = Module["__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJiRKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEEE3getEv"] = createExportWrapper("_ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJiRKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEEE3getEv");

/** @type {function(...*):?} */
var _lua_checkstack = Module["_lua_checkstack"] = createExportWrapper("lua_checkstack");

/** @type {function(...*):?} */
var _lua_xmove = Module["_lua_xmove"] = createExportWrapper("lua_xmove");

/** @type {function(...*):?} */
var _lua_atpanic = Module["_lua_atpanic"] = createExportWrapper("lua_atpanic");

/** @type {function(...*):?} */
var _lua_version = Module["_lua_version"] = createExportWrapper("lua_version");

/** @type {function(...*):?} */
var _lua_absindex = Module["_lua_absindex"] = createExportWrapper("lua_absindex");

/** @type {function(...*):?} */
var _lua_gettop = Module["_lua_gettop"] = createExportWrapper("lua_gettop");

/** @type {function(...*):?} */
var _lua_settop = Module["_lua_settop"] = createExportWrapper("lua_settop");

/** @type {function(...*):?} */
var _lua_closeslot = Module["_lua_closeslot"] = createExportWrapper("lua_closeslot");

/** @type {function(...*):?} */
var _lua_rotate = Module["_lua_rotate"] = createExportWrapper("lua_rotate");

/** @type {function(...*):?} */
var _lua_copy = Module["_lua_copy"] = createExportWrapper("lua_copy");

/** @type {function(...*):?} */
var _lua_pushvalue = Module["_lua_pushvalue"] = createExportWrapper("lua_pushvalue");

/** @type {function(...*):?} */
var _lua_type = Module["_lua_type"] = createExportWrapper("lua_type");

/** @type {function(...*):?} */
var _lua_typename = Module["_lua_typename"] = createExportWrapper("lua_typename");

/** @type {function(...*):?} */
var _lua_iscfunction = Module["_lua_iscfunction"] = createExportWrapper("lua_iscfunction");

/** @type {function(...*):?} */
var _lua_isinteger = Module["_lua_isinteger"] = createExportWrapper("lua_isinteger");

/** @type {function(...*):?} */
var _lua_isnumber = Module["_lua_isnumber"] = createExportWrapper("lua_isnumber");

/** @type {function(...*):?} */
var _lua_isstring = Module["_lua_isstring"] = createExportWrapper("lua_isstring");

/** @type {function(...*):?} */
var _lua_isuserdata = Module["_lua_isuserdata"] = createExportWrapper("lua_isuserdata");

/** @type {function(...*):?} */
var _lua_rawequal = Module["_lua_rawequal"] = createExportWrapper("lua_rawequal");

/** @type {function(...*):?} */
var _lua_arith = Module["_lua_arith"] = createExportWrapper("lua_arith");

/** @type {function(...*):?} */
var _lua_compare = Module["_lua_compare"] = createExportWrapper("lua_compare");

/** @type {function(...*):?} */
var _lua_stringtonumber = Module["_lua_stringtonumber"] = createExportWrapper("lua_stringtonumber");

/** @type {function(...*):?} */
var _lua_tonumberx = Module["_lua_tonumberx"] = createExportWrapper("lua_tonumberx");

/** @type {function(...*):?} */
var _lua_tointegerx = Module["_lua_tointegerx"] = createExportWrapper("lua_tointegerx");

/** @type {function(...*):?} */
var _lua_toboolean = Module["_lua_toboolean"] = createExportWrapper("lua_toboolean");

/** @type {function(...*):?} */
var _lua_tolstring = Module["_lua_tolstring"] = createExportWrapper("lua_tolstring");

/** @type {function(...*):?} */
var _lua_rawlen = Module["_lua_rawlen"] = createExportWrapper("lua_rawlen");

/** @type {function(...*):?} */
var _lua_tocfunction = Module["_lua_tocfunction"] = createExportWrapper("lua_tocfunction");

/** @type {function(...*):?} */
var _lua_touserdata = Module["_lua_touserdata"] = createExportWrapper("lua_touserdata");

/** @type {function(...*):?} */
var _lua_tothread = Module["_lua_tothread"] = createExportWrapper("lua_tothread");

/** @type {function(...*):?} */
var _lua_topointer = Module["_lua_topointer"] = createExportWrapper("lua_topointer");

/** @type {function(...*):?} */
var _lua_pushnil = Module["_lua_pushnil"] = createExportWrapper("lua_pushnil");

/** @type {function(...*):?} */
var _lua_pushnumber = Module["_lua_pushnumber"] = createExportWrapper("lua_pushnumber");

/** @type {function(...*):?} */
var _lua_pushinteger = Module["_lua_pushinteger"] = createExportWrapper("lua_pushinteger");

/** @type {function(...*):?} */
var _lua_pushlstring = Module["_lua_pushlstring"] = createExportWrapper("lua_pushlstring");

/** @type {function(...*):?} */
var _lua_pushstring = Module["_lua_pushstring"] = createExportWrapper("lua_pushstring");

/** @type {function(...*):?} */
var _lua_pushvfstring = Module["_lua_pushvfstring"] = createExportWrapper("lua_pushvfstring");

/** @type {function(...*):?} */
var _lua_pushfstring = Module["_lua_pushfstring"] = createExportWrapper("lua_pushfstring");

/** @type {function(...*):?} */
var _lua_pushcclosure = Module["_lua_pushcclosure"] = createExportWrapper("lua_pushcclosure");

/** @type {function(...*):?} */
var _lua_pushboolean = Module["_lua_pushboolean"] = createExportWrapper("lua_pushboolean");

/** @type {function(...*):?} */
var _lua_pushlightuserdata = Module["_lua_pushlightuserdata"] = createExportWrapper("lua_pushlightuserdata");

/** @type {function(...*):?} */
var _lua_pushthread = Module["_lua_pushthread"] = createExportWrapper("lua_pushthread");

/** @type {function(...*):?} */
var _lua_getglobal = Module["_lua_getglobal"] = createExportWrapper("lua_getglobal");

/** @type {function(...*):?} */
var _lua_gettable = Module["_lua_gettable"] = createExportWrapper("lua_gettable");

/** @type {function(...*):?} */
var _lua_getfield = Module["_lua_getfield"] = createExportWrapper("lua_getfield");

/** @type {function(...*):?} */
var _lua_geti = Module["_lua_geti"] = createExportWrapper("lua_geti");

/** @type {function(...*):?} */
var _lua_rawget = Module["_lua_rawget"] = createExportWrapper("lua_rawget");

/** @type {function(...*):?} */
var _lua_rawgeti = Module["_lua_rawgeti"] = createExportWrapper("lua_rawgeti");

/** @type {function(...*):?} */
var _lua_rawgetp = Module["_lua_rawgetp"] = createExportWrapper("lua_rawgetp");

/** @type {function(...*):?} */
var _lua_createtable = Module["_lua_createtable"] = createExportWrapper("lua_createtable");

/** @type {function(...*):?} */
var _lua_getmetatable = Module["_lua_getmetatable"] = createExportWrapper("lua_getmetatable");

/** @type {function(...*):?} */
var _lua_getiuservalue = Module["_lua_getiuservalue"] = createExportWrapper("lua_getiuservalue");

/** @type {function(...*):?} */
var _lua_setglobal = Module["_lua_setglobal"] = createExportWrapper("lua_setglobal");

/** @type {function(...*):?} */
var _lua_settable = Module["_lua_settable"] = createExportWrapper("lua_settable");

/** @type {function(...*):?} */
var _lua_setfield = Module["_lua_setfield"] = createExportWrapper("lua_setfield");

/** @type {function(...*):?} */
var _lua_seti = Module["_lua_seti"] = createExportWrapper("lua_seti");

/** @type {function(...*):?} */
var _lua_rawset = Module["_lua_rawset"] = createExportWrapper("lua_rawset");

/** @type {function(...*):?} */
var _lua_rawsetp = Module["_lua_rawsetp"] = createExportWrapper("lua_rawsetp");

/** @type {function(...*):?} */
var _lua_rawseti = Module["_lua_rawseti"] = createExportWrapper("lua_rawseti");

/** @type {function(...*):?} */
var _lua_setmetatable = Module["_lua_setmetatable"] = createExportWrapper("lua_setmetatable");

/** @type {function(...*):?} */
var _lua_setiuservalue = Module["_lua_setiuservalue"] = createExportWrapper("lua_setiuservalue");

/** @type {function(...*):?} */
var _lua_callk = Module["_lua_callk"] = createExportWrapper("lua_callk");

/** @type {function(...*):?} */
var _lua_pcallk = Module["_lua_pcallk"] = createExportWrapper("lua_pcallk");

/** @type {function(...*):?} */
var _lua_load = Module["_lua_load"] = createExportWrapper("lua_load");

/** @type {function(...*):?} */
var _lua_dump = Module["_lua_dump"] = createExportWrapper("lua_dump");

/** @type {function(...*):?} */
var _lua_status = Module["_lua_status"] = createExportWrapper("lua_status");

/** @type {function(...*):?} */
var _lua_gc = Module["_lua_gc"] = createExportWrapper("lua_gc");

/** @type {function(...*):?} */
var _lua_error = Module["_lua_error"] = createExportWrapper("lua_error");

/** @type {function(...*):?} */
var _lua_next = Module["_lua_next"] = createExportWrapper("lua_next");

/** @type {function(...*):?} */
var _lua_toclose = Module["_lua_toclose"] = createExportWrapper("lua_toclose");

/** @type {function(...*):?} */
var _lua_concat = Module["_lua_concat"] = createExportWrapper("lua_concat");

/** @type {function(...*):?} */
var _lua_len = Module["_lua_len"] = createExportWrapper("lua_len");

/** @type {function(...*):?} */
var _lua_getallocf = Module["_lua_getallocf"] = createExportWrapper("lua_getallocf");

/** @type {function(...*):?} */
var _lua_setallocf = Module["_lua_setallocf"] = createExportWrapper("lua_setallocf");

/** @type {function(...*):?} */
var _lua_setwarnf = Module["_lua_setwarnf"] = createExportWrapper("lua_setwarnf");

/** @type {function(...*):?} */
var _lua_warning = Module["_lua_warning"] = createExportWrapper("lua_warning");

/** @type {function(...*):?} */
var _lua_newuserdatauv = Module["_lua_newuserdatauv"] = createExportWrapper("lua_newuserdatauv");

/** @type {function(...*):?} */
var _lua_getupvalue = Module["_lua_getupvalue"] = createExportWrapper("lua_getupvalue");

/** @type {function(...*):?} */
var _lua_setupvalue = Module["_lua_setupvalue"] = createExportWrapper("lua_setupvalue");

/** @type {function(...*):?} */
var _lua_upvalueid = Module["_lua_upvalueid"] = createExportWrapper("lua_upvalueid");

/** @type {function(...*):?} */
var _lua_upvaluejoin = Module["_lua_upvaluejoin"] = createExportWrapper("lua_upvaluejoin");

/** @type {function(...*):?} */
var _luaK_semerror = Module["_luaK_semerror"] = createExportWrapper("luaK_semerror");

/** @type {function(...*):?} */
var _luaK_exp2const = Module["_luaK_exp2const"] = createExportWrapper("luaK_exp2const");

/** @type {function(...*):?} */
var _luaK_nil = Module["_luaK_nil"] = createExportWrapper("luaK_nil");

/** @type {function(...*):?} */
var _luaK_codeABCk = Module["_luaK_codeABCk"] = createExportWrapper("luaK_codeABCk");

/** @type {function(...*):?} */
var _luaK_concat = Module["_luaK_concat"] = createExportWrapper("luaK_concat");

/** @type {function(...*):?} */
var _luaK_jump = Module["_luaK_jump"] = createExportWrapper("luaK_jump");

/** @type {function(...*):?} */
var _luaK_ret = Module["_luaK_ret"] = createExportWrapper("luaK_ret");

/** @type {function(...*):?} */
var _luaK_getlabel = Module["_luaK_getlabel"] = createExportWrapper("luaK_getlabel");

/** @type {function(...*):?} */
var _luaK_patchlist = Module["_luaK_patchlist"] = createExportWrapper("luaK_patchlist");

/** @type {function(...*):?} */
var _luaK_patchtohere = Module["_luaK_patchtohere"] = createExportWrapper("luaK_patchtohere");

/** @type {function(...*):?} */
var _luaK_code = Module["_luaK_code"] = createExportWrapper("luaK_code");

/** @type {function(...*):?} */
var _luaK_codeABx = Module["_luaK_codeABx"] = createExportWrapper("luaK_codeABx");

/** @type {function(...*):?} */
var _luaK_codeAsBx = Module["_luaK_codeAsBx"] = createExportWrapper("luaK_codeAsBx");

/** @type {function(...*):?} */
var _luaK_checkstack = Module["_luaK_checkstack"] = createExportWrapper("luaK_checkstack");

/** @type {function(...*):?} */
var _luaK_reserveregs = Module["_luaK_reserveregs"] = createExportWrapper("luaK_reserveregs");

/** @type {function(...*):?} */
var _luaK_int = Module["_luaK_int"] = createExportWrapper("luaK_int");

/** @type {function(...*):?} */
var _luaK_setreturns = Module["_luaK_setreturns"] = createExportWrapper("luaK_setreturns");

/** @type {function(...*):?} */
var _luaK_setoneret = Module["_luaK_setoneret"] = createExportWrapper("luaK_setoneret");

/** @type {function(...*):?} */
var _luaK_dischargevars = Module["_luaK_dischargevars"] = createExportWrapper("luaK_dischargevars");

/** @type {function(...*):?} */
var _luaK_exp2nextreg = Module["_luaK_exp2nextreg"] = createExportWrapper("luaK_exp2nextreg");

/** @type {function(...*):?} */
var _luaK_exp2anyreg = Module["_luaK_exp2anyreg"] = createExportWrapper("luaK_exp2anyreg");

/** @type {function(...*):?} */
var _luaK_exp2anyregup = Module["_luaK_exp2anyregup"] = createExportWrapper("luaK_exp2anyregup");

/** @type {function(...*):?} */
var _luaK_exp2val = Module["_luaK_exp2val"] = createExportWrapper("luaK_exp2val");

/** @type {function(...*):?} */
var _luaK_exp2RK = Module["_luaK_exp2RK"] = createExportWrapper("luaK_exp2RK");

/** @type {function(...*):?} */
var _luaK_storevar = Module["_luaK_storevar"] = createExportWrapper("luaK_storevar");

/** @type {function(...*):?} */
var _luaK_self = Module["_luaK_self"] = createExportWrapper("luaK_self");

/** @type {function(...*):?} */
var _luaK_goiftrue = Module["_luaK_goiftrue"] = createExportWrapper("luaK_goiftrue");

/** @type {function(...*):?} */
var _luaK_goiffalse = Module["_luaK_goiffalse"] = createExportWrapper("luaK_goiffalse");

/** @type {function(...*):?} */
var _luaK_isKint = Module["_luaK_isKint"] = createExportWrapper("luaK_isKint");

/** @type {function(...*):?} */
var _luaK_indexed = Module["_luaK_indexed"] = createExportWrapper("luaK_indexed");

/** @type {function(...*):?} */
var _luaK_prefix = Module["_luaK_prefix"] = createExportWrapper("luaK_prefix");

/** @type {function(...*):?} */
var _luaK_infix = Module["_luaK_infix"] = createExportWrapper("luaK_infix");

/** @type {function(...*):?} */
var _luaK_posfix = Module["_luaK_posfix"] = createExportWrapper("luaK_posfix");

/** @type {function(...*):?} */
var _luaK_fixline = Module["_luaK_fixline"] = createExportWrapper("luaK_fixline");

/** @type {function(...*):?} */
var _luaK_settablesize = Module["_luaK_settablesize"] = createExportWrapper("luaK_settablesize");

/** @type {function(...*):?} */
var _luaK_setlist = Module["_luaK_setlist"] = createExportWrapper("luaK_setlist");

/** @type {function(...*):?} */
var _luaK_finish = Module["_luaK_finish"] = createExportWrapper("luaK_finish");

/** @type {function(...*):?} */
var _luaG_getfuncline = Module["_luaG_getfuncline"] = createExportWrapper("luaG_getfuncline");

/** @type {function(...*):?} */
var _lua_sethook = Module["_lua_sethook"] = createExportWrapper("lua_sethook");

/** @type {function(...*):?} */
var _lua_gethook = Module["_lua_gethook"] = createExportWrapper("lua_gethook");

/** @type {function(...*):?} */
var _lua_gethookmask = Module["_lua_gethookmask"] = createExportWrapper("lua_gethookmask");

/** @type {function(...*):?} */
var _lua_gethookcount = Module["_lua_gethookcount"] = createExportWrapper("lua_gethookcount");

/** @type {function(...*):?} */
var _lua_getstack = Module["_lua_getstack"] = createExportWrapper("lua_getstack");

/** @type {function(...*):?} */
var _luaG_findlocal = Module["_luaG_findlocal"] = createExportWrapper("luaG_findlocal");

/** @type {function(...*):?} */
var _lua_getlocal = Module["_lua_getlocal"] = createExportWrapper("lua_getlocal");

/** @type {function(...*):?} */
var _lua_setlocal = Module["_lua_setlocal"] = createExportWrapper("lua_setlocal");

/** @type {function(...*):?} */
var _lua_getinfo = Module["_lua_getinfo"] = createExportWrapper("lua_getinfo");

/** @type {function(...*):?} */
var _luaG_typeerror = Module["_luaG_typeerror"] = createExportWrapper("luaG_typeerror");

/** @type {function(...*):?} */
var _luaG_runerror = Module["_luaG_runerror"] = createExportWrapper("luaG_runerror");

/** @type {function(...*):?} */
var _luaG_callerror = Module["_luaG_callerror"] = createExportWrapper("luaG_callerror");

/** @type {function(...*):?} */
var _luaG_forerror = Module["_luaG_forerror"] = createExportWrapper("luaG_forerror");

/** @type {function(...*):?} */
var _luaG_errormsg = Module["_luaG_errormsg"] = createExportWrapper("luaG_errormsg");

/** @type {function(...*):?} */
var _luaG_concaterror = Module["_luaG_concaterror"] = createExportWrapper("luaG_concaterror");

/** @type {function(...*):?} */
var _luaG_opinterror = Module["_luaG_opinterror"] = createExportWrapper("luaG_opinterror");

/** @type {function(...*):?} */
var _luaG_tointerror = Module["_luaG_tointerror"] = createExportWrapper("luaG_tointerror");

/** @type {function(...*):?} */
var _luaG_ordererror = Module["_luaG_ordererror"] = createExportWrapper("luaG_ordererror");

/** @type {function(...*):?} */
var _luaG_addinfo = Module["_luaG_addinfo"] = createExportWrapper("luaG_addinfo");

/** @type {function(...*):?} */
var _luaG_traceexec = Module["_luaG_traceexec"] = createExportWrapper("luaG_traceexec");

/** @type {function(...*):?} */
var _luaD_seterrorobj = Module["_luaD_seterrorobj"] = createExportWrapper("luaD_seterrorobj");

/** @type {function(...*):?} */
var _luaD_throw = Module["_luaD_throw"] = createExportWrapper("luaD_throw");

/** @type {function(...*):?} */
var _luaD_rawrunprotected = Module["_luaD_rawrunprotected"] = createExportWrapper("luaD_rawrunprotected");

/** @type {function(...*):?} */
var _luaD_reallocstack = Module["_luaD_reallocstack"] = createExportWrapper("luaD_reallocstack");

/** @type {function(...*):?} */
var _luaD_growstack = Module["_luaD_growstack"] = createExportWrapper("luaD_growstack");

/** @type {function(...*):?} */
var _luaD_shrinkstack = Module["_luaD_shrinkstack"] = createExportWrapper("luaD_shrinkstack");

/** @type {function(...*):?} */
var _luaD_inctop = Module["_luaD_inctop"] = createExportWrapper("luaD_inctop");

/** @type {function(...*):?} */
var _luaD_hook = Module["_luaD_hook"] = createExportWrapper("luaD_hook");

/** @type {function(...*):?} */
var _luaD_hookcall = Module["_luaD_hookcall"] = createExportWrapper("luaD_hookcall");

/** @type {function(...*):?} */
var _luaD_tryfuncTM = Module["_luaD_tryfuncTM"] = createExportWrapper("luaD_tryfuncTM");

/** @type {function(...*):?} */
var _luaD_poscall = Module["_luaD_poscall"] = createExportWrapper("luaD_poscall");

/** @type {function(...*):?} */
var _luaD_pretailcall = Module["_luaD_pretailcall"] = createExportWrapper("luaD_pretailcall");

/** @type {function(...*):?} */
var _luaD_precall = Module["_luaD_precall"] = createExportWrapper("luaD_precall");

/** @type {function(...*):?} */
var _luaD_call = Module["_luaD_call"] = createExportWrapper("luaD_call");

/** @type {function(...*):?} */
var _luaD_callnoyield = Module["_luaD_callnoyield"] = createExportWrapper("luaD_callnoyield");

/** @type {function(...*):?} */
var _lua_resume = Module["_lua_resume"] = createExportWrapper("lua_resume");

/** @type {function(...*):?} */
var _lua_isyieldable = Module["_lua_isyieldable"] = createExportWrapper("lua_isyieldable");

/** @type {function(...*):?} */
var _lua_yieldk = Module["_lua_yieldk"] = createExportWrapper("lua_yieldk");

/** @type {function(...*):?} */
var _luaD_closeprotected = Module["_luaD_closeprotected"] = createExportWrapper("luaD_closeprotected");

/** @type {function(...*):?} */
var _luaD_pcall = Module["_luaD_pcall"] = createExportWrapper("luaD_pcall");

/** @type {function(...*):?} */
var _luaD_protectedparser = Module["_luaD_protectedparser"] = createExportWrapper("luaD_protectedparser");

/** @type {function(...*):?} */
var _luaU_dump = Module["_luaU_dump"] = createExportWrapper("luaU_dump");

/** @type {function(...*):?} */
var _luaF_newCclosure = Module["_luaF_newCclosure"] = createExportWrapper("luaF_newCclosure");

/** @type {function(...*):?} */
var _luaF_newLclosure = Module["_luaF_newLclosure"] = createExportWrapper("luaF_newLclosure");

/** @type {function(...*):?} */
var _luaF_initupvals = Module["_luaF_initupvals"] = createExportWrapper("luaF_initupvals");

/** @type {function(...*):?} */
var _luaF_findupval = Module["_luaF_findupval"] = createExportWrapper("luaF_findupval");

/** @type {function(...*):?} */
var _luaF_newtbcupval = Module["_luaF_newtbcupval"] = createExportWrapper("luaF_newtbcupval");

/** @type {function(...*):?} */
var _luaF_unlinkupval = Module["_luaF_unlinkupval"] = createExportWrapper("luaF_unlinkupval");

/** @type {function(...*):?} */
var _luaF_closeupval = Module["_luaF_closeupval"] = createExportWrapper("luaF_closeupval");

/** @type {function(...*):?} */
var _luaF_close = Module["_luaF_close"] = createExportWrapper("luaF_close");

/** @type {function(...*):?} */
var _luaF_newproto = Module["_luaF_newproto"] = createExportWrapper("luaF_newproto");

/** @type {function(...*):?} */
var _luaF_freeproto = Module["_luaF_freeproto"] = createExportWrapper("luaF_freeproto");

/** @type {function(...*):?} */
var _luaF_getlocalname = Module["_luaF_getlocalname"] = createExportWrapper("luaF_getlocalname");

/** @type {function(...*):?} */
var _luaC_barrier_ = Module["_luaC_barrier_"] = createExportWrapper("luaC_barrier_");

/** @type {function(...*):?} */
var _luaC_barrierback_ = Module["_luaC_barrierback_"] = createExportWrapper("luaC_barrierback_");

/** @type {function(...*):?} */
var _luaC_fix = Module["_luaC_fix"] = createExportWrapper("luaC_fix");

/** @type {function(...*):?} */
var _luaC_newobj = Module["_luaC_newobj"] = createExportWrapper("luaC_newobj");

/** @type {function(...*):?} */
var _luaC_checkfinalizer = Module["_luaC_checkfinalizer"] = createExportWrapper("luaC_checkfinalizer");

/** @type {function(...*):?} */
var _luaC_changemode = Module["_luaC_changemode"] = createExportWrapper("luaC_changemode");

/** @type {function(...*):?} */
var _luaC_freeallobjects = Module["_luaC_freeallobjects"] = createExportWrapper("luaC_freeallobjects");

/** @type {function(...*):?} */
var _luaC_runtilstate = Module["_luaC_runtilstate"] = createExportWrapper("luaC_runtilstate");

/** @type {function(...*):?} */
var _luaC_step = Module["_luaC_step"] = createExportWrapper("luaC_step");

/** @type {function(...*):?} */
var _luaC_fullgc = Module["_luaC_fullgc"] = createExportWrapper("luaC_fullgc");

/** @type {function(...*):?} */
var _luaX_init = Module["_luaX_init"] = createExportWrapper("luaX_init");

/** @type {function(...*):?} */
var _luaX_token2str = Module["_luaX_token2str"] = createExportWrapper("luaX_token2str");

/** @type {function(...*):?} */
var _luaX_syntaxerror = Module["_luaX_syntaxerror"] = createExportWrapper("luaX_syntaxerror");

/** @type {function(...*):?} */
var _luaX_newstring = Module["_luaX_newstring"] = createExportWrapper("luaX_newstring");

/** @type {function(...*):?} */
var _luaX_setinput = Module["_luaX_setinput"] = createExportWrapper("luaX_setinput");

/** @type {function(...*):?} */
var _luaX_next = Module["_luaX_next"] = createExportWrapper("luaX_next");

/** @type {function(...*):?} */
var _luaX_lookahead = Module["_luaX_lookahead"] = createExportWrapper("luaX_lookahead");

/** @type {function(...*):?} */
var _luaM_growaux_ = Module["_luaM_growaux_"] = createExportWrapper("luaM_growaux_");

/** @type {function(...*):?} */
var _luaM_saferealloc_ = Module["_luaM_saferealloc_"] = createExportWrapper("luaM_saferealloc_");

/** @type {function(...*):?} */
var _luaM_shrinkvector_ = Module["_luaM_shrinkvector_"] = createExportWrapper("luaM_shrinkvector_");

/** @type {function(...*):?} */
var _luaM_toobig = Module["_luaM_toobig"] = createExportWrapper("luaM_toobig");

/** @type {function(...*):?} */
var _luaM_free_ = Module["_luaM_free_"] = createExportWrapper("luaM_free_");

/** @type {function(...*):?} */
var _luaM_realloc_ = Module["_luaM_realloc_"] = createExportWrapper("luaM_realloc_");

/** @type {function(...*):?} */
var _luaM_malloc_ = Module["_luaM_malloc_"] = createExportWrapper("luaM_malloc_");

/** @type {function(...*):?} */
var _luaO_ceillog2 = Module["_luaO_ceillog2"] = createExportWrapper("luaO_ceillog2");

/** @type {function(...*):?} */
var _luaO_rawarith = Module["_luaO_rawarith"] = createExportWrapper("luaO_rawarith");

/** @type {function(...*):?} */
var _luaO_arith = Module["_luaO_arith"] = createExportWrapper("luaO_arith");

/** @type {function(...*):?} */
var _luaO_hexavalue = Module["_luaO_hexavalue"] = createExportWrapper("luaO_hexavalue");

/** @type {function(...*):?} */
var _luaO_str2num = Module["_luaO_str2num"] = createExportWrapper("luaO_str2num");

/** @type {function(...*):?} */
var _luaO_utf8esc = Module["_luaO_utf8esc"] = createExportWrapper("luaO_utf8esc");

/** @type {function(...*):?} */
var _luaO_tostring = Module["_luaO_tostring"] = createExportWrapper("luaO_tostring");

/** @type {function(...*):?} */
var _luaO_pushvfstring = Module["_luaO_pushvfstring"] = createExportWrapper("luaO_pushvfstring");

/** @type {function(...*):?} */
var _luaO_pushfstring = Module["_luaO_pushfstring"] = createExportWrapper("luaO_pushfstring");

/** @type {function(...*):?} */
var _luaO_chunkid = Module["_luaO_chunkid"] = createExportWrapper("luaO_chunkid");

/** @type {function(...*):?} */
var _luaY_nvarstack = Module["_luaY_nvarstack"] = createExportWrapper("luaY_nvarstack");

/** @type {function(...*):?} */
var _luaY_parser = Module["_luaY_parser"] = createExportWrapper("luaY_parser");

/** @type {function(...*):?} */
var _luaE_setdebt = Module["_luaE_setdebt"] = createExportWrapper("luaE_setdebt");

/** @type {function(...*):?} */
var _lua_setcstacklimit = Module["_lua_setcstacklimit"] = createExportWrapper("lua_setcstacklimit");

/** @type {function(...*):?} */
var _luaE_extendCI = Module["_luaE_extendCI"] = createExportWrapper("luaE_extendCI");

/** @type {function(...*):?} */
var _luaE_freeCI = Module["_luaE_freeCI"] = createExportWrapper("luaE_freeCI");

/** @type {function(...*):?} */
var _luaE_shrinkCI = Module["_luaE_shrinkCI"] = createExportWrapper("luaE_shrinkCI");

/** @type {function(...*):?} */
var _luaE_checkcstack = Module["_luaE_checkcstack"] = createExportWrapper("luaE_checkcstack");

/** @type {function(...*):?} */
var _luaE_incCstack = Module["_luaE_incCstack"] = createExportWrapper("luaE_incCstack");

/** @type {function(...*):?} */
var _lua_newthread = Module["_lua_newthread"] = createExportWrapper("lua_newthread");

/** @type {function(...*):?} */
var _luaE_freethread = Module["_luaE_freethread"] = createExportWrapper("luaE_freethread");

/** @type {function(...*):?} */
var _luaE_resetthread = Module["_luaE_resetthread"] = createExportWrapper("luaE_resetthread");

/** @type {function(...*):?} */
var _lua_resetthread = Module["_lua_resetthread"] = createExportWrapper("lua_resetthread");

/** @type {function(...*):?} */
var _lua_newstate = Module["_lua_newstate"] = createExportWrapper("lua_newstate");

/** @type {function(...*):?} */
var _lua_close = Module["_lua_close"] = createExportWrapper("lua_close");

/** @type {function(...*):?} */
var _luaE_warning = Module["_luaE_warning"] = createExportWrapper("luaE_warning");

/** @type {function(...*):?} */
var _luaE_warnerror = Module["_luaE_warnerror"] = createExportWrapper("luaE_warnerror");

/** @type {function(...*):?} */
var _luaS_eqlngstr = Module["_luaS_eqlngstr"] = createExportWrapper("luaS_eqlngstr");

/** @type {function(...*):?} */
var _luaS_hash = Module["_luaS_hash"] = createExportWrapper("luaS_hash");

/** @type {function(...*):?} */
var _luaS_hashlongstr = Module["_luaS_hashlongstr"] = createExportWrapper("luaS_hashlongstr");

/** @type {function(...*):?} */
var _luaS_resize = Module["_luaS_resize"] = createExportWrapper("luaS_resize");

/** @type {function(...*):?} */
var _luaS_clearcache = Module["_luaS_clearcache"] = createExportWrapper("luaS_clearcache");

/** @type {function(...*):?} */
var _luaS_init = Module["_luaS_init"] = createExportWrapper("luaS_init");

/** @type {function(...*):?} */
var _luaS_newlstr = Module["_luaS_newlstr"] = createExportWrapper("luaS_newlstr");

/** @type {function(...*):?} */
var _luaS_createlngstrobj = Module["_luaS_createlngstrobj"] = createExportWrapper("luaS_createlngstrobj");

/** @type {function(...*):?} */
var _luaS_remove = Module["_luaS_remove"] = createExportWrapper("luaS_remove");

/** @type {function(...*):?} */
var _luaS_new = Module["_luaS_new"] = createExportWrapper("luaS_new");

/** @type {function(...*):?} */
var _luaS_newudata = Module["_luaS_newudata"] = createExportWrapper("luaS_newudata");

/** @type {function(...*):?} */
var _luaH_realasize = Module["_luaH_realasize"] = createExportWrapper("luaH_realasize");

/** @type {function(...*):?} */
var _luaH_next = Module["_luaH_next"] = createExportWrapper("luaH_next");

/** @type {function(...*):?} */
var _luaH_resize = Module["_luaH_resize"] = createExportWrapper("luaH_resize");

/** @type {function(...*):?} */
var _luaH_getint = Module["_luaH_getint"] = createExportWrapper("luaH_getint");

/** @type {function(...*):?} */
var _luaH_newkey = Module["_luaH_newkey"] = createExportWrapper("luaH_newkey");

/** @type {function(...*):?} */
var _luaH_get = Module["_luaH_get"] = createExportWrapper("luaH_get");

/** @type {function(...*):?} */
var _luaH_setint = Module["_luaH_setint"] = createExportWrapper("luaH_setint");

/** @type {function(...*):?} */
var _luaH_resizearray = Module["_luaH_resizearray"] = createExportWrapper("luaH_resizearray");

/** @type {function(...*):?} */
var _luaH_new = Module["_luaH_new"] = createExportWrapper("luaH_new");

/** @type {function(...*):?} */
var _luaH_free = Module["_luaH_free"] = createExportWrapper("luaH_free");

/** @type {function(...*):?} */
var _luaH_set = Module["_luaH_set"] = createExportWrapper("luaH_set");

/** @type {function(...*):?} */
var _luaH_getshortstr = Module["_luaH_getshortstr"] = createExportWrapper("luaH_getshortstr");

/** @type {function(...*):?} */
var _luaH_getstr = Module["_luaH_getstr"] = createExportWrapper("luaH_getstr");

/** @type {function(...*):?} */
var _luaH_finishset = Module["_luaH_finishset"] = createExportWrapper("luaH_finishset");

/** @type {function(...*):?} */
var _luaH_getn = Module["_luaH_getn"] = createExportWrapper("luaH_getn");

/** @type {function(...*):?} */
var _luaT_init = Module["_luaT_init"] = createExportWrapper("luaT_init");

/** @type {function(...*):?} */
var _luaT_gettm = Module["_luaT_gettm"] = createExportWrapper("luaT_gettm");

/** @type {function(...*):?} */
var _luaT_gettmbyobj = Module["_luaT_gettmbyobj"] = createExportWrapper("luaT_gettmbyobj");

/** @type {function(...*):?} */
var _luaT_objtypename = Module["_luaT_objtypename"] = createExportWrapper("luaT_objtypename");

/** @type {function(...*):?} */
var _luaT_callTM = Module["_luaT_callTM"] = createExportWrapper("luaT_callTM");

/** @type {function(...*):?} */
var _luaT_callTMres = Module["_luaT_callTMres"] = createExportWrapper("luaT_callTMres");

/** @type {function(...*):?} */
var _luaT_trybinTM = Module["_luaT_trybinTM"] = createExportWrapper("luaT_trybinTM");

/** @type {function(...*):?} */
var _luaT_tryconcatTM = Module["_luaT_tryconcatTM"] = createExportWrapper("luaT_tryconcatTM");

/** @type {function(...*):?} */
var _luaT_trybinassocTM = Module["_luaT_trybinassocTM"] = createExportWrapper("luaT_trybinassocTM");

/** @type {function(...*):?} */
var _luaT_trybiniTM = Module["_luaT_trybiniTM"] = createExportWrapper("luaT_trybiniTM");

/** @type {function(...*):?} */
var _luaT_callorderTM = Module["_luaT_callorderTM"] = createExportWrapper("luaT_callorderTM");

/** @type {function(...*):?} */
var _luaT_callorderiTM = Module["_luaT_callorderiTM"] = createExportWrapper("luaT_callorderiTM");

/** @type {function(...*):?} */
var _luaT_adjustvarargs = Module["_luaT_adjustvarargs"] = createExportWrapper("luaT_adjustvarargs");

/** @type {function(...*):?} */
var _luaT_getvarargs = Module["_luaT_getvarargs"] = createExportWrapper("luaT_getvarargs");

/** @type {function(...*):?} */
var _luaU_undump = Module["_luaU_undump"] = createExportWrapper("luaU_undump");

/** @type {function(...*):?} */
var _luaV_tonumber_ = Module["_luaV_tonumber_"] = createExportWrapper("luaV_tonumber_");

/** @type {function(...*):?} */
var _luaV_flttointeger = Module["_luaV_flttointeger"] = createExportWrapper("luaV_flttointeger");

/** @type {function(...*):?} */
var _luaV_tointegerns = Module["_luaV_tointegerns"] = createExportWrapper("luaV_tointegerns");

/** @type {function(...*):?} */
var _luaV_tointeger = Module["_luaV_tointeger"] = createExportWrapper("luaV_tointeger");

/** @type {function(...*):?} */
var _luaV_finishget = Module["_luaV_finishget"] = createExportWrapper("luaV_finishget");

/** @type {function(...*):?} */
var _luaV_finishset = Module["_luaV_finishset"] = createExportWrapper("luaV_finishset");

/** @type {function(...*):?} */
var _luaV_lessthan = Module["_luaV_lessthan"] = createExportWrapper("luaV_lessthan");

/** @type {function(...*):?} */
var _luaV_lessequal = Module["_luaV_lessequal"] = createExportWrapper("luaV_lessequal");

/** @type {function(...*):?} */
var _luaV_equalobj = Module["_luaV_equalobj"] = createExportWrapper("luaV_equalobj");

/** @type {function(...*):?} */
var _luaV_concat = Module["_luaV_concat"] = createExportWrapper("luaV_concat");

/** @type {function(...*):?} */
var _luaV_objlen = Module["_luaV_objlen"] = createExportWrapper("luaV_objlen");

/** @type {function(...*):?} */
var _luaV_idiv = Module["_luaV_idiv"] = createExportWrapper("luaV_idiv");

/** @type {function(...*):?} */
var _luaV_mod = Module["_luaV_mod"] = createExportWrapper("luaV_mod");

/** @type {function(...*):?} */
var _luaV_modf = Module["_luaV_modf"] = createExportWrapper("luaV_modf");

/** @type {function(...*):?} */
var _luaV_shiftl = Module["_luaV_shiftl"] = createExportWrapper("luaV_shiftl");

/** @type {function(...*):?} */
var _luaV_finishOp = Module["_luaV_finishOp"] = createExportWrapper("luaV_finishOp");

/** @type {function(...*):?} */
var _luaV_execute = Module["_luaV_execute"] = createExportWrapper("luaV_execute");

/** @type {function(...*):?} */
var _luaZ_fill = Module["_luaZ_fill"] = createExportWrapper("luaZ_fill");

/** @type {function(...*):?} */
var _luaZ_init = Module["_luaZ_init"] = createExportWrapper("luaZ_init");

/** @type {function(...*):?} */
var _luaZ_read = Module["_luaZ_read"] = createExportWrapper("luaZ_read");

/** @type {function(...*):?} */
var _luaL_traceback = Module["_luaL_traceback"] = createExportWrapper("luaL_traceback");

/** @type {function(...*):?} */
var _luaL_buffinit = Module["_luaL_buffinit"] = createExportWrapper("luaL_buffinit");

/** @type {function(...*):?} */
var _luaL_addstring = Module["_luaL_addstring"] = createExportWrapper("luaL_addstring");

/** @type {function(...*):?} */
var _luaL_prepbuffsize = Module["_luaL_prepbuffsize"] = createExportWrapper("luaL_prepbuffsize");

/** @type {function(...*):?} */
var _luaL_addvalue = Module["_luaL_addvalue"] = createExportWrapper("luaL_addvalue");

/** @type {function(...*):?} */
var _luaL_pushresult = Module["_luaL_pushresult"] = createExportWrapper("luaL_pushresult");

/** @type {function(...*):?} */
var _luaL_argerror = Module["_luaL_argerror"] = createExportWrapper("luaL_argerror");

/** @type {function(...*):?} */
var _luaL_error = Module["_luaL_error"] = createExportWrapper("luaL_error");

/** @type {function(...*):?} */
var _luaL_typeerror = Module["_luaL_typeerror"] = createExportWrapper("luaL_typeerror");

/** @type {function(...*):?} */
var _luaL_getmetafield = Module["_luaL_getmetafield"] = createExportWrapper("luaL_getmetafield");

/** @type {function(...*):?} */
var _luaL_where = Module["_luaL_where"] = createExportWrapper("luaL_where");

/** @type {function(...*):?} */
var _luaL_fileresult = Module["_luaL_fileresult"] = createExportWrapper("luaL_fileresult");

/** @type {function(...*):?} */
var _luaL_execresult = Module["_luaL_execresult"] = createExportWrapper("luaL_execresult");

/** @type {function(...*):?} */
var _luaL_newmetatable = Module["_luaL_newmetatable"] = createExportWrapper("luaL_newmetatable");

/** @type {function(...*):?} */
var _luaL_setmetatable = Module["_luaL_setmetatable"] = createExportWrapper("luaL_setmetatable");

/** @type {function(...*):?} */
var _luaL_testudata = Module["_luaL_testudata"] = createExportWrapper("luaL_testudata");

/** @type {function(...*):?} */
var _luaL_checkudata = Module["_luaL_checkudata"] = createExportWrapper("luaL_checkudata");

/** @type {function(...*):?} */
var _luaL_checkoption = Module["_luaL_checkoption"] = createExportWrapper("luaL_checkoption");

/** @type {function(...*):?} */
var _luaL_optlstring = Module["_luaL_optlstring"] = createExportWrapper("luaL_optlstring");

/** @type {function(...*):?} */
var _luaL_checklstring = Module["_luaL_checklstring"] = createExportWrapper("luaL_checklstring");

/** @type {function(...*):?} */
var _luaL_checkstack = Module["_luaL_checkstack"] = createExportWrapper("luaL_checkstack");

/** @type {function(...*):?} */
var _luaL_checktype = Module["_luaL_checktype"] = createExportWrapper("luaL_checktype");

/** @type {function(...*):?} */
var _luaL_checkany = Module["_luaL_checkany"] = createExportWrapper("luaL_checkany");

/** @type {function(...*):?} */
var _luaL_checknumber = Module["_luaL_checknumber"] = createExportWrapper("luaL_checknumber");

/** @type {function(...*):?} */
var _luaL_optnumber = Module["_luaL_optnumber"] = createExportWrapper("luaL_optnumber");

/** @type {function(...*):?} */
var _luaL_checkinteger = Module["_luaL_checkinteger"] = createExportWrapper("luaL_checkinteger");

/** @type {function(...*):?} */
var _luaL_optinteger = Module["_luaL_optinteger"] = createExportWrapper("luaL_optinteger");

/** @type {function(...*):?} */
var _luaL_setfuncs = Module["_luaL_setfuncs"] = createExportWrapper("luaL_setfuncs");

/** @type {function(...*):?} */
var _luaL_addlstring = Module["_luaL_addlstring"] = createExportWrapper("luaL_addlstring");

/** @type {function(...*):?} */
var _luaL_pushresultsize = Module["_luaL_pushresultsize"] = createExportWrapper("luaL_pushresultsize");

/** @type {function(...*):?} */
var _luaL_buffinitsize = Module["_luaL_buffinitsize"] = createExportWrapper("luaL_buffinitsize");

/** @type {function(...*):?} */
var _luaL_ref = Module["_luaL_ref"] = createExportWrapper("luaL_ref");

/** @type {function(...*):?} */
var _luaL_unref = Module["_luaL_unref"] = createExportWrapper("luaL_unref");

/** @type {function(...*):?} */
var _luaL_loadfilex = Module["_luaL_loadfilex"] = createExportWrapper("luaL_loadfilex");

/** @type {function(...*):?} */
var _luaL_loadbufferx = Module["_luaL_loadbufferx"] = createExportWrapper("luaL_loadbufferx");

/** @type {function(...*):?} */
var _luaL_loadstring = Module["_luaL_loadstring"] = createExportWrapper("luaL_loadstring");

/** @type {function(...*):?} */
var _luaL_callmeta = Module["_luaL_callmeta"] = createExportWrapper("luaL_callmeta");

/** @type {function(...*):?} */
var _luaL_len = Module["_luaL_len"] = createExportWrapper("luaL_len");

/** @type {function(...*):?} */
var _luaL_tolstring = Module["_luaL_tolstring"] = createExportWrapper("luaL_tolstring");

/** @type {function(...*):?} */
var _luaL_getsubtable = Module["_luaL_getsubtable"] = createExportWrapper("luaL_getsubtable");

/** @type {function(...*):?} */
var _luaL_requiref = Module["_luaL_requiref"] = createExportWrapper("luaL_requiref");

/** @type {function(...*):?} */
var _luaL_addgsub = Module["_luaL_addgsub"] = createExportWrapper("luaL_addgsub");

/** @type {function(...*):?} */
var _luaL_gsub = Module["_luaL_gsub"] = createExportWrapper("luaL_gsub");

/** @type {function(...*):?} */
var _luaL_newstate = Module["_luaL_newstate"] = createExportWrapper("luaL_newstate");

/** @type {function(...*):?} */
var _luaL_checkversion_ = Module["_luaL_checkversion_"] = createExportWrapper("luaL_checkversion_");

/** @type {function(...*):?} */
var _luaopen_base = Module["_luaopen_base"] = createExportWrapper("luaopen_base");

/** @type {function(...*):?} */
var _luaopen_debug = Module["_luaopen_debug"] = createExportWrapper("luaopen_debug");

/** @type {function(...*):?} */
var _luaopen_io = Module["_luaopen_io"] = createExportWrapper("luaopen_io");

/** @type {function(...*):?} */
var _luaopen_math = Module["_luaopen_math"] = createExportWrapper("luaopen_math");

/** @type {function(...*):?} */
var _luaopen_os = Module["_luaopen_os"] = createExportWrapper("luaopen_os");

/** @type {function(...*):?} */
var _luaopen_table = Module["_luaopen_table"] = createExportWrapper("luaopen_table");

/** @type {function(...*):?} */
var _luaopen_string = Module["_luaopen_string"] = createExportWrapper("luaopen_string");

/** @type {function(...*):?} */
var _luaopen_utf8 = Module["_luaopen_utf8"] = createExportWrapper("luaopen_utf8");

/** @type {function(...*):?} */
var _luaopen_package = Module["_luaopen_package"] = createExportWrapper("luaopen_package");

/** @type {function(...*):?} */
var _luaopen_coroutine = Module["_luaopen_coroutine"] = createExportWrapper("luaopen_coroutine");

/** @type {function(...*):?} */
var _luaL_openlibs = Module["_luaL_openlibs"] = createExportWrapper("luaL_openlibs");

/** @type {function(...*):?} */
var _memcmp = Module["_memcmp"] = createExportWrapper("memcmp");

/** @type {function(...*):?} */
var _memset = Module["_memset"] = createExportWrapper("memset");

/** @type {function(...*):?} */
var _strcmp = Module["_strcmp"] = createExportWrapper("strcmp");

/** @type {function(...*):?} */
var _strlen = Module["_strlen"] = createExportWrapper("strlen");

/** @type {function(...*):?} */
var _time = Module["_time"] = createExportWrapper("time");

/** @type {function(...*):?} */
var _strcoll = Module["_strcoll"] = createExportWrapper("strcoll");

/** @type {function(...*):?} */
var _fmod = Module["_fmod"] = createExportWrapper("fmod");

/** @type {function(...*):?} */
var _pow = Module["_pow"] = createExportWrapper("pow");

/** @type {function(...*):?} */
var _strpbrk = Module["_strpbrk"] = createExportWrapper("strpbrk");

/** @type {function(...*):?} */
var _strtod = Module["_strtod"] = createExportWrapper("strtod");

/** @type {function(...*):?} */
var _strchr = Module["_strchr"] = createExportWrapper("strchr");

/** @type {function(...*):?} */
var _strcpy = Module["_strcpy"] = createExportWrapper("strcpy");

/** @type {function(...*):?} */
var _localeconv = Module["_localeconv"] = createExportWrapper("localeconv");

/** @type {function(...*):?} */
var _snprintf = Module["_snprintf"] = createExportWrapper("snprintf");

/** @type {function(...*):?} */
var _strspn = Module["_strspn"] = createExportWrapper("strspn");

/** @type {function(...*):?} */
var _frexp = Module["_frexp"] = createExportWrapper("frexp");

/** @type {function(...*):?} */
var _emscripten_longjmp = Module["_emscripten_longjmp"] = createExportWrapper("emscripten_longjmp");

/** @type {function(...*):?} */
var _saveSetjmp = Module["_saveSetjmp"] = createExportWrapper("saveSetjmp");

/** @type {function(...*):?} */
var getTempRet0 = Module["getTempRet0"] = createExportWrapper("getTempRet0");

/** @type {function(...*):?} */
var _testSetjmp = Module["_testSetjmp"] = createExportWrapper("testSetjmp");

/** @type {function(...*):?} */
var setTempRet0 = Module["setTempRet0"] = createExportWrapper("setTempRet0");

/** @type {function(...*):?} */
var _ldexp = Module["_ldexp"] = createExportWrapper("ldexp");

/** @type {function(...*):?} */
var _strncmp = Module["_strncmp"] = createExportWrapper("strncmp");

/** @type {function(...*):?} */
var ___errno_location = Module["___errno_location"] = createExportWrapper("__errno_location");

/** @type {function(...*):?} */
var _strerror = Module["_strerror"] = createExportWrapper("strerror");

/** @type {function(...*):?} */
var _fopen = Module["_fopen"] = createExportWrapper("fopen");

/** @type {function(...*):?} */
var _freopen = Module["_freopen"] = createExportWrapper("freopen");

/** @type {function(...*):?} */
var _ferror = Module["_ferror"] = createExportWrapper("ferror");

/** @type {function(...*):?} */
var _fclose = Module["_fclose"] = createExportWrapper("fclose");

/** @type {function(...*):?} */
var _getc = Module["_getc"] = createExportWrapper("getc");

/** @type {function(...*):?} */
var _feof = Module["_feof"] = createExportWrapper("feof");

/** @type {function(...*):?} */
var _fread = Module["_fread"] = createExportWrapper("fread");

/** @type {function(...*):?} */
var _strstr = Module["_strstr"] = createExportWrapper("strstr");

/** @type {function(...*):?} */
var _realloc = Module["_realloc"] = createExportWrapper("realloc");

/** @type {function(...*):?} */
var _isalnum = Module["_isalnum"] = createExportWrapper("isalnum");

/** @type {function(...*):?} */
var _toupper = Module["_toupper"] = createExportWrapper("toupper");

/** @type {function(...*):?} */
var _getenv = Module["_getenv"] = createExportWrapper("getenv");

/** @type {function(...*):?} */
var _dlclose = Module["_dlclose"] = createExportWrapper("dlclose");

/** @type {function(...*):?} */
var _dlopen = Module["_dlopen"] = createExportWrapper("dlopen");

/** @type {function(...*):?} */
var _dlerror = Module["_dlerror"] = createExportWrapper("dlerror");

/** @type {function(...*):?} */
var _dlsym = Module["_dlsym"] = createExportWrapper("dlsym");

/** @type {function(...*):?} */
var _clock = Module["_clock"] = createExportWrapper("clock");

/** @type {function(...*):?} */
var _fflush = Module["_fflush"] = createExportWrapper("fflush");

/** @type {function(...*):?} */
var _memchr = Module["_memchr"] = createExportWrapper("memchr");

/** @type {function(...*):?} */
var _popen = Module["_popen"] = createExportWrapper("popen");

/** @type {function(...*):?} */
var _tmpfile = Module["_tmpfile"] = createExportWrapper("tmpfile");

/** @type {function(...*):?} */
var _clearerr = Module["_clearerr"] = createExportWrapper("clearerr");

/** @type {function(...*):?} */
var _ungetc = Module["_ungetc"] = createExportWrapper("ungetc");

/** @type {function(...*):?} */
var _flockfile = Module["_flockfile"] = createExportWrapper("flockfile");

/** @type {function(...*):?} */
var _getc_unlocked = Module["_getc_unlocked"] = createExportWrapper("getc_unlocked");

/** @type {function(...*):?} */
var _isspace = Module["_isspace"] = createExportWrapper("isspace");

/** @type {function(...*):?} */
var _isxdigit = Module["_isxdigit"] = createExportWrapper("isxdigit");

/** @type {function(...*):?} */
var _funlockfile = Module["_funlockfile"] = createExportWrapper("funlockfile");

/** @type {function(...*):?} */
var _pclose = Module["_pclose"] = createExportWrapper("pclose");

/** @type {function(...*):?} */
var _fiprintf = Module["_fiprintf"] = createExportWrapper("fiprintf");

/** @type {function(...*):?} */
var ___small_fprintf = Module["___small_fprintf"] = createExportWrapper("__small_fprintf");

/** @type {function(...*):?} */
var _fwrite = Module["_fwrite"] = createExportWrapper("fwrite");

/** @type {function(...*):?} */
var _fseeko = Module["_fseeko"] = createExportWrapper("fseeko");

/** @type {function(...*):?} */
var _ftello = Module["_ftello"] = createExportWrapper("ftello");

/** @type {function(...*):?} */
var _setvbuf = Module["_setvbuf"] = createExportWrapper("setvbuf");

/** @type {function(...*):?} */
var _gmtime_r = Module["_gmtime_r"] = createExportWrapper("gmtime_r");

/** @type {function(...*):?} */
var _localtime_r = Module["_localtime_r"] = createExportWrapper("localtime_r");

/** @type {function(...*):?} */
var _difftime = Module["_difftime"] = createExportWrapper("difftime");

/** @type {function(...*):?} */
var _remove = Module["_remove"] = createExportWrapper("remove");

/** @type {function(...*):?} */
var _rename = Module["_rename"] = createExportWrapper("rename");

/** @type {function(...*):?} */
var _setlocale = Module["_setlocale"] = createExportWrapper("setlocale");

/** @type {function(...*):?} */
var _mktime = Module["_mktime"] = createExportWrapper("mktime");

/** @type {function(...*):?} */
var _mkstemp = Module["_mkstemp"] = createExportWrapper("mkstemp");

/** @type {function(...*):?} */
var _close = Module["_close"] = createExportWrapper("close");

/** @type {function(...*):?} */
var _isalpha = Module["_isalpha"] = createExportWrapper("isalpha");

/** @type {function(...*):?} */
var _iscntrl = Module["_iscntrl"] = createExportWrapper("iscntrl");

/** @type {function(...*):?} */
var _tolower = Module["_tolower"] = createExportWrapper("tolower");

/** @type {function(...*):?} */
var _isgraph = Module["_isgraph"] = createExportWrapper("isgraph");

/** @type {function(...*):?} */
var _islower = Module["_islower"] = createExportWrapper("islower");

/** @type {function(...*):?} */
var _ispunct = Module["_ispunct"] = createExportWrapper("ispunct");

/** @type {function(...*):?} */
var _isupper = Module["_isupper"] = createExportWrapper("isupper");

/** @type {function(...*):?} */
var _acos = Module["_acos"] = createExportWrapper("acos");

/** @type {function(...*):?} */
var _asin = Module["_asin"] = createExportWrapper("asin");

/** @type {function(...*):?} */
var _atan2 = Module["_atan2"] = createExportWrapper("atan2");

/** @type {function(...*):?} */
var _cos = Module["_cos"] = createExportWrapper("cos");

/** @type {function(...*):?} */
var _exp = Module["_exp"] = createExportWrapper("exp");

/** @type {function(...*):?} */
var _log = Module["_log"] = createExportWrapper("log");

/** @type {function(...*):?} */
var _log2 = Module["_log2"] = createExportWrapper("log2");

/** @type {function(...*):?} */
var _log10 = Module["_log10"] = createExportWrapper("log10");

/** @type {function(...*):?} */
var _sin = Module["_sin"] = createExportWrapper("sin");

/** @type {function(...*):?} */
var _tan = Module["_tan"] = createExportWrapper("tan");

/** @type {function(...*):?} */
var _fgets = Module["_fgets"] = createExportWrapper("fgets");

/** @type {function(...*):?} */
var _isatty = Module["_isatty"] = createExportWrapper("isatty");

/** @type {function(...*):?} */
var _sigemptyset = Module["_sigemptyset"] = createExportWrapper("sigemptyset");

/** @type {function(...*):?} */
var _sigaction = Module["_sigaction"] = createExportWrapper("sigaction");

/** @type {function(...*):?} */
var ___getTypeName = Module["___getTypeName"] = createExportWrapper("__getTypeName");

/** @type {function(...*):?} */
var _strdup = Module["_strdup"] = createExportWrapper("strdup");

/** @type {function(...*):?} */
var __embind_initialize_bindings = Module["__embind_initialize_bindings"] = createExportWrapper("_embind_initialize_bindings");

/** @type {function(...*):?} */
var _waitid = Module["_waitid"] = createExportWrapper("waitid");

/** @type {function(...*):?} */
var _times = Module["_times"] = createExportWrapper("times");

/** @type {function(...*):?} */
var _getdate = Module["_getdate"] = createExportWrapper("getdate");

/** @type {function(...*):?} */
var _stime = Module["_stime"] = createExportWrapper("stime");

/** @type {function(...*):?} */
var _clock_getcpuclockid = Module["_clock_getcpuclockid"] = createExportWrapper("clock_getcpuclockid");

/** @type {function(...*):?} */
var _getpwnam = Module["_getpwnam"] = createExportWrapper("getpwnam");

/** @type {function(...*):?} */
var _getpwuid = Module["_getpwuid"] = createExportWrapper("getpwuid");

/** @type {function(...*):?} */
var _getpwnam_r = Module["_getpwnam_r"] = createExportWrapper("getpwnam_r");

/** @type {function(...*):?} */
var _getpwuid_r = Module["_getpwuid_r"] = createExportWrapper("getpwuid_r");

/** @type {function(...*):?} */
var _setpwent = Module["_setpwent"] = createExportWrapper("setpwent");

/** @type {function(...*):?} */
var _endpwent = Module["_endpwent"] = createExportWrapper("endpwent");

/** @type {function(...*):?} */
var _getpwent = Module["_getpwent"] = createExportWrapper("getpwent");

/** @type {function(...*):?} */
var _getgrnam = Module["_getgrnam"] = createExportWrapper("getgrnam");

/** @type {function(...*):?} */
var _getgrgid = Module["_getgrgid"] = createExportWrapper("getgrgid");

/** @type {function(...*):?} */
var _getgrnam_r = Module["_getgrnam_r"] = createExportWrapper("getgrnam_r");

/** @type {function(...*):?} */
var _getgrgid_r = Module["_getgrgid_r"] = createExportWrapper("getgrgid_r");

/** @type {function(...*):?} */
var _getgrent = Module["_getgrent"] = createExportWrapper("getgrent");

/** @type {function(...*):?} */
var _endgrent = Module["_endgrent"] = createExportWrapper("endgrent");

/** @type {function(...*):?} */
var _setgrent = Module["_setgrent"] = createExportWrapper("setgrent");

/** @type {function(...*):?} */
var _flock = Module["_flock"] = createExportWrapper("flock");

/** @type {function(...*):?} */
var _chroot = Module["_chroot"] = createExportWrapper("chroot");

/** @type {function(...*):?} */
var _execve = Module["_execve"] = createExportWrapper("execve");

/** @type {function(...*):?} */
var _fork = Module["_fork"] = createExportWrapper("fork");

/** @type {function(...*):?} */
var _vfork = Module["_vfork"] = createExportWrapper("vfork");

/** @type {function(...*):?} */
var _posix_spawn = Module["_posix_spawn"] = createExportWrapper("posix_spawn");

/** @type {function(...*):?} */
var _getpid = Module["_getpid"] = createExportWrapper("getpid");

/** @type {function(...*):?} */
var _setgroups = Module["_setgroups"] = createExportWrapper("setgroups");

/** @type {function(...*):?} */
var _sysconf = Module["_sysconf"] = createExportWrapper("sysconf");

/** @type {function(...*):?} */
var _sigaltstack = Module["_sigaltstack"] = createExportWrapper("sigaltstack");

/** @type {function(...*):?} */
var ___syscall_uname = Module["___syscall_uname"] = createExportWrapper("__syscall_uname");

/** @type {function(...*):?} */
var ___syscall_setpgid = Module["___syscall_setpgid"] = createExportWrapper("__syscall_setpgid");

/** @type {function(...*):?} */
var ___syscall_sync = Module["___syscall_sync"] = createExportWrapper("__syscall_sync");

/** @type {function(...*):?} */
var ___syscall_getsid = Module["___syscall_getsid"] = createExportWrapper("__syscall_getsid");

/** @type {function(...*):?} */
var ___syscall_getpgid = Module["___syscall_getpgid"] = createExportWrapper("__syscall_getpgid");

/** @type {function(...*):?} */
var ___syscall_getpid = Module["___syscall_getpid"] = createExportWrapper("__syscall_getpid");

/** @type {function(...*):?} */
var ___syscall_getppid = Module["___syscall_getppid"] = createExportWrapper("__syscall_getppid");

/** @type {function(...*):?} */
var ___syscall_link = Module["___syscall_link"] = createExportWrapper("__syscall_link");

/** @type {function(...*):?} */
var ___syscall_getgroups32 = Module["___syscall_getgroups32"] = createExportWrapper("__syscall_getgroups32");

/** @type {function(...*):?} */
var ___syscall_setsid = Module["___syscall_setsid"] = createExportWrapper("__syscall_setsid");

/** @type {function(...*):?} */
var ___syscall_umask = Module["___syscall_umask"] = createExportWrapper("__syscall_umask");

/** @type {function(...*):?} */
var ___syscall_setrlimit = Module["___syscall_setrlimit"] = createExportWrapper("__syscall_setrlimit");

/** @type {function(...*):?} */
var ___syscall_getrusage = Module["___syscall_getrusage"] = createExportWrapper("__syscall_getrusage");

/** @type {function(...*):?} */
var ___syscall_getpriority = Module["___syscall_getpriority"] = createExportWrapper("__syscall_getpriority");

/** @type {function(...*):?} */
var ___syscall_setpriority = Module["___syscall_setpriority"] = createExportWrapper("__syscall_setpriority");

/** @type {function(...*):?} */
var ___syscall_setdomainname = Module["___syscall_setdomainname"] = createExportWrapper("__syscall_setdomainname");

/** @type {function(...*):?} */
var ___syscall_getuid32 = Module["___syscall_getuid32"] = createExportWrapper("__syscall_getuid32");

/** @type {function(...*):?} */
var ___syscall_getgid32 = Module["___syscall_getgid32"] = createExportWrapper("__syscall_getgid32");

/** @type {function(...*):?} */
var ___syscall_geteuid32 = Module["___syscall_geteuid32"] = createExportWrapper("__syscall_geteuid32");

/** @type {function(...*):?} */
var ___syscall_getegid32 = Module["___syscall_getegid32"] = createExportWrapper("__syscall_getegid32");

/** @type {function(...*):?} */
var ___syscall_getresuid32 = Module["___syscall_getresuid32"] = createExportWrapper("__syscall_getresuid32");

/** @type {function(...*):?} */
var ___syscall_getresgid32 = Module["___syscall_getresgid32"] = createExportWrapper("__syscall_getresgid32");

/** @type {function(...*):?} */
var ___syscall_pause = Module["___syscall_pause"] = createExportWrapper("__syscall_pause");

/** @type {function(...*):?} */
var ___syscall_madvise = Module["___syscall_madvise"] = createExportWrapper("__syscall_madvise");

/** @type {function(...*):?} */
var ___syscall_mlock = Module["___syscall_mlock"] = createExportWrapper("__syscall_mlock");

/** @type {function(...*):?} */
var ___syscall_munlock = Module["___syscall_munlock"] = createExportWrapper("__syscall_munlock");

/** @type {function(...*):?} */
var ___syscall_mprotect = Module["___syscall_mprotect"] = createExportWrapper("__syscall_mprotect");

/** @type {function(...*):?} */
var ___syscall_mremap = Module["___syscall_mremap"] = createExportWrapper("__syscall_mremap");

/** @type {function(...*):?} */
var ___syscall_mlockall = Module["___syscall_mlockall"] = createExportWrapper("__syscall_mlockall");

/** @type {function(...*):?} */
var ___syscall_munlockall = Module["___syscall_munlockall"] = createExportWrapper("__syscall_munlockall");

/** @type {function(...*):?} */
var ___syscall_prlimit64 = Module["___syscall_prlimit64"] = createExportWrapper("__syscall_prlimit64");

/** @type {function(...*):?} */
var ___syscall_ugetrlimit = Module["___syscall_ugetrlimit"] = createExportWrapper("__syscall_ugetrlimit");

/** @type {function(...*):?} */
var ___syscall_setsockopt = Module["___syscall_setsockopt"] = createExportWrapper("__syscall_setsockopt");

/** @type {function(...*):?} */
var ___syscall_acct = Module["___syscall_acct"] = createExportWrapper("__syscall_acct");

/** @type {function(...*):?} */
var ___syscall_mincore = Module["___syscall_mincore"] = createExportWrapper("__syscall_mincore");

/** @type {function(...*):?} */
var ___syscall_pipe2 = Module["___syscall_pipe2"] = createExportWrapper("__syscall_pipe2");

/** @type {function(...*):?} */
var ___syscall_pselect6 = Module["___syscall_pselect6"] = createExportWrapper("__syscall_pselect6");

/** @type {function(...*):?} */
var ___syscall_recvmmsg = Module["___syscall_recvmmsg"] = createExportWrapper("__syscall_recvmmsg");

/** @type {function(...*):?} */
var ___syscall_sendmmsg = Module["___syscall_sendmmsg"] = createExportWrapper("__syscall_sendmmsg");

/** @type {function(...*):?} */
var ___syscall_setitimer = Module["___syscall_setitimer"] = createExportWrapper("__syscall_setitimer");

/** @type {function(...*):?} */
var ___syscall_getitimer = Module["___syscall_getitimer"] = createExportWrapper("__syscall_getitimer");

/** @type {function(...*):?} */
var ___syscall_shutdown = Module["___syscall_shutdown"] = createExportWrapper("__syscall_shutdown");

/** @type {function(...*):?} */
var ___syscall_socketpair = Module["___syscall_socketpair"] = createExportWrapper("__syscall_socketpair");

/** @type {function(...*):?} */
var ___syscall_wait4 = Module["___syscall_wait4"] = createExportWrapper("__syscall_wait4");

/** @type {function(...*):?} */
var ___emscripten_environ_constructor = Module["___emscripten_environ_constructor"] = createExportWrapper("__emscripten_environ_constructor");

/** @type {function(...*):?} */
var _fdopen = Module["_fdopen"] = createExportWrapper("fdopen");

/** @type {function(...*):?} */
var ___fmodeflags = Module["___fmodeflags"] = createExportWrapper("__fmodeflags");

/** @type {function(...*):?} */
var ___fpclassifyl = Module["___fpclassifyl"] = createExportWrapper("__fpclassifyl");

/** @type {function(...*):?} */
var ___mo_lookup = Module["___mo_lookup"] = createExportWrapper("__mo_lookup");

/** @type {function(...*):?} */
var ___overflow = Module["___overflow"] = createExportWrapper("__overflow");

/** @type {function(...*):?} */
var ___randname = Module["___randname"] = createExportWrapper("__randname");

/** @type {function(...*):?} */
var ___uflow = Module["___uflow"] = createExportWrapper("__uflow");

/** @type {function(...*):?} */
var _sqrt = Module["_sqrt"] = createExportWrapper("sqrt");

/** @type {function(...*):?} */
var _fabs = Module["_fabs"] = createExportWrapper("fabs");

/** @type {function(...*):?} */
var _atan = Module["_atan"] = createExportWrapper("atan");

/** @type {function(...*):?} */
var _btowc = Module["_btowc"] = createExportWrapper("btowc");

/** @type {function(...*):?} */
var _clearerr_unlocked = Module["_clearerr_unlocked"] = createExportWrapper("clearerr_unlocked");

/** @type {function(...*):?} */
var ___wasi_syscall_ret = Module["___wasi_syscall_ret"] = createExportWrapper("__wasi_syscall_ret");

/** @type {function(...*):?} */
var _copysignl = Module["_copysignl"] = createExportWrapper("copysignl");

/** @type {function(...*):?} */
var _scalbn = Module["_scalbn"] = createExportWrapper("scalbn");

/** @type {function(...*):?} */
var _floor = Module["_floor"] = createExportWrapper("floor");

/** @type {function(...*):?} */
var ___get_tp = Module["___get_tp"] = createExportWrapper("__get_tp");

/** @type {function(...*):?} */
var ___lock = Module["___lock"] = createExportWrapper("__lock");

/** @type {function(...*):?} */
var ___unlock = Module["___unlock"] = createExportWrapper("__unlock");

/** @type {function(...*):?} */
var ___libc_free = Module["___libc_free"] = createExportWrapper("__libc_free");

/** @type {function(...*):?} */
var ___libc_malloc = Module["___libc_malloc"] = createExportWrapper("__libc_malloc");

/** @type {function(...*):?} */
var ___dl_seterr = Module["___dl_seterr"] = createExportWrapper("__dl_seterr");

/** @type {function(...*):?} */
var _dup3 = Module["_dup3"] = createExportWrapper("dup3");

/** @type {function(...*):?} */
var _pthread_setcancelstate = Module["_pthread_setcancelstate"] = createExportWrapper("pthread_setcancelstate");

/** @type {function(...*):?} */
var _pthread_rwlock_wrlock = Module["_pthread_rwlock_wrlock"] = createExportWrapper("pthread_rwlock_wrlock");

/** @type {function(...*):?} */
var _pthread_rwlock_unlock = Module["_pthread_rwlock_unlock"] = createExportWrapper("pthread_rwlock_unlock");

/** @type {function(...*):?} */
var _calloc = Module["_calloc"] = createExportWrapper("calloc");

/** @type {function(...*):?} */
var _emscripten_dlopen = Module["_emscripten_dlopen"] = createExportWrapper("emscripten_dlopen");

/** @type {function(...*):?} */
var _pthread_rwlock_rdlock = Module["_pthread_rwlock_rdlock"] = createExportWrapper("pthread_rwlock_rdlock");

/** @type {function(...*):?} */
var _dladdr = Module["_dladdr"] = createExportWrapper("dladdr");

/** @type {function(...*):?} */
var _emscripten_get_heap_size = Module["_emscripten_get_heap_size"] = createExportWrapper("emscripten_get_heap_size");

/** @type {function(...*):?} */
var _emscripten_builtin_memcpy = Module["_emscripten_builtin_memcpy"] = createExportWrapper("emscripten_builtin_memcpy");

/** @type {function(...*):?} */
var _memmove = Module["_memmove"] = createExportWrapper("memmove");

/** @type {function(...*):?} */
var _tzset = Module["_tzset"] = createExportWrapper("tzset");

/** @type {function(...*):?} */
var _timegm = Module["_timegm"] = createExportWrapper("timegm");

/** @type {function(...*):?} */
var _pthread_mutex_lock = Module["_pthread_mutex_lock"] = createExportWrapper("pthread_mutex_lock");

/** @type {function(...*):?} */
var _pthread_mutex_unlock = Module["_pthread_mutex_unlock"] = createExportWrapper("pthread_mutex_unlock");

/** @type {function(...*):?} */
var ___clock = Module["___clock"] = createExportWrapper("__clock");

/** @type {function(...*):?} */
var ___time = Module["___time"] = createExportWrapper("__time");

/** @type {function(...*):?} */
var ___clock_getres = Module["___clock_getres"] = createExportWrapper("__clock_getres");

/** @type {function(...*):?} */
var ___gettimeofday = Module["___gettimeofday"] = createExportWrapper("__gettimeofday");

/** @type {function(...*):?} */
var _dysize = Module["_dysize"] = createExportWrapper("dysize");

/** @type {function(...*):?} */
var _clock_gettime = Module["_clock_gettime"] = createExportWrapper("clock_gettime");

/** @type {function(...*):?} */
var _clock_getres = Module["_clock_getres"] = createExportWrapper("clock_getres");

/** @type {function(...*):?} */
var _gettimeofday = Module["_gettimeofday"] = createExportWrapper("gettimeofday");

/** @type {function(...*):?} */
var _fabsl = Module["_fabsl"] = createExportWrapper("fabsl");

/** @type {function(...*):?} */
var _feof_unlocked = Module["_feof_unlocked"] = createExportWrapper("feof_unlocked");

/** @type {function(...*):?} */
var __IO_feof_unlocked = Module["__IO_feof_unlocked"] = createExportWrapper("_IO_feof_unlocked");

/** @type {function(...*):?} */
var _ferror_unlocked = Module["_ferror_unlocked"] = createExportWrapper("ferror_unlocked");

/** @type {function(...*):?} */
var __IO_ferror_unlocked = Module["__IO_ferror_unlocked"] = createExportWrapper("_IO_ferror_unlocked");

/** @type {function(...*):?} */
var _fflush_unlocked = Module["_fflush_unlocked"] = createExportWrapper("fflush_unlocked");

/** @type {function(...*):?} */
var _fgets_unlocked = Module["_fgets_unlocked"] = createExportWrapper("fgets_unlocked");

/** @type {function(...*):?} */
var _ftrylockfile = Module["_ftrylockfile"] = createExportWrapper("ftrylockfile");

/** @type {function(...*):?} */
var _fmodl = Module["_fmodl"] = createExportWrapper("fmodl");

/** @type {function(...*):?} */
var _fopen64 = Module["_fopen64"] = createExportWrapper("fopen64");

/** @type {function(...*):?} */
var _fprintf = Module["_fprintf"] = createExportWrapper("fprintf");

/** @type {function(...*):?} */
var _vfprintf = Module["_vfprintf"] = createExportWrapper("vfprintf");

/** @type {function(...*):?} */
var _vfiprintf = Module["_vfiprintf"] = createExportWrapper("vfiprintf");

/** @type {function(...*):?} */
var ___small_vfprintf = Module["___small_vfprintf"] = createExportWrapper("__small_vfprintf");

/** @type {function(...*):?} */
var _fputc = Module["_fputc"] = createExportWrapper("fputc");

/** @type {function(...*):?} */
var ___fputwc_unlocked = Module["___fputwc_unlocked"] = createExportWrapper("__fputwc_unlocked");

/** @type {function(...*):?} */
var _fputwc = Module["_fputwc"] = createExportWrapper("fputwc");

/** @type {function(...*):?} */
var _fputwc_unlocked = Module["_fputwc_unlocked"] = createExportWrapper("fputwc_unlocked");

/** @type {function(...*):?} */
var _putwc_unlocked = Module["_putwc_unlocked"] = createExportWrapper("putwc_unlocked");

/** @type {function(...*):?} */
var _fread_unlocked = Module["_fread_unlocked"] = createExportWrapper("fread_unlocked");

/** @type {function(...*):?} */
var _freopen64 = Module["_freopen64"] = createExportWrapper("freopen64");

/** @type {function(...*):?} */
var _fseek = Module["_fseek"] = createExportWrapper("fseek");

/** @type {function(...*):?} */
var _fseeko64 = Module["_fseeko64"] = createExportWrapper("fseeko64");

/** @type {function(...*):?} */
var _ftell = Module["_ftell"] = createExportWrapper("ftell");

/** @type {function(...*):?} */
var _ftello64 = Module["_ftello64"] = createExportWrapper("ftello64");

/** @type {function(...*):?} */
var _fwide = Module["_fwide"] = createExportWrapper("fwide");

/** @type {function(...*):?} */
var _fwrite_unlocked = Module["_fwrite_unlocked"] = createExportWrapper("fwrite_unlocked");

/** @type {function(...*):?} */
var _emscripten_futex_wake = Module["_emscripten_futex_wake"] = createExportWrapper("emscripten_futex_wake");

/** @type {function(...*):?} */
var __IO_getc = Module["__IO_getc"] = createExportWrapper("_IO_getc");

/** @type {function(...*):?} */
var _fgetc_unlocked = Module["_fgetc_unlocked"] = createExportWrapper("fgetc_unlocked");

/** @type {function(...*):?} */
var __IO_getc_unlocked = Module["__IO_getc_unlocked"] = createExportWrapper("_IO_getc_unlocked");

/** @type {function(...*):?} */
var _emscripten_builtin_malloc = Module["_emscripten_builtin_malloc"] = createExportWrapper("emscripten_builtin_malloc");

/** @type {function(...*):?} */
var ___intscan = Module["___intscan"] = createExportWrapper("__intscan");

/** @type {function(...*):?} */
var _isdigit = Module["_isdigit"] = createExportWrapper("isdigit");

/** @type {function(...*):?} */
var ___isalnum_l = Module["___isalnum_l"] = createExportWrapper("__isalnum_l");

/** @type {function(...*):?} */
var _isalnum_l = Module["_isalnum_l"] = createExportWrapper("isalnum_l");

/** @type {function(...*):?} */
var ___isalpha_l = Module["___isalpha_l"] = createExportWrapper("__isalpha_l");

/** @type {function(...*):?} */
var _isalpha_l = Module["_isalpha_l"] = createExportWrapper("isalpha_l");

/** @type {function(...*):?} */
var ___iscntrl_l = Module["___iscntrl_l"] = createExportWrapper("__iscntrl_l");

/** @type {function(...*):?} */
var _iscntrl_l = Module["_iscntrl_l"] = createExportWrapper("iscntrl_l");

/** @type {function(...*):?} */
var ___isdigit_l = Module["___isdigit_l"] = createExportWrapper("__isdigit_l");

/** @type {function(...*):?} */
var _isdigit_l = Module["_isdigit_l"] = createExportWrapper("isdigit_l");

/** @type {function(...*):?} */
var ___isgraph_l = Module["___isgraph_l"] = createExportWrapper("__isgraph_l");

/** @type {function(...*):?} */
var _isgraph_l = Module["_isgraph_l"] = createExportWrapper("isgraph_l");

/** @type {function(...*):?} */
var ___islower_l = Module["___islower_l"] = createExportWrapper("__islower_l");

/** @type {function(...*):?} */
var _islower_l = Module["_islower_l"] = createExportWrapper("islower_l");

/** @type {function(...*):?} */
var ___ispunct_l = Module["___ispunct_l"] = createExportWrapper("__ispunct_l");

/** @type {function(...*):?} */
var _ispunct_l = Module["_ispunct_l"] = createExportWrapper("ispunct_l");

/** @type {function(...*):?} */
var ___isspace_l = Module["___isspace_l"] = createExportWrapper("__isspace_l");

/** @type {function(...*):?} */
var _isspace_l = Module["_isspace_l"] = createExportWrapper("isspace_l");

/** @type {function(...*):?} */
var ___isupper_l = Module["___isupper_l"] = createExportWrapper("__isupper_l");

/** @type {function(...*):?} */
var _isupper_l = Module["_isupper_l"] = createExportWrapper("isupper_l");

/** @type {function(...*):?} */
var _iswspace = Module["_iswspace"] = createExportWrapper("iswspace");

/** @type {function(...*):?} */
var ___iswspace_l = Module["___iswspace_l"] = createExportWrapper("__iswspace_l");

/** @type {function(...*):?} */
var _iswspace_l = Module["_iswspace_l"] = createExportWrapper("iswspace_l");

/** @type {function(...*):?} */
var ___isxdigit_l = Module["___isxdigit_l"] = createExportWrapper("__isxdigit_l");

/** @type {function(...*):?} */
var _isxdigit_l = Module["_isxdigit_l"] = createExportWrapper("isxdigit_l");

/** @type {function(...*):?} */
var _emscripten_has_threading_support = Module["_emscripten_has_threading_support"] = createExportWrapper("emscripten_has_threading_support");

/** @type {function(...*):?} */
var _emscripten_num_logical_cores = Module["_emscripten_num_logical_cores"] = createExportWrapper("emscripten_num_logical_cores");

/** @type {function(...*):?} */
var _emscripten_force_num_logical_cores = Module["_emscripten_force_num_logical_cores"] = createExportWrapper("emscripten_force_num_logical_cores");

/** @type {function(...*):?} */
var _emscripten_futex_wait = Module["_emscripten_futex_wait"] = createExportWrapper("emscripten_futex_wait");

/** @type {function(...*):?} */
var _emscripten_is_main_runtime_thread = Module["_emscripten_is_main_runtime_thread"] = createExportWrapper("emscripten_is_main_runtime_thread");

/** @type {function(...*):?} */
var _emscripten_main_thread_process_queued_calls = Module["_emscripten_main_thread_process_queued_calls"] = createExportWrapper("emscripten_main_thread_process_queued_calls");

/** @type {function(...*):?} */
var _emscripten_current_thread_process_queued_calls = Module["_emscripten_current_thread_process_queued_calls"] = createExportWrapper("emscripten_current_thread_process_queued_calls");

/** @type {function(...*):?} */
var __emscripten_yield = Module["__emscripten_yield"] = createExportWrapper("_emscripten_yield");

/** @type {function(...*):?} */
var _pthread_mutex_init = Module["_pthread_mutex_init"] = createExportWrapper("pthread_mutex_init");

/** @type {function(...*):?} */
var _pthread_mutex_destroy = Module["_pthread_mutex_destroy"] = createExportWrapper("pthread_mutex_destroy");

/** @type {function(...*):?} */
var _pthread_mutex_consistent = Module["_pthread_mutex_consistent"] = createExportWrapper("pthread_mutex_consistent");

/** @type {function(...*):?} */
var _pthread_barrier_init = Module["_pthread_barrier_init"] = createExportWrapper("pthread_barrier_init");

/** @type {function(...*):?} */
var _pthread_barrier_destroy = Module["_pthread_barrier_destroy"] = createExportWrapper("pthread_barrier_destroy");

/** @type {function(...*):?} */
var _pthread_barrier_wait = Module["_pthread_barrier_wait"] = createExportWrapper("pthread_barrier_wait");

/** @type {function(...*):?} */
var _pthread_getspecific = Module["_pthread_getspecific"] = createExportWrapper("pthread_getspecific");

/** @type {function(...*):?} */
var _pthread_setspecific = Module["_pthread_setspecific"] = createExportWrapper("pthread_setspecific");

/** @type {function(...*):?} */
var _pthread_cond_wait = Module["_pthread_cond_wait"] = createExportWrapper("pthread_cond_wait");

/** @type {function(...*):?} */
var _pthread_cond_signal = Module["_pthread_cond_signal"] = createExportWrapper("pthread_cond_signal");

/** @type {function(...*):?} */
var _pthread_cond_broadcast = Module["_pthread_cond_broadcast"] = createExportWrapper("pthread_cond_broadcast");

/** @type {function(...*):?} */
var _pthread_cond_init = Module["_pthread_cond_init"] = createExportWrapper("pthread_cond_init");

/** @type {function(...*):?} */
var _pthread_cond_destroy = Module["_pthread_cond_destroy"] = createExportWrapper("pthread_cond_destroy");

/** @type {function(...*):?} */
var _pthread_atfork = Module["_pthread_atfork"] = createExportWrapper("pthread_atfork");

/** @type {function(...*):?} */
var _pthread_cancel = Module["_pthread_cancel"] = createExportWrapper("pthread_cancel");

/** @type {function(...*):?} */
var _pthread_testcancel = Module["_pthread_testcancel"] = createExportWrapper("pthread_testcancel");

/** @type {function(...*):?} */
var ___pthread_detach = Module["___pthread_detach"] = createExportWrapper("__pthread_detach");

/** @type {function(...*):?} */
var _pthread_equal = Module["_pthread_equal"] = createExportWrapper("pthread_equal");

/** @type {function(...*):?} */
var _pthread_mutexattr_init = Module["_pthread_mutexattr_init"] = createExportWrapper("pthread_mutexattr_init");

/** @type {function(...*):?} */
var _pthread_mutexattr_setprotocol = Module["_pthread_mutexattr_setprotocol"] = createExportWrapper("pthread_mutexattr_setprotocol");

/** @type {function(...*):?} */
var _pthread_mutexattr_settype = Module["_pthread_mutexattr_settype"] = createExportWrapper("pthread_mutexattr_settype");

/** @type {function(...*):?} */
var _pthread_mutexattr_destroy = Module["_pthread_mutexattr_destroy"] = createExportWrapper("pthread_mutexattr_destroy");

/** @type {function(...*):?} */
var _pthread_mutexattr_setpshared = Module["_pthread_mutexattr_setpshared"] = createExportWrapper("pthread_mutexattr_setpshared");

/** @type {function(...*):?} */
var _pthread_condattr_init = Module["_pthread_condattr_init"] = createExportWrapper("pthread_condattr_init");

/** @type {function(...*):?} */
var _pthread_condattr_destroy = Module["_pthread_condattr_destroy"] = createExportWrapper("pthread_condattr_destroy");

/** @type {function(...*):?} */
var _pthread_condattr_setclock = Module["_pthread_condattr_setclock"] = createExportWrapper("pthread_condattr_setclock");

/** @type {function(...*):?} */
var _pthread_condattr_setpshared = Module["_pthread_condattr_setpshared"] = createExportWrapper("pthread_condattr_setpshared");

/** @type {function(...*):?} */
var _pthread_attr_init = Module["_pthread_attr_init"] = createExportWrapper("pthread_attr_init");

/** @type {function(...*):?} */
var _pthread_getattr_np = Module["_pthread_getattr_np"] = createExportWrapper("pthread_getattr_np");

/** @type {function(...*):?} */
var _pthread_attr_destroy = Module["_pthread_attr_destroy"] = createExportWrapper("pthread_attr_destroy");

/** @type {function(...*):?} */
var _pthread_setcanceltype = Module["_pthread_setcanceltype"] = createExportWrapper("pthread_setcanceltype");

/** @type {function(...*):?} */
var _pthread_rwlock_init = Module["_pthread_rwlock_init"] = createExportWrapper("pthread_rwlock_init");

/** @type {function(...*):?} */
var _pthread_rwlock_destroy = Module["_pthread_rwlock_destroy"] = createExportWrapper("pthread_rwlock_destroy");

/** @type {function(...*):?} */
var _pthread_rwlock_tryrdlock = Module["_pthread_rwlock_tryrdlock"] = createExportWrapper("pthread_rwlock_tryrdlock");

/** @type {function(...*):?} */
var _pthread_rwlock_timedrdlock = Module["_pthread_rwlock_timedrdlock"] = createExportWrapper("pthread_rwlock_timedrdlock");

/** @type {function(...*):?} */
var _pthread_rwlock_trywrlock = Module["_pthread_rwlock_trywrlock"] = createExportWrapper("pthread_rwlock_trywrlock");

/** @type {function(...*):?} */
var _pthread_rwlock_timedwrlock = Module["_pthread_rwlock_timedwrlock"] = createExportWrapper("pthread_rwlock_timedwrlock");

/** @type {function(...*):?} */
var _pthread_rwlockattr_init = Module["_pthread_rwlockattr_init"] = createExportWrapper("pthread_rwlockattr_init");

/** @type {function(...*):?} */
var _pthread_rwlockattr_destroy = Module["_pthread_rwlockattr_destroy"] = createExportWrapper("pthread_rwlockattr_destroy");

/** @type {function(...*):?} */
var _pthread_rwlockattr_setpshared = Module["_pthread_rwlockattr_setpshared"] = createExportWrapper("pthread_rwlockattr_setpshared");

/** @type {function(...*):?} */
var _pthread_spin_init = Module["_pthread_spin_init"] = createExportWrapper("pthread_spin_init");

/** @type {function(...*):?} */
var _pthread_spin_destroy = Module["_pthread_spin_destroy"] = createExportWrapper("pthread_spin_destroy");

/** @type {function(...*):?} */
var _pthread_spin_lock = Module["_pthread_spin_lock"] = createExportWrapper("pthread_spin_lock");

/** @type {function(...*):?} */
var _pthread_spin_trylock = Module["_pthread_spin_trylock"] = createExportWrapper("pthread_spin_trylock");

/** @type {function(...*):?} */
var _pthread_spin_unlock = Module["_pthread_spin_unlock"] = createExportWrapper("pthread_spin_unlock");

/** @type {function(...*):?} */
var _pthread_attr_setdetachstate = Module["_pthread_attr_setdetachstate"] = createExportWrapper("pthread_attr_setdetachstate");

/** @type {function(...*):?} */
var _pthread_attr_setschedparam = Module["_pthread_attr_setschedparam"] = createExportWrapper("pthread_attr_setschedparam");

/** @type {function(...*):?} */
var _pthread_attr_setstacksize = Module["_pthread_attr_setstacksize"] = createExportWrapper("pthread_attr_setstacksize");

/** @type {function(...*):?} */
var _sem_init = Module["_sem_init"] = createExportWrapper("sem_init");

/** @type {function(...*):?} */
var _sem_post = Module["_sem_post"] = createExportWrapper("sem_post");

/** @type {function(...*):?} */
var _sem_wait = Module["_sem_wait"] = createExportWrapper("sem_wait");

/** @type {function(...*):?} */
var _sem_trywait = Module["_sem_trywait"] = createExportWrapper("sem_trywait");

/** @type {function(...*):?} */
var _sem_destroy = Module["_sem_destroy"] = createExportWrapper("sem_destroy");

/** @type {function(...*):?} */
var _emscripten_thread_sleep = Module["_emscripten_thread_sleep"] = createExportWrapper("emscripten_thread_sleep");

/** @type {function(...*):?} */
var _pthread_mutex_trylock = Module["_pthread_mutex_trylock"] = createExportWrapper("pthread_mutex_trylock");

/** @type {function(...*):?} */
var _pthread_mutex_timedlock = Module["_pthread_mutex_timedlock"] = createExportWrapper("pthread_mutex_timedlock");

/** @type {function(...*):?} */
var _emscripten_builtin_pthread_create = Module["_emscripten_builtin_pthread_create"] = createExportWrapper("emscripten_builtin_pthread_create");

/** @type {function(...*):?} */
var _pthread_create = Module["_pthread_create"] = createExportWrapper("pthread_create");

/** @type {function(...*):?} */
var _emscripten_builtin_pthread_join = Module["_emscripten_builtin_pthread_join"] = createExportWrapper("emscripten_builtin_pthread_join");

/** @type {function(...*):?} */
var _pthread_join = Module["_pthread_join"] = createExportWrapper("pthread_join");

/** @type {function(...*):?} */
var _pthread_key_delete = Module["_pthread_key_delete"] = createExportWrapper("pthread_key_delete");

/** @type {function(...*):?} */
var _pthread_key_create = Module["_pthread_key_create"] = createExportWrapper("pthread_key_create");

/** @type {function(...*):?} */
var _pthread_once = Module["_pthread_once"] = createExportWrapper("pthread_once");

/** @type {function(...*):?} */
var _pthread_cond_timedwait = Module["_pthread_cond_timedwait"] = createExportWrapper("pthread_cond_timedwait");

/** @type {function(...*):?} */
var _pthread_exit = Module["_pthread_exit"] = createExportWrapper("pthread_exit");

/** @type {function(...*):?} */
var _emscripten_builtin_pthread_detach = Module["_emscripten_builtin_pthread_detach"] = createExportWrapper("emscripten_builtin_pthread_detach");

/** @type {function(...*):?} */
var _pthread_detach = Module["_pthread_detach"] = createExportWrapper("pthread_detach");

/** @type {function(...*):?} */
var _thrd_detach = Module["_thrd_detach"] = createExportWrapper("thrd_detach");

/** @type {function(...*):?} */
var _lseek = Module["_lseek"] = createExportWrapper("lseek");

/** @type {function(...*):?} */
var _lseek64 = Module["_lseek64"] = createExportWrapper("lseek64");

/** @type {function(...*):?} */
var _mbtowc = Module["_mbtowc"] = createExportWrapper("mbtowc");

/** @type {function(...*):?} */
var _mkostemps = Module["_mkostemps"] = createExportWrapper("mkostemps");

/** @type {function(...*):?} */
var _mkostemps64 = Module["_mkostemps64"] = createExportWrapper("mkostemps64");

/** @type {function(...*):?} */
var _open = Module["_open"] = createExportWrapper("open");

/** @type {function(...*):?} */
var _mkstemp64 = Module["_mkstemp64"] = createExportWrapper("mkstemp64");

/** @type {function(...*):?} */
var _open64 = Module["_open64"] = createExportWrapper("open64");

/** @type {function(...*):?} */
var _emscripten_main_browser_thread_id = Module["_emscripten_main_browser_thread_id"] = createExportWrapper("emscripten_main_browser_thread_id");

/** @type {function(...*):?} */
var _scalbnl = Module["_scalbnl"] = createExportWrapper("scalbnl");

/** @type {function(...*):?} */
var _stpcpy = Module["_stpcpy"] = createExportWrapper("stpcpy");

/** @type {function(...*):?} */
var _strchrnul = Module["_strchrnul"] = createExportWrapper("strchrnul");

/** @type {function(...*):?} */
var ___strcoll_l = Module["___strcoll_l"] = createExportWrapper("__strcoll_l");

/** @type {function(...*):?} */
var _strcoll_l = Module["_strcoll_l"] = createExportWrapper("strcoll_l");

/** @type {function(...*):?} */
var _strcspn = Module["_strcspn"] = createExportWrapper("strcspn");

/** @type {function(...*):?} */
var ___strerror_l = Module["___strerror_l"] = createExportWrapper("__strerror_l");

/** @type {function(...*):?} */
var _strerror_l = Module["_strerror_l"] = createExportWrapper("strerror_l");

/** @type {function(...*):?} */
var _strnlen = Module["_strnlen"] = createExportWrapper("strnlen");

/** @type {function(...*):?} */
var _strtof = Module["_strtof"] = createExportWrapper("strtof");

/** @type {function(...*):?} */
var ___trunctfsf2 = Module["___trunctfsf2"] = createExportWrapper("__trunctfsf2");

/** @type {function(...*):?} */
var ___extendsftf2 = Module["___extendsftf2"] = createExportWrapper("__extendsftf2");

/** @type {function(...*):?} */
var ___floatsitf = Module["___floatsitf"] = createExportWrapper("__floatsitf");

/** @type {function(...*):?} */
var ___multf3 = Module["___multf3"] = createExportWrapper("__multf3");

/** @type {function(...*):?} */
var ___addtf3 = Module["___addtf3"] = createExportWrapper("__addtf3");

/** @type {function(...*):?} */
var ___extenddftf2 = Module["___extenddftf2"] = createExportWrapper("__extenddftf2");

/** @type {function(...*):?} */
var ___getf2 = Module["___getf2"] = createExportWrapper("__getf2");

/** @type {function(...*):?} */
var ___netf2 = Module["___netf2"] = createExportWrapper("__netf2");

/** @type {function(...*):?} */
var ___floatunsitf = Module["___floatunsitf"] = createExportWrapper("__floatunsitf");

/** @type {function(...*):?} */
var ___subtf3 = Module["___subtf3"] = createExportWrapper("__subtf3");

/** @type {function(...*):?} */
var ___divtf3 = Module["___divtf3"] = createExportWrapper("__divtf3");

/** @type {function(...*):?} */
var ___eqtf2 = Module["___eqtf2"] = createExportWrapper("__eqtf2");

/** @type {function(...*):?} */
var ___letf2 = Module["___letf2"] = createExportWrapper("__letf2");

/** @type {function(...*):?} */
var ___trunctfdf2 = Module["___trunctfdf2"] = createExportWrapper("__trunctfdf2");

/** @type {function(...*):?} */
var _strtold = Module["_strtold"] = createExportWrapper("strtold");

/** @type {function(...*):?} */
var _strtof_l = Module["_strtof_l"] = createExportWrapper("strtof_l");

/** @type {function(...*):?} */
var _strtod_l = Module["_strtod_l"] = createExportWrapper("strtod_l");

/** @type {function(...*):?} */
var _strtold_l = Module["_strtold_l"] = createExportWrapper("strtold_l");

/** @type {function(...*):?} */
var _strtoull = Module["_strtoull"] = createExportWrapper("strtoull");

/** @type {function(...*):?} */
var _strtoll = Module["_strtoll"] = createExportWrapper("strtoll");

/** @type {function(...*):?} */
var _strtoul = Module["_strtoul"] = createExportWrapper("strtoul");

/** @type {function(...*):?} */
var _strtol = Module["_strtol"] = createExportWrapper("strtol");

/** @type {function(...*):?} */
var _strtoimax = Module["_strtoimax"] = createExportWrapper("strtoimax");

/** @type {function(...*):?} */
var _strtoumax = Module["_strtoumax"] = createExportWrapper("strtoumax");

/** @type {function(...*):?} */
var ___strtol_internal = Module["___strtol_internal"] = createExportWrapper("__strtol_internal");

/** @type {function(...*):?} */
var ___strtoul_internal = Module["___strtoul_internal"] = createExportWrapper("__strtoul_internal");

/** @type {function(...*):?} */
var ___strtoll_internal = Module["___strtoll_internal"] = createExportWrapper("__strtoll_internal");

/** @type {function(...*):?} */
var ___strtoull_internal = Module["___strtoull_internal"] = createExportWrapper("__strtoull_internal");

/** @type {function(...*):?} */
var ___strtoimax_internal = Module["___strtoimax_internal"] = createExportWrapper("__strtoimax_internal");

/** @type {function(...*):?} */
var ___strtoumax_internal = Module["___strtoumax_internal"] = createExportWrapper("__strtoumax_internal");

/** @type {function(...*):?} */
var _swprintf = Module["_swprintf"] = createExportWrapper("swprintf");

/** @type {function(...*):?} */
var _tmpfile64 = Module["_tmpfile64"] = createExportWrapper("tmpfile64");

/** @type {function(...*):?} */
var ___tolower_l = Module["___tolower_l"] = createExportWrapper("__tolower_l");

/** @type {function(...*):?} */
var _tolower_l = Module["_tolower_l"] = createExportWrapper("tolower_l");

/** @type {function(...*):?} */
var ___toupper_l = Module["___toupper_l"] = createExportWrapper("__toupper_l");

/** @type {function(...*):?} */
var _toupper_l = Module["_toupper_l"] = createExportWrapper("toupper_l");

/** @type {function(...*):?} */
var ___vfprintf_internal = Module["___vfprintf_internal"] = createExportWrapper("__vfprintf_internal");

/** @type {function(...*):?} */
var _wctomb = Module["_wctomb"] = createExportWrapper("wctomb");

/** @type {function(...*):?} */
var _vfwprintf = Module["_vfwprintf"] = createExportWrapper("vfwprintf");

/** @type {function(...*):?} */
var _vsniprintf = Module["_vsniprintf"] = createExportWrapper("vsniprintf");

/** @type {function(...*):?} */
var ___small_vsnprintf = Module["___small_vsnprintf"] = createExportWrapper("__small_vsnprintf");

/** @type {function(...*):?} */
var _vsiprintf = Module["_vsiprintf"] = createExportWrapper("vsiprintf");

/** @type {function(...*):?} */
var ___small_vsprintf = Module["___small_vsprintf"] = createExportWrapper("__small_vsprintf");

/** @type {function(...*):?} */
var _vswprintf = Module["_vswprintf"] = createExportWrapper("vswprintf");

/** @type {function(...*):?} */
var ___wasi_fd_is_valid = Module["___wasi_fd_is_valid"] = createExportWrapper("__wasi_fd_is_valid");

/** @type {function(...*):?} */
var _wcrtomb = Module["_wcrtomb"] = createExportWrapper("wcrtomb");

/** @type {function(...*):?} */
var _wcschr = Module["_wcschr"] = createExportWrapper("wcschr");

/** @type {function(...*):?} */
var _wcslen = Module["_wcslen"] = createExportWrapper("wcslen");

/** @type {function(...*):?} */
var _wcsnlen = Module["_wcsnlen"] = createExportWrapper("wcsnlen");

/** @type {function(...*):?} */
var _wcstof = Module["_wcstof"] = createExportWrapper("wcstof");

/** @type {function(...*):?} */
var _wcstod = Module["_wcstod"] = createExportWrapper("wcstod");

/** @type {function(...*):?} */
var _wcstold = Module["_wcstold"] = createExportWrapper("wcstold");

/** @type {function(...*):?} */
var _wcstoull = Module["_wcstoull"] = createExportWrapper("wcstoull");

/** @type {function(...*):?} */
var _wcstoll = Module["_wcstoll"] = createExportWrapper("wcstoll");

/** @type {function(...*):?} */
var _wcstoul = Module["_wcstoul"] = createExportWrapper("wcstoul");

/** @type {function(...*):?} */
var _wcstol = Module["_wcstol"] = createExportWrapper("wcstol");

/** @type {function(...*):?} */
var _wcstoimax = Module["_wcstoimax"] = createExportWrapper("wcstoimax");

/** @type {function(...*):?} */
var _wcstoumax = Module["_wcstoumax"] = createExportWrapper("wcstoumax");

/** @type {function(...*):?} */
var _wmemchr = Module["_wmemchr"] = createExportWrapper("wmemchr");

/** @type {function(...*):?} */
var _wmemcmp = Module["_wmemcmp"] = createExportWrapper("wmemcmp");

/** @type {function(...*):?} */
var _sbrk = Module["_sbrk"] = createExportWrapper("sbrk");

/** @type {function(...*):?} */
var ___libc_calloc = Module["___libc_calloc"] = createExportWrapper("__libc_calloc");

/** @type {function(...*):?} */
var ___libc_realloc = Module["___libc_realloc"] = createExportWrapper("__libc_realloc");

/** @type {function(...*):?} */
var _realloc_in_place = Module["_realloc_in_place"] = createExportWrapper("realloc_in_place");

/** @type {function(...*):?} */
var _memalign = Module["_memalign"] = createExportWrapper("memalign");

/** @type {function(...*):?} */
var _posix_memalign = Module["_posix_memalign"] = createExportWrapper("posix_memalign");

/** @type {function(...*):?} */
var _valloc = Module["_valloc"] = createExportWrapper("valloc");

/** @type {function(...*):?} */
var _pvalloc = Module["_pvalloc"] = createExportWrapper("pvalloc");

/** @type {function(...*):?} */
var _mallinfo = Module["_mallinfo"] = createExportWrapper("mallinfo");

/** @type {function(...*):?} */
var _mallopt = Module["_mallopt"] = createExportWrapper("mallopt");

/** @type {function(...*):?} */
var _malloc_trim = Module["_malloc_trim"] = createExportWrapper("malloc_trim");

/** @type {function(...*):?} */
var _malloc_usable_size = Module["_malloc_usable_size"] = createExportWrapper("malloc_usable_size");

/** @type {function(...*):?} */
var _malloc_footprint = Module["_malloc_footprint"] = createExportWrapper("malloc_footprint");

/** @type {function(...*):?} */
var _malloc_max_footprint = Module["_malloc_max_footprint"] = createExportWrapper("malloc_max_footprint");

/** @type {function(...*):?} */
var _malloc_footprint_limit = Module["_malloc_footprint_limit"] = createExportWrapper("malloc_footprint_limit");

/** @type {function(...*):?} */
var _malloc_set_footprint_limit = Module["_malloc_set_footprint_limit"] = createExportWrapper("malloc_set_footprint_limit");

/** @type {function(...*):?} */
var _independent_calloc = Module["_independent_calloc"] = createExportWrapper("independent_calloc");

/** @type {function(...*):?} */
var _independent_comalloc = Module["_independent_comalloc"] = createExportWrapper("independent_comalloc");

/** @type {function(...*):?} */
var _bulk_free = Module["_bulk_free"] = createExportWrapper("bulk_free");

/** @type {function(...*):?} */
var _emscripten_builtin_free = Module["_emscripten_builtin_free"] = createExportWrapper("emscripten_builtin_free");

/** @type {function(...*):?} */
var _emscripten_builtin_memalign = Module["_emscripten_builtin_memalign"] = createExportWrapper("emscripten_builtin_memalign");

/** @type {function(...*):?} */
var _emscripten_get_sbrk_ptr = Module["_emscripten_get_sbrk_ptr"] = createExportWrapper("emscripten_get_sbrk_ptr");

/** @type {function(...*):?} */
var _brk = Module["_brk"] = createExportWrapper("brk");

/** @type {function(...*):?} */
var ___ashlti3 = Module["___ashlti3"] = createExportWrapper("__ashlti3");

/** @type {function(...*):?} */
var ___lshrti3 = Module["___lshrti3"] = createExportWrapper("__lshrti3");

/** @type {function(...*):?} */
var ___fe_getround = Module["___fe_getround"] = createExportWrapper("__fe_getround");

/** @type {function(...*):?} */
var ___fe_raise_inexact = Module["___fe_raise_inexact"] = createExportWrapper("__fe_raise_inexact");

/** @type {function(...*):?} */
var ___unordtf2 = Module["___unordtf2"] = createExportWrapper("__unordtf2");

/** @type {function(...*):?} */
var ___lttf2 = Module["___lttf2"] = createExportWrapper("__lttf2");

/** @type {function(...*):?} */
var ___gttf2 = Module["___gttf2"] = createExportWrapper("__gttf2");

/** @type {function(...*):?} */
var ___multi3 = Module["___multi3"] = createExportWrapper("__multi3");

/** @type {function(...*):?} */
var _setThrew = Module["_setThrew"] = createExportWrapper("setThrew");

/** @type {function(...*):?} */
var _emscripten_stack_init = Module["_emscripten_stack_init"] = function() {
  return (_emscripten_stack_init = Module["_emscripten_stack_init"] = Module["asm"]["emscripten_stack_init"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_stack_set_limits = Module["_emscripten_stack_set_limits"] = function() {
  return (_emscripten_stack_set_limits = Module["_emscripten_stack_set_limits"] = Module["asm"]["emscripten_stack_set_limits"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = function() {
  return (_emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = Module["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = function() {
  return (_emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = Module["asm"]["emscripten_stack_get_base"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = function() {
  return (_emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = Module["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var stackSave = Module["stackSave"] = createExportWrapper("stackSave");

/** @type {function(...*):?} */
var stackRestore = Module["stackRestore"] = createExportWrapper("stackRestore");

/** @type {function(...*):?} */
var stackAlloc = Module["stackAlloc"] = createExportWrapper("stackAlloc");

/** @type {function(...*):?} */
var _emscripten_stack_get_current = Module["_emscripten_stack_get_current"] = function() {
  return (_emscripten_stack_get_current = Module["_emscripten_stack_get_current"] = Module["asm"]["emscripten_stack_get_current"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var __ZNSt3__212__libcpp_clzB6v15000Ej = Module["__ZNSt3__212__libcpp_clzB6v15000Ej"] = createExportWrapper("_ZNSt3__212__libcpp_clzB6v15000Ej");

/** @type {function(...*):?} */
var __ZNSt3__24swapB6v15000IiEENS_9enable_ifIXaasr21is_move_constructibleIT_EE5valuesr18is_move_assignableIS2_EE5valueEvE4typeERS2_S5_ = Module["__ZNSt3__24swapB6v15000IiEENS_9enable_ifIXaasr21is_move_constructibleIT_EE5valuesr18is_move_assignableIS2_EE5valueEvE4typeERS2_S5_"] = createExportWrapper("_ZNSt3__24swapB6v15000IiEENS_9enable_ifIXaasr21is_move_constructibleIT_EE5valuesr18is_move_assignableIS2_EE5valueEvE4typeERS2_S5_");

/** @type {function(...*):?} */
var __ZNSt3__28to_charsB6v15000IjLi0EEENS_15to_chars_resultEPcS2_T_ = Module["__ZNSt3__28to_charsB6v15000IjLi0EEENS_15to_chars_resultEPcS2_T_"] = createExportWrapper("_ZNSt3__28to_charsB6v15000IjLi0EEENS_15to_chars_resultEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__215__to_chars_itoaB6v15000IjEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb0EEE = Module["__ZNSt3__215__to_chars_itoaB6v15000IjEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb0EEE"] = createExportWrapper("_ZNSt3__215__to_chars_itoaB6v15000IjEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb0EEE");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa13__traits_baseIjvE7__widthB6v15000Ej = Module["__ZNSt3__26__itoa13__traits_baseIjvE7__widthB6v15000Ej"] = createExportWrapper("_ZNSt3__26__itoa13__traits_baseIjvE7__widthB6v15000Ej");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa13__traits_baseIjvE9__convertB6v15000EPcj = Module["__ZNSt3__26__itoa13__traits_baseIjvE9__convertB6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa13__traits_baseIjvE9__convertB6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa13__base_10_u32B6v15000EPcj = Module["__ZNSt3__26__itoa13__base_10_u32B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa13__base_10_u32B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append1B6v15000EPcj = Module["__ZNSt3__26__itoa9__append1B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append1B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append2B6v15000EPcj = Module["__ZNSt3__26__itoa9__append2B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append2B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append3B6v15000EPcj = Module["__ZNSt3__26__itoa9__append3B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append3B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append4B6v15000EPcj = Module["__ZNSt3__26__itoa9__append4B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append4B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append5B6v15000EPcj = Module["__ZNSt3__26__itoa9__append5B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append5B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append6B6v15000EPcj = Module["__ZNSt3__26__itoa9__append6B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append6B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append7B6v15000EPcj = Module["__ZNSt3__26__itoa9__append7B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append7B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append8B6v15000EPcj = Module["__ZNSt3__26__itoa9__append8B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append8B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa9__append9B6v15000EPcj = Module["__ZNSt3__26__itoa9__append9B6v15000EPcj"] = createExportWrapper("_ZNSt3__26__itoa9__append9B6v15000EPcj");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa10__append10B6v15000IjEEPcS2_T_ = Module["__ZNSt3__26__itoa10__append10B6v15000IjEEPcS2_T_"] = createExportWrapper("_ZNSt3__26__itoa10__append10B6v15000IjEEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__26copy_nB6v15000IPKciPcEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_ = Module["__ZNSt3__26copy_nB6v15000IPKciPcEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_"] = createExportWrapper("_ZNSt3__26copy_nB6v15000IPKciPcEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_");

/** @type {function(...*):?} */
var __ZNSt3__24copyB6v15000IPKcPcEET0_T_S5_S4_ = Module["__ZNSt3__24copyB6v15000IPKcPcEET0_T_S5_S4_"] = createExportWrapper("_ZNSt3__24copyB6v15000IPKcPcEET0_T_S5_S4_");

/** @type {function(...*):?} */
var __ZNSt3__26__copyB6v15000IPKcS2_PcLi0EEENS_4pairIT_T1_EES5_T0_S6_ = Module["__ZNSt3__26__copyB6v15000IPKcS2_PcLi0EEENS_4pairIT_T1_EES5_T0_S6_"] = createExportWrapper("_ZNSt3__26__copyB6v15000IPKcS2_PcLi0EEENS_4pairIT_T1_EES5_T0_S6_");

/** @type {function(...*):?} */
var __ZNSt3__214__unwrap_rangeB6v15000IPKcS2_EEDaT_T0_ = Module["__ZNSt3__214__unwrap_rangeB6v15000IPKcS2_EEDaT_T0_"] = createExportWrapper("_ZNSt3__214__unwrap_rangeB6v15000IPKcS2_EEDaT_T0_");

/** @type {function(...*):?} */
var __ZNSt3__213__unwrap_iterB6v15000IPcNS_18__unwrap_iter_implIS1_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES5_ = Module["__ZNSt3__213__unwrap_iterB6v15000IPcNS_18__unwrap_iter_implIS1_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES5_"] = createExportWrapper("_ZNSt3__213__unwrap_iterB6v15000IPcNS_18__unwrap_iter_implIS1_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES5_");

/** @type {function(...*):?} */
var __ZNSt3__211__copy_implB6v15000IKccvEENS_4pairIPT_PT0_EES4_S4_S6_ = Module["__ZNSt3__211__copy_implB6v15000IKccvEENS_4pairIPT_PT0_EES4_S4_S6_"] = createExportWrapper("_ZNSt3__211__copy_implB6v15000IKccvEENS_4pairIPT_PT0_EES4_S4_S6_");

/** @type {function(...*):?} */
var __ZNSt3__214__rewrap_rangeB6v15000IPKcS2_S2_EET0_S3_T1_ = Module["__ZNSt3__214__rewrap_rangeB6v15000IPKcS2_S2_EET0_S3_T1_"] = createExportWrapper("_ZNSt3__214__rewrap_rangeB6v15000IPKcS2_S2_EET0_S3_T1_");

/** @type {function(...*):?} */
var __ZNSt3__213__rewrap_iterB6v15000IPcS1_NS_18__unwrap_iter_implIS1_Lb1EEEEET_S4_T0_ = Module["__ZNSt3__213__rewrap_iterB6v15000IPcS1_NS_18__unwrap_iter_implIS1_Lb1EEEEET_S4_T0_"] = createExportWrapper("_ZNSt3__213__rewrap_iterB6v15000IPcS1_NS_18__unwrap_iter_implIS1_Lb1EEEEET_S4_T0_");

/** @type {function(...*):?} */
var __ZNSt3__29make_pairB6v15000IPKcPcEENS_4pairINS_18__unwrap_ref_decayIT_E4typeENS5_IT0_E4typeEEEOS6_OS9_ = Module["__ZNSt3__29make_pairB6v15000IPKcPcEENS_4pairINS_18__unwrap_ref_decayIT_E4typeENS5_IT0_E4typeEEEOS6_OS9_"] = createExportWrapper("_ZNSt3__29make_pairB6v15000IPKcPcEENS_4pairINS_18__unwrap_ref_decayIT_E4typeENS5_IT0_E4typeEEEOS6_OS9_");

/** @type {function(...*):?} */
var __ZNSt3__219__unwrap_range_implIPKcS2_E8__unwrapB6v15000ES2_S2_ = Module["__ZNSt3__219__unwrap_range_implIPKcS2_E8__unwrapB6v15000ES2_S2_"] = createExportWrapper("_ZNSt3__219__unwrap_range_implIPKcS2_E8__unwrapB6v15000ES2_S2_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPcLb1EE8__unwrapB6v15000ES1_ = Module["__ZNSt3__218__unwrap_iter_implIPcLb1EE8__unwrapB6v15000ES1_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPcLb1EE8__unwrapB6v15000ES1_");

/** @type {function(...*):?} */
var __ZNSt3__24pairIPKcPcEC2B6v15000IS2_S3_LPv0EEEOT_OT0_ = Module["__ZNSt3__24pairIPKcPcEC2B6v15000IS2_S3_LPv0EEEOT_OT0_"] = createExportWrapper("_ZNSt3__24pairIPKcPcEC2B6v15000IS2_S3_LPv0EEEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__219__unwrap_range_implIPKcS2_E8__rewrapB6v15000ES2_S2_ = Module["__ZNSt3__219__unwrap_range_implIPKcS2_E8__rewrapB6v15000ES2_S2_"] = createExportWrapper("_ZNSt3__219__unwrap_range_implIPKcS2_E8__rewrapB6v15000ES2_S2_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPcLb1EE8__rewrapB6v15000ES1_S1_ = Module["__ZNSt3__218__unwrap_iter_implIPcLb1EE8__rewrapB6v15000ES1_S1_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPcLb1EE8__rewrapB6v15000ES1_S1_");

/** @type {function(...*):?} */
var __ZNSt3__213__unwrap_iterB6v15000IPKcNS_18__unwrap_iter_implIS2_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES6_ = Module["__ZNSt3__213__unwrap_iterB6v15000IPKcNS_18__unwrap_iter_implIS2_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES6_"] = createExportWrapper("_ZNSt3__213__unwrap_iterB6v15000IPKcNS_18__unwrap_iter_implIS2_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES6_");

/** @type {function(...*):?} */
var __ZNSt3__24pairIPKcS2_EC2B6v15000IS2_S2_LPv0EEEOT_OT0_ = Module["__ZNSt3__24pairIPKcS2_EC2B6v15000IS2_S2_LPv0EEEOT_OT0_"] = createExportWrapper("_ZNSt3__24pairIPKcS2_EC2B6v15000IS2_S2_LPv0EEEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPKcLb1EE8__unwrapB6v15000ES2_ = Module["__ZNSt3__218__unwrap_iter_implIPKcLb1EE8__unwrapB6v15000ES2_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPKcLb1EE8__unwrapB6v15000ES2_");

/** @type {function(...*):?} */
var __ZNSt3__212__to_addressB6v15000IcEEPT_S2_ = Module["__ZNSt3__212__to_addressB6v15000IcEEPT_S2_"] = createExportWrapper("_ZNSt3__212__to_addressB6v15000IcEEPT_S2_");

/** @type {function(...*):?} */
var __ZNSt3__213__rewrap_iterB6v15000IPKcS2_NS_18__unwrap_iter_implIS2_Lb1EEEEET_S5_T0_ = Module["__ZNSt3__213__rewrap_iterB6v15000IPKcS2_NS_18__unwrap_iter_implIS2_Lb1EEEEET_S5_T0_"] = createExportWrapper("_ZNSt3__213__rewrap_iterB6v15000IPKcS2_NS_18__unwrap_iter_implIS2_Lb1EEEEET_S5_T0_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPKcLb1EE8__rewrapB6v15000ES2_S2_ = Module["__ZNSt3__218__unwrap_iter_implIPKcLb1EE8__rewrapB6v15000ES2_S2_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPKcLb1EE8__rewrapB6v15000ES2_S2_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000IDnEEPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000IDnEEPKc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000IDnEEPKc");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE4sizeB6v15000Ev = Module["__ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE4sizeB6v15000Ev"] = createExportWrapper("_ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE4sizeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE7compareES3_ = Module["__ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE7compareES3_"] = createExportWrapper("_ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE7compareES3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE4dataB6v15000Ev = Module["__ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE4dataB6v15000Ev"] = createExportWrapper("_ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE4dataB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE7compareEPKcS3_m = Module["__ZNSt3__211char_traitsIcE7compareEPKcS3_m"] = createExportWrapper("_ZNSt3__211char_traitsIcE7compareEPKcS3_m");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE6lengthEPKc = Module["__ZNSt3__211char_traitsIcE6lengthEPKc"] = createExportWrapper("_ZNSt3__211char_traitsIcE6lengthEPKc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7__allocB6v15000Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7__allocB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7__allocB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__get_long_pointerB6v15000Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__get_long_pointerB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__get_long_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__get_long_capB6v15000Ev = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__get_long_capB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__get_long_capB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorIcEEE10deallocateB6v15000ERS2_Pcm = Module["__ZNSt3__216allocator_traitsINS_9allocatorIcEEE10deallocateB6v15000ERS2_Pcm"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorIcEEE10deallocateB6v15000ERS2_Pcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16__set_short_sizeB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16__set_short_sizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16__set_short_sizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE19__get_short_pointerB6v15000Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE19__get_short_pointerB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE19__get_short_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE6assignERcRKc = Module["__ZNSt3__211char_traitsIcE6assignERcRKc"] = createExportWrapper("_ZNSt3__211char_traitsIcE6assignERcRKc");

/** @type {function(...*):?} */
var __ZNSt3__29allocatorIcE10deallocateB6v15000EPcm = Module["__ZNSt3__29allocatorIcE10deallocateB6v15000EPcm"] = createExportWrapper("_ZNSt3__29allocatorIcE10deallocateB6v15000EPcm");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_E6secondB6v15000Ev = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_E6secondB6v15000Ev"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_E6secondB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__214pointer_traitsIPcE10pointer_toB6v15000ERc = Module["__ZNSt3__214pointer_traitsIPcE10pointer_toB6v15000ERc"] = createExportWrapper("_ZNSt3__214pointer_traitsIPcE10pointer_toB6v15000ERc");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EE5__getB6v15000Ev = Module["__ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EE5__getB6v15000Ev"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EE5__getB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13__fits_in_ssoB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13__fits_in_ssoB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13__fits_in_ssoB6v15000Em");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE8max_sizeB6v15000Ev = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE8max_sizeB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE8max_sizeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorIcEEE8max_sizeB6v15000IS2_vvEEmRKS2_ = Module["__ZNSt3__216allocator_traitsINS_9allocatorIcEEE8max_sizeB6v15000IS2_vvEEmRKS2_"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorIcEEE8max_sizeB6v15000IS2_vvEEmRKS2_");

/** @type {function(...*):?} */
var __ZNSt3__214numeric_limitsImE3maxB6v15000Ev = Module["__ZNSt3__214numeric_limitsImE3maxB6v15000Ev"] = createExportWrapper("_ZNSt3__214numeric_limitsImE3maxB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE20__throw_length_errorB6v15000Ev = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE20__throw_length_errorB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE20__throw_length_errorB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__219__allocate_at_leastB6v15000INS_9allocatorIcEEEENS_19__allocation_resultINS_16allocator_traitsIT_E7pointerEEERS5_m = Module["__ZNSt3__219__allocate_at_leastB6v15000INS_9allocatorIcEEEENS_19__allocation_resultINS_16allocator_traitsIT_E7pointerEEERS5_m"] = createExportWrapper("_ZNSt3__219__allocate_at_leastB6v15000INS_9allocatorIcEEEENS_19__allocation_resultINS_16allocator_traitsIT_E7pointerEEERS5_m");

/** @type {function(...*):?} */
var __ZNSt3__29allocatorIcE8allocateB6v15000Em = Module["__ZNSt3__29allocatorIcE8allocateB6v15000Em"] = createExportWrapper("_ZNSt3__29allocatorIcE8allocateB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE11__recommendB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE11__recommendB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE11__recommendB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE10__align_itB6v15000ILm16EEEmm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE10__align_itB6v15000ILm16EEEmm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE10__align_itB6v15000ILm16EEEmm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16__begin_lifetimeB6v15000EPcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16__begin_lifetimeB6v15000EPcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16__begin_lifetimeB6v15000EPcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__set_long_pointerB6v15000EPc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__set_long_pointerB6v15000EPc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__set_long_pointerB6v15000EPc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__set_long_capB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__set_long_capB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__set_long_capB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE15__set_long_sizeB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE15__set_long_sizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE15__set_long_sizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__223__libcpp_numeric_limitsImLb1EE3maxB6v15000Ev = Module["__ZNSt3__223__libcpp_numeric_limitsImLb1EE3maxB6v15000Ev"] = createExportWrapper("_ZNSt3__223__libcpp_numeric_limitsImLb1EE3maxB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE27__invalidate_iterators_pastB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE27__invalidate_iterators_pastB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE27__invalidate_iterators_pastB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13__get_pointerB6v15000Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13__get_pointerB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13__get_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE8capacityB6v15000Ev = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE8capacityB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE8capacityB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE10__set_sizeB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE10__set_sizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE10__set_sizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagERKS5_EEOT_OT0_ = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagERKS5_EEOT_OT0_"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repES5_EC2B6v15000INS_18__default_init_tagERKS5_EEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EEC2B6v15000IRKS2_vEEOT_ = Module["__ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EEC2B6v15000IRKS2_vEEOT_"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_9allocatorIcEELi1ELb1EEC2B6v15000IRKS2_vEEOT_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignEPKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignEPKcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEixB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEixB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEixB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__erase_to_endB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__erase_to_endB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE14__erase_to_endB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE19__null_terminate_atB6v15000EPcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE19__null_terminate_atB6v15000EPcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE19__null_terminate_atB6v15000EPcm");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE4copyEPcPKcm = Module["__ZNSt3__211char_traitsIcE4copyEPcPKcm"] = createExportWrapper("_ZNSt3__211char_traitsIcE4copyEPcPKcm");

/** @type {function(...*):?} */
var __ZNSt3__26copy_nB6v15000IPKcmPcEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_ = Module["__ZNSt3__26copy_nB6v15000IPKcmPcEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_"] = createExportWrapper("_ZNSt3__26copy_nB6v15000IPKcmPcEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE11to_int_typeEc = Module["__ZNSt3__211char_traitsIcE11to_int_typeEc"] = createExportWrapper("_ZNSt3__211char_traitsIcE11to_int_typeEc");

/** @type {function(...*):?} */
var __ZNSt3__214numeric_limitsIiE3minB6v15000Ev = Module["__ZNSt3__214numeric_limitsIiE3minB6v15000Ev"] = createExportWrapper("_ZNSt3__214numeric_limitsIiE3minB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__214numeric_limitsIiE3maxB6v15000Ev = Module["__ZNSt3__214numeric_limitsIiE3maxB6v15000Ev"] = createExportWrapper("_ZNSt3__214numeric_limitsIiE3maxB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE2eqEcc = Module["__ZNSt3__211char_traitsIcE2eqEcc"] = createExportWrapper("_ZNSt3__211char_traitsIcE2eqEcc");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE4copyEPwPKwm = Module["__ZNSt3__211char_traitsIwE4copyEPwPKwm"] = createExportWrapper("_ZNSt3__211char_traitsIwE4copyEPwPKwm");

/** @type {function(...*):?} */
var __ZNSt3__26copy_nB6v15000IPKwmPwEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_ = Module["__ZNSt3__26copy_nB6v15000IPKwmPwEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_"] = createExportWrapper("_ZNSt3__26copy_nB6v15000IPKwmPwEENS_9enable_ifIXsr33__is_cpp17_random_access_iteratorIT_EE5valueET1_E4typeES5_T0_S6_");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE2eqEww = Module["__ZNSt3__211char_traitsIwE2eqEww"] = createExportWrapper("_ZNSt3__211char_traitsIwE2eqEww");

/** @type {function(...*):?} */
var __ZNSt3__225__debug_db_invalidate_allB6v15000INS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEEEvPT_ = Module["__ZNSt3__225__debug_db_invalidate_allB6v15000INS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEEEvPT_"] = createExportWrapper("_ZNSt3__225__debug_db_invalidate_allB6v15000INS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEEEvPT_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13get_allocatorB6v15000Ev = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13get_allocatorB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13get_allocatorB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initIPcEENS_9enable_ifIXsr27__is_cpp17_forward_iteratorIT_EE5valueEvE4typeES9_S9_ = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initIPcEENS_9enable_ifIXsr27__is_cpp17_forward_iteratorIT_EE5valueEvE4typeES9_S9_"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initIPcEENS_9enable_ifIXsr27__is_cpp17_forward_iteratorIT_EE5valueEvE4typeES9_S9_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__24copyB6v15000IPKwPwEET0_T_S5_S4_ = Module["__ZNSt3__24copyB6v15000IPKwPwEET0_T_S5_S4_"] = createExportWrapper("_ZNSt3__24copyB6v15000IPKwPwEET0_T_S5_S4_");

/** @type {function(...*):?} */
var __ZNSt3__26__copyB6v15000IPKwS2_PwLi0EEENS_4pairIT_T1_EES5_T0_S6_ = Module["__ZNSt3__26__copyB6v15000IPKwS2_PwLi0EEENS_4pairIT_T1_EES5_T0_S6_"] = createExportWrapper("_ZNSt3__26__copyB6v15000IPKwS2_PwLi0EEENS_4pairIT_T1_EES5_T0_S6_");

/** @type {function(...*):?} */
var __ZNSt3__214__unwrap_rangeB6v15000IPKwS2_EEDaT_T0_ = Module["__ZNSt3__214__unwrap_rangeB6v15000IPKwS2_EEDaT_T0_"] = createExportWrapper("_ZNSt3__214__unwrap_rangeB6v15000IPKwS2_EEDaT_T0_");

/** @type {function(...*):?} */
var __ZNSt3__213__unwrap_iterB6v15000IPwNS_18__unwrap_iter_implIS1_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES5_ = Module["__ZNSt3__213__unwrap_iterB6v15000IPwNS_18__unwrap_iter_implIS1_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES5_"] = createExportWrapper("_ZNSt3__213__unwrap_iterB6v15000IPwNS_18__unwrap_iter_implIS1_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES5_");

/** @type {function(...*):?} */
var __ZNSt3__211__copy_implB6v15000IKwwvEENS_4pairIPT_PT0_EES4_S4_S6_ = Module["__ZNSt3__211__copy_implB6v15000IKwwvEENS_4pairIPT_PT0_EES4_S4_S6_"] = createExportWrapper("_ZNSt3__211__copy_implB6v15000IKwwvEENS_4pairIPT_PT0_EES4_S4_S6_");

/** @type {function(...*):?} */
var __ZNSt3__214__rewrap_rangeB6v15000IPKwS2_S2_EET0_S3_T1_ = Module["__ZNSt3__214__rewrap_rangeB6v15000IPKwS2_S2_EET0_S3_T1_"] = createExportWrapper("_ZNSt3__214__rewrap_rangeB6v15000IPKwS2_S2_EET0_S3_T1_");

/** @type {function(...*):?} */
var __ZNSt3__213__rewrap_iterB6v15000IPwS1_NS_18__unwrap_iter_implIS1_Lb1EEEEET_S4_T0_ = Module["__ZNSt3__213__rewrap_iterB6v15000IPwS1_NS_18__unwrap_iter_implIS1_Lb1EEEEET_S4_T0_"] = createExportWrapper("_ZNSt3__213__rewrap_iterB6v15000IPwS1_NS_18__unwrap_iter_implIS1_Lb1EEEEET_S4_T0_");

/** @type {function(...*):?} */
var __ZNSt3__29make_pairB6v15000IPKwPwEENS_4pairINS_18__unwrap_ref_decayIT_E4typeENS5_IT0_E4typeEEEOS6_OS9_ = Module["__ZNSt3__29make_pairB6v15000IPKwPwEENS_4pairINS_18__unwrap_ref_decayIT_E4typeENS5_IT0_E4typeEEEOS6_OS9_"] = createExportWrapper("_ZNSt3__29make_pairB6v15000IPKwPwEENS_4pairINS_18__unwrap_ref_decayIT_E4typeENS5_IT0_E4typeEEEOS6_OS9_");

/** @type {function(...*):?} */
var __ZNSt3__219__unwrap_range_implIPKwS2_E8__unwrapB6v15000ES2_S2_ = Module["__ZNSt3__219__unwrap_range_implIPKwS2_E8__unwrapB6v15000ES2_S2_"] = createExportWrapper("_ZNSt3__219__unwrap_range_implIPKwS2_E8__unwrapB6v15000ES2_S2_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPwLb1EE8__unwrapB6v15000ES1_ = Module["__ZNSt3__218__unwrap_iter_implIPwLb1EE8__unwrapB6v15000ES1_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPwLb1EE8__unwrapB6v15000ES1_");

/** @type {function(...*):?} */
var __ZNSt3__24pairIPKwPwEC2B6v15000IS2_S3_LPv0EEEOT_OT0_ = Module["__ZNSt3__24pairIPKwPwEC2B6v15000IS2_S3_LPv0EEEOT_OT0_"] = createExportWrapper("_ZNSt3__24pairIPKwPwEC2B6v15000IS2_S3_LPv0EEEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__219__unwrap_range_implIPKwS2_E8__rewrapB6v15000ES2_S2_ = Module["__ZNSt3__219__unwrap_range_implIPKwS2_E8__rewrapB6v15000ES2_S2_"] = createExportWrapper("_ZNSt3__219__unwrap_range_implIPKwS2_E8__rewrapB6v15000ES2_S2_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPwLb1EE8__rewrapB6v15000ES1_S1_ = Module["__ZNSt3__218__unwrap_iter_implIPwLb1EE8__rewrapB6v15000ES1_S1_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPwLb1EE8__rewrapB6v15000ES1_S1_");

/** @type {function(...*):?} */
var __ZNSt3__213__unwrap_iterB6v15000IPKwNS_18__unwrap_iter_implIS2_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES6_ = Module["__ZNSt3__213__unwrap_iterB6v15000IPKwNS_18__unwrap_iter_implIS2_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES6_"] = createExportWrapper("_ZNSt3__213__unwrap_iterB6v15000IPKwNS_18__unwrap_iter_implIS2_Lb1EEELi0EEEDTclsrT0_8__unwrapclsr3stdE7declvalIT_EEEES6_");

/** @type {function(...*):?} */
var __ZNSt3__24pairIPKwS2_EC2B6v15000IS2_S2_LPv0EEEOT_OT0_ = Module["__ZNSt3__24pairIPKwS2_EC2B6v15000IS2_S2_LPv0EEEOT_OT0_"] = createExportWrapper("_ZNSt3__24pairIPKwS2_EC2B6v15000IS2_S2_LPv0EEEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPKwLb1EE8__unwrapB6v15000ES2_ = Module["__ZNSt3__218__unwrap_iter_implIPKwLb1EE8__unwrapB6v15000ES2_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPKwLb1EE8__unwrapB6v15000ES2_");

/** @type {function(...*):?} */
var __ZNSt3__212__to_addressB6v15000IKwEEPT_S3_ = Module["__ZNSt3__212__to_addressB6v15000IKwEEPT_S3_"] = createExportWrapper("_ZNSt3__212__to_addressB6v15000IKwEEPT_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212__to_addressB6v15000IwEEPT_S2_ = Module["__ZNSt3__212__to_addressB6v15000IwEEPT_S2_"] = createExportWrapper("_ZNSt3__212__to_addressB6v15000IwEEPT_S2_");

/** @type {function(...*):?} */
var __ZNSt3__213__rewrap_iterB6v15000IPKwS2_NS_18__unwrap_iter_implIS2_Lb1EEEEET_S5_T0_ = Module["__ZNSt3__213__rewrap_iterB6v15000IPKwS2_NS_18__unwrap_iter_implIS2_Lb1EEEEET_S5_T0_"] = createExportWrapper("_ZNSt3__213__rewrap_iterB6v15000IPKwS2_NS_18__unwrap_iter_implIS2_Lb1EEEEET_S5_T0_");

/** @type {function(...*):?} */
var __ZNSt3__218__unwrap_iter_implIPKwLb1EE8__rewrapB6v15000ES2_S2_ = Module["__ZNSt3__218__unwrap_iter_implIPKwLb1EE8__rewrapB6v15000ES2_S2_"] = createExportWrapper("_ZNSt3__218__unwrap_iter_implIPKwLb1EE8__rewrapB6v15000ES2_S2_");

/** @type {function(...*):?} */
var __ZNSt3__28distanceB6v15000IPcEENS_15iterator_traitsIT_E15difference_typeES3_S3_ = Module["__ZNSt3__28distanceB6v15000IPcEENS_15iterator_traitsIT_E15difference_typeES3_S3_"] = createExportWrapper("_ZNSt3__28distanceB6v15000IPcEENS_15iterator_traitsIT_E15difference_typeES3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__210__distanceB6v15000IPcEENS_15iterator_traitsIT_E15difference_typeES3_S3_NS_26random_access_iterator_tagE = Module["__ZNSt3__210__distanceB6v15000IPcEENS_15iterator_traitsIT_E15difference_typeES3_S3_NS_26random_access_iterator_tagE"] = createExportWrapper("_ZNSt3__210__distanceB6v15000IPcEENS_15iterator_traitsIT_E15difference_typeES3_S3_NS_26random_access_iterator_tagE");

/** @type {function(...*):?} */
var __ZNSt3__223__libcpp_numeric_limitsIiLb1EE3minB6v15000Ev = Module["__ZNSt3__223__libcpp_numeric_limitsIiLb1EE3minB6v15000Ev"] = createExportWrapper("_ZNSt3__223__libcpp_numeric_limitsIiLb1EE3minB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__223__libcpp_numeric_limitsIiLb1EE3maxB6v15000Ev = Module["__ZNSt3__223__libcpp_numeric_limitsIiLb1EE3maxB6v15000Ev"] = createExportWrapper("_ZNSt3__223__libcpp_numeric_limitsIiLb1EE3maxB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_EC2B6v15000INS_18__default_init_tagESA_EEOT_OT0_ = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_EC2B6v15000INS_18__default_init_tagESA_EEOT_OT0_"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_EC2B6v15000INS_18__default_init_tagESA_EEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__219__debug_db_insert_cB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_ = Module["__ZNSt3__219__debug_db_insert_cB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_"] = createExportWrapper("_ZNSt3__219__debug_db_insert_cB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEixB6v15000Em = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEixB6v15000Em"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEixB6v15000Em");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4sizeB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4sizeB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4sizeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEixB6v15000Em = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEixB6v15000Em"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEixB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5beginB6v15000Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5beginB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5beginB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211__wrap_iterIPcEC2B6v15000EPKvS1_ = Module["__ZNSt3__211__wrap_iterIPcEC2B6v15000EPKvS1_"] = createExportWrapper("_ZNSt3__211__wrap_iterIPcEC2B6v15000EPKvS1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5beginB6v15000Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5beginB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5beginB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__get_pointerB6v15000Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__get_pointerB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__get_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211__wrap_iterIPwEC2B6v15000EPKvS1_ = Module["__ZNSt3__211__wrap_iterIPwEC2B6v15000EPKvS1_"] = createExportWrapper("_ZNSt3__211__wrap_iterIPwEC2B6v15000EPKvS1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000Emw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000Emw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000Emw");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4dataB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4dataB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4dataB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__get_pointerB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__get_pointerB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__get_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9__is_longB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9__is_longB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9__is_longB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE15__get_long_sizeB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE15__get_long_sizeB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE15__get_long_sizeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__get_short_sizeB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__get_short_sizeB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__get_short_sizeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__default_initB6v15000Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__default_initB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__default_initB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7__allocB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7__allocB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7__allocB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E5firstB6v15000Ev = Module["__ZNKSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E5firstB6v15000Ev"] = createExportWrapper("_ZNKSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E5firstB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E5firstB6v15000Ev = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E5firstB6v15000Ev"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E5firstB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__get_long_pointerB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__get_long_pointerB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__get_long_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__2miB6v15000IPKcPcEEDTmicldtfp_4baseEcldtfp0_4baseEERKNS_11__wrap_iterIT_EERKNS5_IT0_EE = Module["__ZNSt3__2miB6v15000IPKcPcEEDTmicldtfp_4baseEcldtfp0_4baseEERKNS_11__wrap_iterIT_EERKNS5_IT0_EE"] = createExportWrapper("_ZNSt3__2miB6v15000IPKcPcEEDTmicldtfp_4baseEcldtfp0_4baseEERKNS_11__wrap_iterIT_EERKNS5_IT0_EE");

/** @type {function(...*):?} */
var __ZNKSt3__211__wrap_iterIPcE4baseB6v15000Ev = Module["__ZNKSt3__211__wrap_iterIPcE4baseB6v15000Ev"] = createExportWrapper("_ZNKSt3__211__wrap_iterIPcE4baseB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__211__wrap_iterIPKcE4baseB6v15000Ev = Module["__ZNKSt3__211__wrap_iterIPKcE4baseB6v15000Ev"] = createExportWrapper("_ZNKSt3__211__wrap_iterIPKcE4baseB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__211__wrap_iterIPcEplB6v15000El = Module["__ZNKSt3__211__wrap_iterIPcEplB6v15000El"] = createExportWrapper("_ZNKSt3__211__wrap_iterIPcEplB6v15000El");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEixB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEixB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEixB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__2miB6v15000IPKwPwEEDTmicldtfp_4baseEcldtfp0_4baseEERKNS_11__wrap_iterIT_EERKNS5_IT0_EE = Module["__ZNSt3__2miB6v15000IPKwPwEEDTmicldtfp_4baseEcldtfp0_4baseEERKNS_11__wrap_iterIT_EERKNS5_IT0_EE"] = createExportWrapper("_ZNSt3__2miB6v15000IPKwPwEEDTmicldtfp_4baseEcldtfp0_4baseEERKNS_11__wrap_iterIT_EERKNS5_IT0_EE");

/** @type {function(...*):?} */
var __ZNSt3__225__debug_db_invalidate_allB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_ = Module["__ZNSt3__225__debug_db_invalidate_allB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_"] = createExportWrapper("_ZNSt3__225__debug_db_invalidate_allB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__get_long_pointerB6v15000Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__get_long_pointerB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__get_long_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE6assignERwRKw = Module["__ZNSt3__211char_traitsIwE6assignERwRKw"] = createExportWrapper("_ZNSt3__211char_traitsIwE6assignERwRKw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE15__set_long_sizeB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE15__set_long_sizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE15__set_long_sizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__get_short_pointerB6v15000Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__get_short_pointerB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__get_short_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__set_short_sizeB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__set_short_sizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__set_short_sizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE8capacityB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE8capacityB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE8capacityB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE10__set_sizeB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE10__set_sizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE10__set_sizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7__allocB6v15000Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7__allocB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7__allocB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__211__wrap_iterIPwE4baseB6v15000Ev = Module["__ZNKSt3__211__wrap_iterIPwE4baseB6v15000Ev"] = createExportWrapper("_ZNKSt3__211__wrap_iterIPwE4baseB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__211__wrap_iterIPKwE4baseB6v15000Ev = Module["__ZNKSt3__211__wrap_iterIPKwE4baseB6v15000Ev"] = createExportWrapper("_ZNKSt3__211__wrap_iterIPKwE4baseB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__211__wrap_iterIPwEplB6v15000El = Module["__ZNKSt3__211__wrap_iterIPwEplB6v15000El"] = createExportWrapper("_ZNKSt3__211__wrap_iterIPwEplB6v15000El");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5c_strB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5c_strB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5c_strB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE6lengthEPKw = Module["__ZNSt3__211char_traitsIwE6lengthEPKw"] = createExportWrapper("_ZNSt3__211char_traitsIwE6lengthEPKw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE27__invalidate_iterators_pastB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE27__invalidate_iterators_pastB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE27__invalidate_iterators_pastB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignEPKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignEPKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignEPKwm");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EEC2B6v15000ENS_18__default_init_tagE = Module["__ZNSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EEC2B6v15000ENS_18__default_init_tagE"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EEC2B6v15000ENS_18__default_init_tagE");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EEC2B6v15000ENS_18__default_init_tagE = Module["__ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EEC2B6v15000ENS_18__default_init_tagE"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EEC2B6v15000ENS_18__default_init_tagE");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE8max_sizeB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE8max_sizeB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE8max_sizeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__fits_in_ssoB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__fits_in_ssoB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13__fits_in_ssoB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE11__recommendB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE11__recommendB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE11__recommendB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__219__allocate_at_leastB6v15000INS_9allocatorIwEEEENS_19__allocation_resultINS_16allocator_traitsIT_E7pointerEEERS5_m = Module["__ZNSt3__219__allocate_at_leastB6v15000INS_9allocatorIwEEEENS_19__allocation_resultINS_16allocator_traitsIT_E7pointerEEERS5_m"] = createExportWrapper("_ZNSt3__219__allocate_at_leastB6v15000INS_9allocatorIwEEEENS_19__allocation_resultINS_16allocator_traitsIT_E7pointerEEERS5_m");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__begin_lifetimeB6v15000EPwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__begin_lifetimeB6v15000EPwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16__begin_lifetimeB6v15000EPwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__set_long_pointerB6v15000EPw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__set_long_pointerB6v15000EPw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__set_long_pointerB6v15000EPw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__set_long_capB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__set_long_capB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__set_long_capB6v15000Em");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE20__throw_length_errorB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE20__throw_length_errorB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE20__throw_length_errorB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__29allocatorIwEC2B6v15000Ev = Module["__ZNSt3__29allocatorIwEC2B6v15000Ev"] = createExportWrapper("_ZNSt3__29allocatorIwEC2B6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__216__non_trivial_ifILb1ENS_9allocatorIwEEEC2B6v15000Ev = Module["__ZNSt3__216__non_trivial_ifILb1ENS_9allocatorIwEEEC2B6v15000Ev"] = createExportWrapper("_ZNSt3__216__non_trivial_ifILb1ENS_9allocatorIwEEEC2B6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorIwEEE8max_sizeB6v15000IS2_vvEEmRKS2_ = Module["__ZNSt3__216allocator_traitsINS_9allocatorIwEEE8max_sizeB6v15000IS2_vvEEmRKS2_"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorIwEEE8max_sizeB6v15000IS2_vvEEmRKS2_");

/** @type {function(...*):?} */
var __ZNSt3__214pointer_traitsIPwE10pointer_toB6v15000ERw = Module["__ZNSt3__214pointer_traitsIPwE10pointer_toB6v15000ERw"] = createExportWrapper("_ZNSt3__214pointer_traitsIPwE10pointer_toB6v15000ERw");

/** @type {function(...*):?} */
var __ZNSt3__29allocatorIwE8allocateB6v15000Em = Module["__ZNSt3__29allocatorIwE8allocateB6v15000Em"] = createExportWrapper("_ZNSt3__29allocatorIwE8allocateB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E6secondB6v15000Ev = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E6secondB6v15000Ev"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E6secondB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE10__align_itB6v15000ILm4EEEmm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE10__align_itB6v15000ILm4EEEmm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE10__align_itB6v15000ILm4EEEmm");

/** @type {function(...*):?} */
var __ZNKSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E6secondB6v15000Ev = Module["__ZNKSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E6secondB6v15000Ev"] = createExportWrapper("_ZNKSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_E6secondB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EE5__getB6v15000Ev = Module["__ZNKSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EE5__getB6v15000Ev"] = createExportWrapper("_ZNKSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EE5__getB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EE5__getB6v15000Ev = Module["__ZNSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EE5__getB6v15000Ev"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EE5__getB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EE5__getB6v15000Ev = Module["__ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EE5__getB6v15000Ev"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EE5__getB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__221__convert_to_integralB6v15000Em = Module["__ZNSt3__221__convert_to_integralB6v15000Em"] = createExportWrapper("_ZNSt3__221__convert_to_integralB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorIwEEE10deallocateB6v15000ERS2_Pwm = Module["__ZNSt3__216allocator_traitsINS_9allocatorIwEEE10deallocateB6v15000ERS2_Pwm"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorIwEEE10deallocateB6v15000ERS2_Pwm");

/** @type {function(...*):?} */
var __ZNSt3__29allocatorIwE10deallocateB6v15000EPwm = Module["__ZNSt3__29allocatorIwE10deallocateB6v15000EPwm"] = createExportWrapper("_ZNSt3__29allocatorIwE10deallocateB6v15000EPwm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__get_long_capB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__get_long_capB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__get_long_capB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EE5__getB6v15000Ev = Module["__ZNKSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EE5__getB6v15000Ev"] = createExportWrapper("_ZNKSt3__222__compressed_pair_elemINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repELi0ELb0EE5__getB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__get_short_pointerB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__get_short_pointerB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__get_short_pointerB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__214pointer_traitsIPKwE10pointer_toB6v15000ERS1_ = Module["__ZNSt3__214pointer_traitsIPKwE10pointer_toB6v15000ERS1_"] = createExportWrapper("_ZNSt3__214pointer_traitsIPKwE10pointer_toB6v15000ERS1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__zeroB6v15000Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__zeroB6v15000Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__zeroB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__211__wrap_iterIPcEpLB6v15000El = Module["__ZNSt3__211__wrap_iterIPcEpLB6v15000El"] = createExportWrapper("_ZNSt3__211__wrap_iterIPcEpLB6v15000El");

/** @type {function(...*):?} */
var __ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_EC2B6v15000INS_18__default_init_tagERKS5_EEOT_OT0_ = Module["__ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_EC2B6v15000INS_18__default_init_tagERKS5_EEOT_OT0_"] = createExportWrapper("_ZNSt3__217__compressed_pairINS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5__repES5_EC2B6v15000INS_18__default_init_tagERKS5_EEOT_OT0_");

/** @type {function(...*):?} */
var __ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EEC2B6v15000IRKS2_vEEOT_ = Module["__ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EEC2B6v15000IRKS2_vEEOT_"] = createExportWrapper("_ZNSt3__222__compressed_pair_elemINS_9allocatorIwEELi1ELb1EEC2B6v15000IRKS2_vEEOT_");

/** @type {function(...*):?} */
var __ZNSt3__211__wrap_iterIPwEpLB6v15000El = Module["__ZNSt3__211__wrap_iterIPwEpLB6v15000El"] = createExportWrapper("_ZNSt3__211__wrap_iterIPwEpLB6v15000El");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE20__throw_out_of_rangeB6v15000Ev = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE20__throw_out_of_rangeB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE20__throw_out_of_rangeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__220__throw_out_of_rangeB6v15000EPKc = Module["__ZNSt3__220__throw_out_of_rangeB6v15000EPKc"] = createExportWrapper("_ZNSt3__220__throw_out_of_rangeB6v15000EPKc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__null_terminate_atB6v15000EPwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__null_terminate_atB6v15000EPwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE19__null_terminate_atB6v15000EPwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__erase_to_endB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__erase_to_endB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE14__erase_to_endB6v15000Em");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE20__throw_out_of_rangeB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE20__throw_out_of_rangeB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE20__throw_out_of_rangeB6v15000Ev");

/** @type {function(...*):?} */
var __ZSt17__throw_bad_allocv = Module["__ZSt17__throw_bad_allocv"] = createExportWrapper("_ZSt17__throw_bad_allocv");

/** @type {function(...*):?} */
var __ZSt15get_new_handlerv = Module["__ZSt15get_new_handlerv"] = createExportWrapper("_ZSt15get_new_handlerv");

/** @type {function(...*):?} */
var __ZnwmRKSt9nothrow_t = Module["__ZnwmRKSt9nothrow_t"] = createExportWrapper("_ZnwmRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZnamRKSt9nothrow_t = Module["__ZnamRKSt9nothrow_t"] = createExportWrapper("_ZnamRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZdlPvRKSt9nothrow_t = Module["__ZdlPvRKSt9nothrow_t"] = createExportWrapper("_ZdlPvRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZdlPvm = Module["__ZdlPvm"] = createExportWrapper("_ZdlPvm");

/** @type {function(...*):?} */
var __ZdaPv = Module["__ZdaPv"] = createExportWrapper("_ZdaPv");

/** @type {function(...*):?} */
var __ZdaPvRKSt9nothrow_t = Module["__ZdaPvRKSt9nothrow_t"] = createExportWrapper("_ZdaPvRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZdaPvm = Module["__ZdaPvm"] = createExportWrapper("_ZdaPvm");

/** @type {function(...*):?} */
var __ZNSt3__222__libcpp_aligned_allocB6v15000Emm = Module["__ZNSt3__222__libcpp_aligned_allocB6v15000Emm"] = createExportWrapper("_ZNSt3__222__libcpp_aligned_allocB6v15000Emm");

/** @type {function(...*):?} */
var __ZnwmSt11align_val_tRKSt9nothrow_t = Module["__ZnwmSt11align_val_tRKSt9nothrow_t"] = createExportWrapper("_ZnwmSt11align_val_tRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZnamSt11align_val_t = Module["__ZnamSt11align_val_t"] = createExportWrapper("_ZnamSt11align_val_t");

/** @type {function(...*):?} */
var __ZnamSt11align_val_tRKSt9nothrow_t = Module["__ZnamSt11align_val_tRKSt9nothrow_t"] = createExportWrapper("_ZnamSt11align_val_tRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZNSt3__221__libcpp_aligned_freeB6v15000EPv = Module["__ZNSt3__221__libcpp_aligned_freeB6v15000EPv"] = createExportWrapper("_ZNSt3__221__libcpp_aligned_freeB6v15000EPv");

/** @type {function(...*):?} */
var __ZdlPvSt11align_val_tRKSt9nothrow_t = Module["__ZdlPvSt11align_val_tRKSt9nothrow_t"] = createExportWrapper("_ZdlPvSt11align_val_tRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZdlPvmSt11align_val_t = Module["__ZdlPvmSt11align_val_t"] = createExportWrapper("_ZdlPvmSt11align_val_t");

/** @type {function(...*):?} */
var __ZdaPvSt11align_val_t = Module["__ZdaPvSt11align_val_t"] = createExportWrapper("_ZdaPvSt11align_val_t");

/** @type {function(...*):?} */
var __ZdaPvSt11align_val_tRKSt9nothrow_t = Module["__ZdaPvSt11align_val_tRKSt9nothrow_t"] = createExportWrapper("_ZdaPvSt11align_val_tRKSt9nothrow_t");

/** @type {function(...*):?} */
var __ZdaPvmSt11align_val_t = Module["__ZdaPvmSt11align_val_t"] = createExportWrapper("_ZdaPvmSt11align_val_t");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEcvNS_17basic_string_viewIcS2_EEB6v15000Ev = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEcvNS_17basic_string_viewIcS2_EEB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEcvNS_17basic_string_viewIcS2_EEB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__217basic_string_viewIcNS_11char_traitsIcEEEC2B6v15000EPKcm = Module["__ZNSt3__217basic_string_viewIcNS_11char_traitsIcEEEC2B6v15000EPKcm"] = createExportWrapper("_ZNSt3__217basic_string_viewIcNS_11char_traitsIcEEEC2B6v15000EPKcm");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE6substrB6v15000Emm = Module["__ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE6substrB6v15000Emm"] = createExportWrapper("_ZNKSt3__217basic_string_viewIcNS_11char_traitsIcEEE6substrB6v15000Emm");

/** @type {function(...*):?} */
var __ZNSt3__211__str_rfindB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S4_S3_ = Module["__ZNSt3__211__str_rfindB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S4_S3_"] = createExportWrapper("_ZNSt3__211__str_rfindB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S4_S3_");

/** @type {function(...*):?} */
var __ZNSt11logic_errorC2ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE = Module["__ZNSt11logic_errorC2ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE"] = createExportWrapper("_ZNSt11logic_errorC2ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE");

/** @type {function(...*):?} */
var __ZNSt9exceptionC2B6v15000Ev = Module["__ZNSt9exceptionC2B6v15000Ev"] = createExportWrapper("_ZNSt9exceptionC2B6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__218__libcpp_refstringC2EPKc = Module["__ZNSt3__218__libcpp_refstringC2EPKc"] = createExportWrapper("_ZNSt3__218__libcpp_refstringC2EPKc");

/** @type {function(...*):?} */
var __ZNSt11logic_errorC2ERKS_ = Module["__ZNSt11logic_errorC2ERKS_"] = createExportWrapper("_ZNSt11logic_errorC2ERKS_");

/** @type {function(...*):?} */
var __ZNSt3__218__libcpp_refstringC2ERKS0_ = Module["__ZNSt3__218__libcpp_refstringC2ERKS0_"] = createExportWrapper("_ZNSt3__218__libcpp_refstringC2ERKS0_");

/** @type {function(...*):?} */
var __ZNKSt3__218__libcpp_refstring15__uses_refcountEv = Module["__ZNKSt3__218__libcpp_refstring15__uses_refcountEv"] = createExportWrapper("_ZNKSt3__218__libcpp_refstring15__uses_refcountEv");

/** @type {function(...*):?} */
var __ZNSt11logic_erroraSERKS_ = Module["__ZNSt11logic_erroraSERKS_"] = createExportWrapper("_ZNSt11logic_erroraSERKS_");

/** @type {function(...*):?} */
var __ZNSt3__218__libcpp_refstringaSERKS0_ = Module["__ZNSt3__218__libcpp_refstringaSERKS0_"] = createExportWrapper("_ZNSt3__218__libcpp_refstringaSERKS0_");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorC2ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE = Module["__ZNSt13runtime_errorC2ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE"] = createExportWrapper("_ZNSt13runtime_errorC2ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorC2EPKc = Module["__ZNSt13runtime_errorC2EPKc"] = createExportWrapper("_ZNSt13runtime_errorC2EPKc");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorC2ERKS_ = Module["__ZNSt13runtime_errorC2ERKS_"] = createExportWrapper("_ZNSt13runtime_errorC2ERKS_");

/** @type {function(...*):?} */
var __ZNSt13runtime_erroraSERKS_ = Module["__ZNSt13runtime_erroraSERKS_"] = createExportWrapper("_ZNSt13runtime_erroraSERKS_");

/** @type {function(...*):?} */
var __ZNSt11logic_errorC1ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE = Module["__ZNSt11logic_errorC1ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE"] = createExportWrapper("_ZNSt11logic_errorC1ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE");

/** @type {function(...*):?} */
var __ZNSt11logic_errorC1EPKc = Module["__ZNSt11logic_errorC1EPKc"] = createExportWrapper("_ZNSt11logic_errorC1EPKc");

/** @type {function(...*):?} */
var __ZNSt11logic_errorC1ERKS_ = Module["__ZNSt11logic_errorC1ERKS_"] = createExportWrapper("_ZNSt11logic_errorC1ERKS_");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorC1ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE = Module["__ZNSt13runtime_errorC1ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE"] = createExportWrapper("_ZNSt13runtime_errorC1ERKNSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorC1EPKc = Module["__ZNSt13runtime_errorC1EPKc"] = createExportWrapper("_ZNSt13runtime_errorC1EPKc");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorC1ERKS_ = Module["__ZNSt13runtime_errorC1ERKS_"] = createExportWrapper("_ZNSt13runtime_errorC1ERKS_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmPKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmPKcm");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE4moveEPcPKcm = Module["__ZNSt3__211char_traitsIcE4moveEPcPKcm"] = createExportWrapper("_ZNSt3__211char_traitsIcE4moveEPcPKcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE21__grow_by_and_replaceEmmmmmmPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE21__grow_by_and_replaceEmmmmmmPKc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE21__grow_by_and_replaceEmmmmmmPKc");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5rfindEPKcmm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5rfindEPKcmm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5rfindEPKcmm");

/** @type {function(...*):?} */
var __ZNSt3__211__str_rfindB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__211__str_rfindB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__211__str_rfindB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__218__find_end_classicB6v15000IPKcS2_DoFbccEEET_S4_S4_T0_S5_RT1_ = Module["__ZNSt3__218__find_end_classicB6v15000IPKcS2_DoFbccEEET_S4_S4_T0_S5_RT1_"] = createExportWrapper("_ZNSt3__218__find_end_classicB6v15000IPKcS2_DoFbccEEET_S4_S4_T0_S5_RT1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcmm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcmm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcmm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmPKc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmPKc");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16find_last_not_ofEPKcmm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16find_last_not_ofEPKcmm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE16find_last_not_ofEPKcmm");

/** @type {function(...*):?} */
var __ZNSt3__222__str_find_last_not_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__222__str_find_last_not_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__222__str_find_last_not_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE4findEPKcmRS2_ = Module["__ZNSt3__211char_traitsIcE4findEPKcmRS2_"] = createExportWrapper("_ZNSt3__211char_traitsIcE4findEPKcmRS2_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev");

/** @type {function(...*):?} */
var __ZNSt3__218__debug_db_erase_cB6v15000INS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEEEvPT_ = Module["__ZNSt3__218__debug_db_erase_cB6v15000INS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEEEvPT_"] = createExportWrapper("_ZNSt3__218__debug_db_erase_cB6v15000INS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEEEvPT_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17find_first_not_ofEPKcmm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17find_first_not_ofEPKcmm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17find_first_not_ofEPKcmm");

/** @type {function(...*):?} */
var __ZNSt3__223__str_find_first_not_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__223__str_find_first_not_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__223__str_find_first_not_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmmc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmmc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIcE6assignEPcmc = Module["__ZNSt3__211char_traitsIcE6assignEPcmc"] = createExportWrapper("_ZNSt3__211char_traitsIcE6assignEPcmc");

/** @type {function(...*):?} */
var __ZNSt3__26fill_nB6v15000IPcmcEET_S2_T0_RKT1_ = Module["__ZNSt3__26fill_nB6v15000IPcmcEET_S2_T0_RKT1_"] = createExportWrapper("_ZNSt3__26fill_nB6v15000IPcmcEET_S2_T0_RKT1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE2atEm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE2atEm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE2atEm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKcm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13find_first_ofEPKcmm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13find_first_ofEPKcmm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE13find_first_ofEPKcmm");

/** @type {function(...*):?} */
var __ZNSt3__219__str_find_first_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__219__str_find_first_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__219__str_find_first_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__218__find_first_of_ceIPKcS2_RDoFbccEEET_S5_S5_T0_S6_OT1_ = Module["__ZNSt3__218__find_first_of_ceIPKcS2_RDoFbccEEET_S5_S5_T0_S6_OT1_"] = createExportWrapper("_ZNSt3__218__find_first_of_ceIPKcS2_RDoFbccEEET_S5_S5_T0_S6_OT1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmmc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmmc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__shrink_or_extendB6v15000Em = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__shrink_or_extendB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE18__shrink_or_extendB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignERKS5_mm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignERKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignERKS5_mm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2ERKS5_mmRKS4_ = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2ERKS5_mmRKS4_"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2ERKS5_mmRKS4_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4findEcm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4findEcm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4findEcm");

/** @type {function(...*):?} */
var __ZNSt3__210__str_findB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S4_S3_ = Module["__ZNSt3__210__str_findB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S4_S3_"] = createExportWrapper("_ZNSt3__210__str_findB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S4_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEmc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEmc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE12find_last_ofEPKcmm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE12find_last_ofEPKcmm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE12find_last_ofEPKcmm");

/** @type {function(...*):?} */
var __ZNSt3__218__str_find_last_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__218__str_find_last_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__218__str_find_last_ofB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEmc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEmc");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5rfindEcm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5rfindEcm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5rfindEcm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignEmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignEmc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6assignEmc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE26__erase_external_with_moveEmm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE26__erase_external_with_moveEmm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE26__erase_external_with_moveEmm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendERKS5_mm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendERKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendERKS5_mm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEPKc = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEPKc"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEPKc");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKc = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKc"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE2atEm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE2atEm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE2atEm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4findEPKcmm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4findEPKcmm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4findEPKcmm");

/** @type {function(...*):?} */
var __ZNSt3__210__str_findB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__210__str_findB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__210__str_findB6v15000IcmNS_11char_traitsIcEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__218__search_substringIcNS_11char_traitsIcEEEEPKT_S5_S5_S5_S5_ = Module["__ZNSt3__218__search_substringIcNS_11char_traitsIcEEEEPKT_S5_S5_S5_S5_"] = createExportWrapper("_ZNSt3__218__search_substringIcNS_11char_traitsIcEEEEPKT_S5_S5_S5_S5_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmRKS5_mm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmRKS5_mm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmRKS5_mm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareB6v15000INS_17basic_string_viewIcS2_EEEENS_9enable_ifIXaasr33__can_be_converted_to_string_viewIcS2_T_EE5valuentsr17__is_same_uncvrefISA_S5_EE5valueEiE4typeEmmRKSA_mm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareB6v15000INS_17basic_string_viewIcS2_EEEENS_9enable_ifIXaasr33__can_be_converted_to_string_viewIcS2_T_EE5valuentsr17__is_same_uncvrefISA_S5_EE5valueEiE4typeEmmRKSA_mm"] = createExportWrapper("_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareB6v15000INS_17basic_string_viewIcS2_EEEENS_9enable_ifIXaasr33__can_be_converted_to_string_viewIcS2_T_EE5valuentsr17__is_same_uncvrefISA_S5_EE5valueEiE4typeEmmRKSA_mm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmRKS5_mm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmRKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7replaceEmmRKS5_mm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertENS_11__wrap_iterIPKcEEc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertENS_11__wrap_iterIPKcEEc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertENS_11__wrap_iterIPKcEEc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmRKS5_mm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmRKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmRKS5_mm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmPKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmPKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmPKwm");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE4moveEPwPKwm = Module["__ZNSt3__211char_traitsIwE4moveEPwPKwm"] = createExportWrapper("_ZNSt3__211char_traitsIwE4moveEPwPKwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE21__grow_by_and_replaceEmmmmmmPKw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE21__grow_by_and_replaceEmmmmmmPKw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE21__grow_by_and_replaceEmmmmmmPKw");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5rfindEPKwmm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5rfindEPKwmm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5rfindEPKwmm");

/** @type {function(...*):?} */
var __ZNSt3__211__str_rfindB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__211__str_rfindB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__211__str_rfindB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__218__find_end_classicB6v15000IPKwS2_DoFbwwEEET_S4_S4_T0_S5_RT1_ = Module["__ZNSt3__218__find_end_classicB6v15000IPKwS2_DoFbwwEEET_S4_S4_T0_S5_RT1_"] = createExportWrapper("_ZNSt3__218__find_end_classicB6v15000IPKwS2_DoFbwwEEET_S4_S4_T0_S5_RT1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEPKwmm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEPKwmm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEPKwmm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmPKw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmPKw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmPKw");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16find_last_not_ofEPKwmm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16find_last_not_ofEPKwmm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE16find_last_not_ofEPKwmm");

/** @type {function(...*):?} */
var __ZNSt3__222__str_find_last_not_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__222__str_find_last_not_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__222__str_find_last_not_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE4findEPKwmRS2_ = Module["__ZNSt3__211char_traitsIwE4findEPKwmRS2_"] = createExportWrapper("_ZNSt3__211char_traitsIwE4findEPKwmRS2_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev");

/** @type {function(...*):?} */
var __ZNSt3__218__debug_db_erase_cB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_ = Module["__ZNSt3__218__debug_db_erase_cB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_"] = createExportWrapper("_ZNSt3__218__debug_db_erase_cB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17find_first_not_ofEPKwmm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17find_first_not_ofEPKwmm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17find_first_not_ofEPKwmm");

/** @type {function(...*):?} */
var __ZNSt3__223__str_find_first_not_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__223__str_find_first_not_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__223__str_find_first_not_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmmw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmmw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmmw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9__grow_byEmmmmmm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9__grow_byEmmmmmm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9__grow_byEmmmmmm");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE6assignEPwmw = Module["__ZNSt3__211char_traitsIwE6assignEPwmw"] = createExportWrapper("_ZNSt3__211char_traitsIwE6assignEPwmw");

/** @type {function(...*):?} */
var __ZNSt3__26fill_nB6v15000IPwmwEET_S2_T0_RKT1_ = Module["__ZNSt3__26fill_nB6v15000IPwmwEET_S2_T0_RKT1_"] = createExportWrapper("_ZNSt3__26fill_nB6v15000IPwmwEET_S2_T0_RKT1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEaSEw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEaSEw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEaSEw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEPKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEPKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEPKwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE25__init_copy_ctor_externalEPKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE25__init_copy_ctor_externalEPKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE25__init_copy_ctor_externalEPKwm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE2atEm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE2atEm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE2atEm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmPKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmPKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmPKwm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13find_first_ofEPKwmm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13find_first_ofEPKwmm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE13find_first_ofEPKwmm");

/** @type {function(...*):?} */
var __ZNSt3__219__str_find_first_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__219__str_find_first_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__219__str_find_first_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__218__find_first_of_ceIPKwS2_RDoFbwwEEET_S5_S5_T0_S6_OT1_ = Module["__ZNSt3__218__find_first_of_ceIPKwS2_RDoFbwwEEET_S5_S5_T0_S6_OT1_"] = createExportWrapper("_ZNSt3__218__find_first_of_ceIPKwS2_RDoFbwwEEET_S5_S5_T0_S6_OT1_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmmw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmmw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmmw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_externalEPKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_externalEPKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_externalEPKwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_externalEPKw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_externalEPKw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_externalEPKw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7reserveEm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7reserveEm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7reserveEm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__shrink_or_extendB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__shrink_or_extendB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE18__shrink_or_extendB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEPKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEPKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEPKwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignERKS5_mm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignERKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignERKS5_mm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4copyEPwmm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4copyEPwmm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4copyEPwmm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2ERKS5_mmRKS4_ = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2ERKS5_mmRKS4_"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2ERKS5_mmRKS4_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4findEwm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4findEwm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4findEwm");

/** @type {function(...*):?} */
var __ZNSt3__210__str_findB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S4_S3_ = Module["__ZNSt3__210__str_findB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S4_S3_"] = createExportWrapper("_ZNSt3__210__str_findB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S4_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEmw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEmw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initEmw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmPKw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmPKw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmPKw");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE12find_last_ofEPKwmm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE12find_last_ofEPKwmm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE12find_last_ofEPKwmm");

/** @type {function(...*):?} */
var __ZNSt3__218__str_find_last_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__218__str_find_last_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__218__str_find_last_ofB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_no_aliasILb0EEERS5_PKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_no_aliasILb0EEERS5_PKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_no_aliasILb0EEERS5_PKwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_no_aliasILb1EEERS5_PKwm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_no_aliasILb1EEERS5_PKwm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE17__assign_no_aliasILb1EEERS5_PKwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEmw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEmw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEmw");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5rfindEwm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5rfindEwm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE5rfindEwm");

/** @type {function(...*):?} */
var __ZNSt3__211__str_rfindB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S4_S3_ = Module["__ZNSt3__211__str_rfindB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S4_S3_"] = createExportWrapper("_ZNSt3__211__str_rfindB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S4_S3_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignEmw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignEmw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6assignEmw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE26__erase_external_with_moveEmm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE26__erase_external_with_moveEmm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE26__erase_external_with_moveEmm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendERKS5_mm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendERKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendERKS5_mm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEPKw = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEPKw"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEPKw");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmPKwm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmPKwm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmPKwm");

/** @type {function(...*):?} */
var __ZNSt3__211char_traitsIwE7compareEPKwS3_m = Module["__ZNSt3__211char_traitsIwE7compareEPKwS3_m"] = createExportWrapper("_ZNSt3__211char_traitsIwE7compareEPKwS3_m");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmPKw = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmPKw"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmPKw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE2atEm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE2atEm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE2atEm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4findEPKwmm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4findEPKwmm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4findEPKwmm");

/** @type {function(...*):?} */
var __ZNSt3__210__str_findB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_ = Module["__ZNSt3__210__str_findB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_"] = createExportWrapper("_ZNSt3__210__str_findB6v15000IwmNS_11char_traitsIwEELm4294967295EEET0_PKT_S3_S6_S3_S3_");

/** @type {function(...*):?} */
var __ZNSt3__218__search_substringIwNS_11char_traitsIwEEEEPKT_S5_S5_S5_S5_ = Module["__ZNSt3__218__search_substringIwNS_11char_traitsIwEEEEPKT_S5_S5_S5_S5_"] = createExportWrapper("_ZNSt3__218__search_substringIwNS_11char_traitsIwEEEEPKT_S5_S5_S5_S5_");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmRKS5_mm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmRKS5_mm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareEmmRKS5_mm");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEcvNS_17basic_string_viewIwS2_EEB6v15000Ev = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEcvNS_17basic_string_viewIwS2_EEB6v15000Ev"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEcvNS_17basic_string_viewIwS2_EEB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareB6v15000INS_17basic_string_viewIwS2_EEEENS_9enable_ifIXaasr33__can_be_converted_to_string_viewIwS2_T_EE5valuentsr17__is_same_uncvrefISA_S5_EE5valueEiE4typeEmmRKSA_mm = Module["__ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareB6v15000INS_17basic_string_viewIwS2_EEEENS_9enable_ifIXaasr33__can_be_converted_to_string_viewIwS2_T_EE5valuentsr17__is_same_uncvrefISA_S5_EE5valueEiE4typeEmmRKSA_mm"] = createExportWrapper("_ZNKSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7compareB6v15000INS_17basic_string_viewIwS2_EEEENS_9enable_ifIXaasr33__can_be_converted_to_string_viewIwS2_T_EE5valuentsr17__is_same_uncvrefISA_S5_EE5valueEiE4typeEmmRKSA_mm");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE6substrB6v15000Emm = Module["__ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE6substrB6v15000Emm"] = createExportWrapper("_ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE6substrB6v15000Emm");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE7compareES3_ = Module["__ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE7compareES3_"] = createExportWrapper("_ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE7compareES3_");

/** @type {function(...*):?} */
var __ZNSt3__217basic_string_viewIwNS_11char_traitsIwEEEC2B6v15000EPKwm = Module["__ZNSt3__217basic_string_viewIwNS_11char_traitsIwEEEC2B6v15000EPKwm"] = createExportWrapper("_ZNSt3__217basic_string_viewIwNS_11char_traitsIwEEEC2B6v15000EPKwm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEPKw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEPKw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6appendEPKw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmRKS5_mm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmRKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE7replaceEmmRKS5_mm");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertENS_11__wrap_iterIPKwEEw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertENS_11__wrap_iterIPKwEEw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertENS_11__wrap_iterIPKwEEw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmRKS5_mm = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmRKS5_mm"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6insertEmRKS5_mm");

/** @type {function(...*):?} */
var __ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_ = Module["__ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_"] = createExportWrapper("_ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000ENS_24__uninitialized_size_tagEmRKS4_ = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000ENS_24__uninitialized_size_tagEmRKS4_"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000ENS_24__uninitialized_size_tagEmRKS4_");

/** @type {function(...*):?} */
var __ZNSt3__216allocator_traitsINS_9allocatorIcEEE8allocateB6v15000ERS2_m = Module["__ZNSt3__216allocator_traitsINS_9allocatorIcEEE8allocateB6v15000ERS2_m"] = createExportWrapper("_ZNSt3__216allocator_traitsINS_9allocatorIcEEE8allocateB6v15000ERS2_m");

/** @type {function(...*):?} */
var __ZNSt3__24stoiERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi = Module["__ZNSt3__24stoiERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi"] = createExportWrapper("_ZNSt3__24stoiERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__24stolERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi = Module["__ZNSt3__24stolERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi"] = createExportWrapper("_ZNSt3__24stolERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__25stoulERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi = Module["__ZNSt3__25stoulERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi"] = createExportWrapper("_ZNSt3__25stoulERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__25stollERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi = Module["__ZNSt3__25stollERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi"] = createExportWrapper("_ZNSt3__25stollERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__26stoullERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi = Module["__ZNSt3__26stoullERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi"] = createExportWrapper("_ZNSt3__26stoullERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__24stofERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm = Module["__ZNSt3__24stofERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm"] = createExportWrapper("_ZNSt3__24stofERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm");

/** @type {function(...*):?} */
var __ZNSt3__24stodERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm = Module["__ZNSt3__24stodERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm"] = createExportWrapper("_ZNSt3__24stodERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm");

/** @type {function(...*):?} */
var __ZNSt3__25stoldERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm = Module["__ZNSt3__25stoldERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm"] = createExportWrapper("_ZNSt3__25stoldERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPm");

/** @type {function(...*):?} */
var __ZNSt3__24stoiERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi = Module["__ZNSt3__24stoiERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi"] = createExportWrapper("_ZNSt3__24stoiERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__24stolERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi = Module["__ZNSt3__24stolERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi"] = createExportWrapper("_ZNSt3__24stolERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__25stoulERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi = Module["__ZNSt3__25stoulERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi"] = createExportWrapper("_ZNSt3__25stoulERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__25stollERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi = Module["__ZNSt3__25stollERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi"] = createExportWrapper("_ZNSt3__25stollERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__26stoullERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi = Module["__ZNSt3__26stoullERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi"] = createExportWrapper("_ZNSt3__26stoullERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPmi");

/** @type {function(...*):?} */
var __ZNSt3__24stofERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm = Module["__ZNSt3__24stofERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm"] = createExportWrapper("_ZNSt3__24stofERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm");

/** @type {function(...*):?} */
var __ZNSt3__24stodERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm = Module["__ZNSt3__24stodERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm"] = createExportWrapper("_ZNSt3__24stodERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm");

/** @type {function(...*):?} */
var __ZNSt3__25stoldERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm = Module["__ZNSt3__25stoldERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm"] = createExportWrapper("_ZNSt3__25stoldERKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEPm");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEi = Module["__ZNSt3__29to_stringEi"] = createExportWrapper("_ZNSt3__29to_stringEi");

/** @type {function(...*):?} */
var __ZNSt3__28to_charsB6v15000IiLi0EEENS_15to_chars_resultEPcS2_T_ = Module["__ZNSt3__28to_charsB6v15000IiLi0EEENS_15to_chars_resultEPcS2_T_"] = createExportWrapper("_ZNSt3__28to_charsB6v15000IiLi0EEENS_15to_chars_resultEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000IPcvEET_S8_ = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000IPcvEET_S8_"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2B6v15000IPcvEET_S8_");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEl = Module["__ZNSt3__29to_stringEl"] = createExportWrapper("_ZNSt3__29to_stringEl");

/** @type {function(...*):?} */
var __ZNSt3__28to_charsB6v15000IlLi0EEENS_15to_chars_resultEPcS2_T_ = Module["__ZNSt3__28to_charsB6v15000IlLi0EEENS_15to_chars_resultEPcS2_T_"] = createExportWrapper("_ZNSt3__28to_charsB6v15000IlLi0EEENS_15to_chars_resultEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEx = Module["__ZNSt3__29to_stringEx"] = createExportWrapper("_ZNSt3__29to_stringEx");

/** @type {function(...*):?} */
var __ZNSt3__28to_charsB6v15000IxLi0EEENS_15to_chars_resultEPcS2_T_ = Module["__ZNSt3__28to_charsB6v15000IxLi0EEENS_15to_chars_resultEPcS2_T_"] = createExportWrapper("_ZNSt3__28to_charsB6v15000IxLi0EEENS_15to_chars_resultEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEj = Module["__ZNSt3__29to_stringEj"] = createExportWrapper("_ZNSt3__29to_stringEj");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEm = Module["__ZNSt3__29to_stringEm"] = createExportWrapper("_ZNSt3__29to_stringEm");

/** @type {function(...*):?} */
var __ZNSt3__28to_charsB6v15000ImLi0EEENS_15to_chars_resultEPcS2_T_ = Module["__ZNSt3__28to_charsB6v15000ImLi0EEENS_15to_chars_resultEPcS2_T_"] = createExportWrapper("_ZNSt3__28to_charsB6v15000ImLi0EEENS_15to_chars_resultEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEy = Module["__ZNSt3__29to_stringEy"] = createExportWrapper("_ZNSt3__29to_stringEy");

/** @type {function(...*):?} */
var __ZNSt3__28to_charsB6v15000IyLi0EEENS_15to_chars_resultEPcS2_T_ = Module["__ZNSt3__28to_charsB6v15000IyLi0EEENS_15to_chars_resultEPcS2_T_"] = createExportWrapper("_ZNSt3__28to_charsB6v15000IyLi0EEENS_15to_chars_resultEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEi = Module["__ZNSt3__210to_wstringEi"] = createExportWrapper("_ZNSt3__210to_wstringEi");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000IPcvEET_S8_ = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000IPcvEET_S8_"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000IPcvEET_S8_");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEl = Module["__ZNSt3__210to_wstringEl"] = createExportWrapper("_ZNSt3__210to_wstringEl");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEx = Module["__ZNSt3__210to_wstringEx"] = createExportWrapper("_ZNSt3__210to_wstringEx");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEj = Module["__ZNSt3__210to_wstringEj"] = createExportWrapper("_ZNSt3__210to_wstringEj");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEm = Module["__ZNSt3__210to_wstringEm"] = createExportWrapper("_ZNSt3__210to_wstringEm");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEy = Module["__ZNSt3__210to_wstringEy"] = createExportWrapper("_ZNSt3__210to_wstringEy");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEf = Module["__ZNSt3__29to_stringEf"] = createExportWrapper("_ZNSt3__29to_stringEf");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEd = Module["__ZNSt3__29to_stringEd"] = createExportWrapper("_ZNSt3__29to_stringEd");

/** @type {function(...*):?} */
var __ZNSt3__29to_stringEe = Module["__ZNSt3__29to_stringEe"] = createExportWrapper("_ZNSt3__29to_stringEe");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEf = Module["__ZNSt3__210to_wstringEf"] = createExportWrapper("_ZNSt3__210to_wstringEf");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED1Ev = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED1Ev"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED1Ev");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeB6v15000Em = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeB6v15000Em"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeB6v15000Em");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000EOS5_ = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000EOS5_"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC2B6v15000EOS5_");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEd = Module["__ZNSt3__210to_wstringEd"] = createExportWrapper("_ZNSt3__210to_wstringEd");

/** @type {function(...*):?} */
var __ZNSt3__210to_wstringEe = Module["__ZNSt3__210to_wstringEe"] = createExportWrapper("_ZNSt3__210to_wstringEe");

/** @type {function(...*):?} */
var __ZNSt3__215__find_end_implB6v15000INS_17_ClassicAlgPolicyEPKcS3_S3_S3_DoFbccENS_10__identityES5_EENS_4pairIT0_S7_EES7_T1_T2_T3_RT4_RT5_RT6_NS_20forward_iterator_tagESI_ = Module["__ZNSt3__215__find_end_implB6v15000INS_17_ClassicAlgPolicyEPKcS3_S3_S3_DoFbccENS_10__identityES5_EENS_4pairIT0_S7_EES7_T1_T2_T3_RT4_RT5_RT6_NS_20forward_iterator_tagESI_"] = createExportWrapper("_ZNSt3__215__find_end_implB6v15000INS_17_ClassicAlgPolicyEPKcS3_S3_S3_DoFbccENS_10__identityES5_EENS_4pairIT0_S7_EES7_T1_T2_T3_RT4_RT5_RT6_NS_20forward_iterator_tagESI_");

/** @type {function(...*):?} */
var __ZNSt3__28_IterOpsINS_17_ClassicAlgPolicyEE4nextB6v15000IPKcEET_S6_S6_ = Module["__ZNSt3__28_IterOpsINS_17_ClassicAlgPolicyEE4nextB6v15000IPKcEET_S6_S6_"] = createExportWrapper("_ZNSt3__28_IterOpsINS_17_ClassicAlgPolicyEE4nextB6v15000IPKcEET_S6_S6_");

/** @type {function(...*):?} */
var __ZNSt3__28__invokeB6v15000IRNS_10__identityEJRKcEEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_ = Module["__ZNSt3__28__invokeB6v15000IRNS_10__identityEJRKcEEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_"] = createExportWrapper("_ZNSt3__28__invokeB6v15000IRNS_10__identityEJRKcEEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_");

/** @type {function(...*):?} */
var __ZNSt3__28__invokeB6v15000IRDoFbccEJRKcS4_EEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_ = Module["__ZNSt3__28__invokeB6v15000IRDoFbccEJRKcS4_EEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_"] = createExportWrapper("_ZNSt3__28__invokeB6v15000IRDoFbccEJRKcS4_EEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_");

/** @type {function(...*):?} */
var __ZNSt3__24pairIPKcS2_EC2B6v15000IRS2_S5_LPv0EEEOT_OT0_ = Module["__ZNSt3__24pairIPKcS2_EC2B6v15000IRS2_S5_LPv0EEEOT_OT0_"] = createExportWrapper("_ZNSt3__24pairIPKcS2_EC2B6v15000IRS2_S5_LPv0EEEOT_OT0_");

/** @type {function(...*):?} */
var __ZNKSt3__210__identityclIRKcEEOT_S5_ = Module["__ZNKSt3__210__identityclIRKcEEOT_S5_"] = createExportWrapper("_ZNKSt3__210__identityclIRKcEEOT_S5_");

/** @type {function(...*):?} */
var __ZNSt3__28__fill_nB6v15000IPcmcEET_S2_T0_RKT1_ = Module["__ZNSt3__28__fill_nB6v15000IPcmcEET_S2_T0_RKT1_"] = createExportWrapper("_ZNSt3__28__fill_nB6v15000IPcmcEET_S2_T0_RKT1_");

/** @type {function(...*):?} */
var __ZNSt3__215__find_end_implB6v15000INS_17_ClassicAlgPolicyEPKwS3_S3_S3_DoFbwwENS_10__identityES5_EENS_4pairIT0_S7_EES7_T1_T2_T3_RT4_RT5_RT6_NS_20forward_iterator_tagESI_ = Module["__ZNSt3__215__find_end_implB6v15000INS_17_ClassicAlgPolicyEPKwS3_S3_S3_DoFbwwENS_10__identityES5_EENS_4pairIT0_S7_EES7_T1_T2_T3_RT4_RT5_RT6_NS_20forward_iterator_tagESI_"] = createExportWrapper("_ZNSt3__215__find_end_implB6v15000INS_17_ClassicAlgPolicyEPKwS3_S3_S3_DoFbwwENS_10__identityES5_EENS_4pairIT0_S7_EES7_T1_T2_T3_RT4_RT5_RT6_NS_20forward_iterator_tagESI_");

/** @type {function(...*):?} */
var __ZNSt3__28_IterOpsINS_17_ClassicAlgPolicyEE4nextB6v15000IPKwEET_S6_S6_ = Module["__ZNSt3__28_IterOpsINS_17_ClassicAlgPolicyEE4nextB6v15000IPKwEET_S6_S6_"] = createExportWrapper("_ZNSt3__28_IterOpsINS_17_ClassicAlgPolicyEE4nextB6v15000IPKwEET_S6_S6_");

/** @type {function(...*):?} */
var __ZNSt3__28__invokeB6v15000IRNS_10__identityEJRKwEEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_ = Module["__ZNSt3__28__invokeB6v15000IRNS_10__identityEJRKwEEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_"] = createExportWrapper("_ZNSt3__28__invokeB6v15000IRNS_10__identityEJRKwEEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_");

/** @type {function(...*):?} */
var __ZNSt3__28__invokeB6v15000IRDoFbwwEJRKwS4_EEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_ = Module["__ZNSt3__28__invokeB6v15000IRDoFbwwEJRKwS4_EEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_"] = createExportWrapper("_ZNSt3__28__invokeB6v15000IRDoFbwwEJRKwS4_EEEDTclclsr3stdE7declvalIT_EEspclsr3stdE7declvalIT0_EEEEOS5_DpOS6_");

/** @type {function(...*):?} */
var __ZNSt3__24pairIPKwS2_EC2B6v15000IRS2_S5_LPv0EEEOT_OT0_ = Module["__ZNSt3__24pairIPKwS2_EC2B6v15000IRS2_S5_LPv0EEEOT_OT0_"] = createExportWrapper("_ZNSt3__24pairIPKwS2_EC2B6v15000IRS2_S5_LPv0EEEOT_OT0_");

/** @type {function(...*):?} */
var __ZNKSt3__210__identityclIRKwEEOT_S5_ = Module["__ZNKSt3__210__identityclIRKwEEOT_S5_"] = createExportWrapper("_ZNKSt3__210__identityclIRKwEEOT_S5_");

/** @type {function(...*):?} */
var __ZNSt3__28__fill_nB6v15000IPwmwEET_S2_T0_RKT1_ = Module["__ZNSt3__28__fill_nB6v15000IPwmwEET_S2_T0_RKT1_"] = createExportWrapper("_ZNSt3__28__fill_nB6v15000IPwmwEET_S2_T0_RKT1_");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE4sizeB6v15000Ev = Module["__ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE4sizeB6v15000Ev"] = createExportWrapper("_ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE4sizeB6v15000Ev");

/** @type {function(...*):?} */
var __ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE4dataB6v15000Ev = Module["__ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE4dataB6v15000Ev"] = createExportWrapper("_ZNKSt3__217basic_string_viewIwNS_11char_traitsIwEEE4dataB6v15000Ev");

/** @type {function(...*):?} */
var __ZNSt3__2plB6v15000IcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EERKS9_PKS6_ = Module["__ZNSt3__2plB6v15000IcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EERKS9_PKS6_"] = createExportWrapper("_ZNSt3__2plB6v15000IcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EERKS9_PKS6_");

/** @type {function(...*):?} */
var __ZNSt3__215__to_chars_itoaB6v15000IiEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb1EEE = Module["__ZNSt3__215__to_chars_itoaB6v15000IiEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb1EEE"] = createExportWrapper("_ZNSt3__215__to_chars_itoaB6v15000IiEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb1EEE");

/** @type {function(...*):?} */
var __ZNSt3__218__to_unsigned_likeB6v15000IiEENS_13make_unsignedIT_E4typeES2_ = Module["__ZNSt3__218__to_unsigned_likeB6v15000IiEENS_13make_unsignedIT_E4typeES2_"] = createExportWrapper("_ZNSt3__218__to_unsigned_likeB6v15000IiEENS_13make_unsignedIT_E4typeES2_");

/** @type {function(...*):?} */
var __ZNSt3__212__complementB6v15000IjEET_S1_ = Module["__ZNSt3__212__complementB6v15000IjEET_S1_"] = createExportWrapper("_ZNSt3__212__complementB6v15000IjEET_S1_");

/** @type {function(...*):?} */
var __ZNSt3__215__to_chars_itoaB6v15000IxEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb1EEE = Module["__ZNSt3__215__to_chars_itoaB6v15000IxEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb1EEE"] = createExportWrapper("_ZNSt3__215__to_chars_itoaB6v15000IxEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb1EEE");

/** @type {function(...*):?} */
var __ZNSt3__218__to_unsigned_likeB6v15000IxEENS_13make_unsignedIT_E4typeES2_ = Module["__ZNSt3__218__to_unsigned_likeB6v15000IxEENS_13make_unsignedIT_E4typeES2_"] = createExportWrapper("_ZNSt3__218__to_unsigned_likeB6v15000IxEENS_13make_unsignedIT_E4typeES2_");

/** @type {function(...*):?} */
var __ZNSt3__212__complementB6v15000IyEET_S1_ = Module["__ZNSt3__212__complementB6v15000IyEET_S1_"] = createExportWrapper("_ZNSt3__212__complementB6v15000IyEET_S1_");

/** @type {function(...*):?} */
var __ZNSt3__215__to_chars_itoaB6v15000IyEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb0EEE = Module["__ZNSt3__215__to_chars_itoaB6v15000IyEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb0EEE"] = createExportWrapper("_ZNSt3__215__to_chars_itoaB6v15000IyEENS_15to_chars_resultEPcS2_T_NS_17integral_constantIbLb0EEE");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa13__traits_baseIyvE7__widthB6v15000Ey = Module["__ZNSt3__26__itoa13__traits_baseIyvE7__widthB6v15000Ey"] = createExportWrapper("_ZNSt3__26__itoa13__traits_baseIyvE7__widthB6v15000Ey");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa13__traits_baseIyvE9__convertB6v15000EPcy = Module["__ZNSt3__26__itoa13__traits_baseIyvE9__convertB6v15000EPcy"] = createExportWrapper("_ZNSt3__26__itoa13__traits_baseIyvE9__convertB6v15000EPcy");

/** @type {function(...*):?} */
var __ZNSt3__212__libcpp_clzB6v15000Ey = Module["__ZNSt3__212__libcpp_clzB6v15000Ey"] = createExportWrapper("_ZNSt3__212__libcpp_clzB6v15000Ey");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa13__base_10_u64B6v15000EPcy = Module["__ZNSt3__26__itoa13__base_10_u64B6v15000EPcy"] = createExportWrapper("_ZNSt3__26__itoa13__base_10_u64B6v15000EPcy");

/** @type {function(...*):?} */
var __ZNSt3__26__itoa10__append10B6v15000IyEEPcS2_T_ = Module["__ZNSt3__26__itoa10__append10B6v15000IyEEPcS2_T_"] = createExportWrapper("_ZNSt3__26__itoa10__append10B6v15000IyEEPcS2_T_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initIPcEENS_9enable_ifIXsr27__is_cpp17_forward_iteratorIT_EE5valueEvE4typeES9_S9_ = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initIPcEENS_9enable_ifIXsr27__is_cpp17_forward_iteratorIT_EE5valueEvE4typeES9_S9_"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6__initIPcEENS_9enable_ifIXsr27__is_cpp17_forward_iteratorIT_EE5valueEvE4typeES9_S9_");

/** @type {function(...*):?} */
var __ZNSt3__215__debug_db_swapB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_S8_ = Module["__ZNSt3__215__debug_db_swapB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_S8_"] = createExportWrapper("_ZNSt3__215__debug_db_swapB6v15000INS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEEEEvPT_S8_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC1ERKS5_mmRKS4_ = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC1ERKS5_mmRKS4_"] = createExportWrapper("_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC1ERKS5_mmRKS4_");

/** @type {function(...*):?} */
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC1ERKS5_mmRKS4_ = Module["__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC1ERKS5_mmRKS4_"] = createExportWrapper("_ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEC1ERKS5_mmRKS4_");

/** @type {function(...*):?} */
var __ZSt14set_unexpectedPFvvE = Module["__ZSt14set_unexpectedPFvvE"] = createExportWrapper("_ZSt14set_unexpectedPFvvE");

/** @type {function(...*):?} */
var __ZSt13set_terminatePFvvE = Module["__ZSt13set_terminatePFvvE"] = createExportWrapper("_ZSt13set_terminatePFvvE");

/** @type {function(...*):?} */
var __ZSt15set_new_handlerPFvvE = Module["__ZSt15set_new_handlerPFvvE"] = createExportWrapper("_ZSt15set_new_handlerPFvvE");

/** @type {function(...*):?} */
var __ZSt14get_unexpectedv = Module["__ZSt14get_unexpectedv"] = createExportWrapper("_ZSt14get_unexpectedv");

/** @type {function(...*):?} */
var __ZSt10unexpectedv = Module["__ZSt10unexpectedv"] = createExportWrapper("_ZSt10unexpectedv");

/** @type {function(...*):?} */
var __ZSt13get_terminatev = Module["__ZSt13get_terminatev"] = createExportWrapper("_ZSt13get_terminatev");

/** @type {function(...*):?} */
var __ZSt9terminatev = Module["__ZSt9terminatev"] = createExportWrapper("_ZSt9terminatev");

/** @type {function(...*):?} */
var ___cxa_pure_virtual = Module["___cxa_pure_virtual"] = createExportWrapper("__cxa_pure_virtual");

/** @type {function(...*):?} */
var ___cxa_deleted_virtual = Module["___cxa_deleted_virtual"] = createExportWrapper("__cxa_deleted_virtual");

/** @type {function(...*):?} */
var ___dynamic_cast = Module["___dynamic_cast"] = createExportWrapper("__dynamic_cast");

/** @type {function(...*):?} */
var __ZNSt9type_infoD2Ev = Module["__ZNSt9type_infoD2Ev"] = createExportWrapper("_ZNSt9type_infoD2Ev");

/** @type {function(...*):?} */
var ___cxa_can_catch = Module["___cxa_can_catch"] = createExportWrapper("__cxa_can_catch");

/** @type {function(...*):?} */
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = createExportWrapper("__cxa_is_pointer_type");

/** @type {function(...*):?} */
var __ZNSt9exceptionD2Ev = Module["__ZNSt9exceptionD2Ev"] = createExportWrapper("_ZNSt9exceptionD2Ev");

/** @type {function(...*):?} */
var __ZNSt9exceptionD0Ev = Module["__ZNSt9exceptionD0Ev"] = createExportWrapper("_ZNSt9exceptionD0Ev");

/** @type {function(...*):?} */
var __ZNSt9exceptionD1Ev = Module["__ZNSt9exceptionD1Ev"] = createExportWrapper("_ZNSt9exceptionD1Ev");

/** @type {function(...*):?} */
var __ZNKSt9exception4whatEv = Module["__ZNKSt9exception4whatEv"] = createExportWrapper("_ZNKSt9exception4whatEv");

/** @type {function(...*):?} */
var __ZNSt13bad_exceptionD0Ev = Module["__ZNSt13bad_exceptionD0Ev"] = createExportWrapper("_ZNSt13bad_exceptionD0Ev");

/** @type {function(...*):?} */
var __ZNSt13bad_exceptionD1Ev = Module["__ZNSt13bad_exceptionD1Ev"] = createExportWrapper("_ZNSt13bad_exceptionD1Ev");

/** @type {function(...*):?} */
var __ZNKSt13bad_exception4whatEv = Module["__ZNKSt13bad_exception4whatEv"] = createExportWrapper("_ZNKSt13bad_exception4whatEv");

/** @type {function(...*):?} */
var __ZNSt9bad_allocC2Ev = Module["__ZNSt9bad_allocC2Ev"] = createExportWrapper("_ZNSt9bad_allocC2Ev");

/** @type {function(...*):?} */
var __ZNSt9bad_allocD0Ev = Module["__ZNSt9bad_allocD0Ev"] = createExportWrapper("_ZNSt9bad_allocD0Ev");

/** @type {function(...*):?} */
var __ZNSt9bad_allocD1Ev = Module["__ZNSt9bad_allocD1Ev"] = createExportWrapper("_ZNSt9bad_allocD1Ev");

/** @type {function(...*):?} */
var __ZNKSt9bad_alloc4whatEv = Module["__ZNKSt9bad_alloc4whatEv"] = createExportWrapper("_ZNKSt9bad_alloc4whatEv");

/** @type {function(...*):?} */
var __ZNSt20bad_array_new_lengthC2Ev = Module["__ZNSt20bad_array_new_lengthC2Ev"] = createExportWrapper("_ZNSt20bad_array_new_lengthC2Ev");

/** @type {function(...*):?} */
var __ZNSt20bad_array_new_lengthD0Ev = Module["__ZNSt20bad_array_new_lengthD0Ev"] = createExportWrapper("_ZNSt20bad_array_new_lengthD0Ev");

/** @type {function(...*):?} */
var __ZNKSt20bad_array_new_length4whatEv = Module["__ZNKSt20bad_array_new_length4whatEv"] = createExportWrapper("_ZNKSt20bad_array_new_length4whatEv");

/** @type {function(...*):?} */
var __ZNSt13bad_exceptionD2Ev = Module["__ZNSt13bad_exceptionD2Ev"] = createExportWrapper("_ZNSt13bad_exceptionD2Ev");

/** @type {function(...*):?} */
var __ZNSt9bad_allocC1Ev = Module["__ZNSt9bad_allocC1Ev"] = createExportWrapper("_ZNSt9bad_allocC1Ev");

/** @type {function(...*):?} */
var __ZNSt9bad_allocD2Ev = Module["__ZNSt9bad_allocD2Ev"] = createExportWrapper("_ZNSt9bad_allocD2Ev");

/** @type {function(...*):?} */
var __ZNSt20bad_array_new_lengthD2Ev = Module["__ZNSt20bad_array_new_lengthD2Ev"] = createExportWrapper("_ZNSt20bad_array_new_lengthD2Ev");

/** @type {function(...*):?} */
var __ZNSt11logic_errorD2Ev = Module["__ZNSt11logic_errorD2Ev"] = createExportWrapper("_ZNSt11logic_errorD2Ev");

/** @type {function(...*):?} */
var __ZNSt11logic_errorD0Ev = Module["__ZNSt11logic_errorD0Ev"] = createExportWrapper("_ZNSt11logic_errorD0Ev");

/** @type {function(...*):?} */
var __ZNSt11logic_errorD1Ev = Module["__ZNSt11logic_errorD1Ev"] = createExportWrapper("_ZNSt11logic_errorD1Ev");

/** @type {function(...*):?} */
var __ZNKSt11logic_error4whatEv = Module["__ZNKSt11logic_error4whatEv"] = createExportWrapper("_ZNKSt11logic_error4whatEv");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorD2Ev = Module["__ZNSt13runtime_errorD2Ev"] = createExportWrapper("_ZNSt13runtime_errorD2Ev");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorD0Ev = Module["__ZNSt13runtime_errorD0Ev"] = createExportWrapper("_ZNSt13runtime_errorD0Ev");

/** @type {function(...*):?} */
var __ZNSt13runtime_errorD1Ev = Module["__ZNSt13runtime_errorD1Ev"] = createExportWrapper("_ZNSt13runtime_errorD1Ev");

/** @type {function(...*):?} */
var __ZNKSt13runtime_error4whatEv = Module["__ZNKSt13runtime_error4whatEv"] = createExportWrapper("_ZNKSt13runtime_error4whatEv");

/** @type {function(...*):?} */
var __ZNSt12domain_errorD0Ev = Module["__ZNSt12domain_errorD0Ev"] = createExportWrapper("_ZNSt12domain_errorD0Ev");

/** @type {function(...*):?} */
var __ZNSt12domain_errorD1Ev = Module["__ZNSt12domain_errorD1Ev"] = createExportWrapper("_ZNSt12domain_errorD1Ev");

/** @type {function(...*):?} */
var __ZNSt16invalid_argumentD0Ev = Module["__ZNSt16invalid_argumentD0Ev"] = createExportWrapper("_ZNSt16invalid_argumentD0Ev");

/** @type {function(...*):?} */
var __ZNSt16invalid_argumentD1Ev = Module["__ZNSt16invalid_argumentD1Ev"] = createExportWrapper("_ZNSt16invalid_argumentD1Ev");

/** @type {function(...*):?} */
var __ZNSt12length_errorD0Ev = Module["__ZNSt12length_errorD0Ev"] = createExportWrapper("_ZNSt12length_errorD0Ev");

/** @type {function(...*):?} */
var __ZNSt12out_of_rangeD0Ev = Module["__ZNSt12out_of_rangeD0Ev"] = createExportWrapper("_ZNSt12out_of_rangeD0Ev");

/** @type {function(...*):?} */
var __ZNSt12out_of_rangeD1Ev = Module["__ZNSt12out_of_rangeD1Ev"] = createExportWrapper("_ZNSt12out_of_rangeD1Ev");

/** @type {function(...*):?} */
var __ZNSt11range_errorD0Ev = Module["__ZNSt11range_errorD0Ev"] = createExportWrapper("_ZNSt11range_errorD0Ev");

/** @type {function(...*):?} */
var __ZNSt11range_errorD1Ev = Module["__ZNSt11range_errorD1Ev"] = createExportWrapper("_ZNSt11range_errorD1Ev");

/** @type {function(...*):?} */
var __ZNSt14overflow_errorD0Ev = Module["__ZNSt14overflow_errorD0Ev"] = createExportWrapper("_ZNSt14overflow_errorD0Ev");

/** @type {function(...*):?} */
var __ZNSt14overflow_errorD1Ev = Module["__ZNSt14overflow_errorD1Ev"] = createExportWrapper("_ZNSt14overflow_errorD1Ev");

/** @type {function(...*):?} */
var __ZNSt15underflow_errorD0Ev = Module["__ZNSt15underflow_errorD0Ev"] = createExportWrapper("_ZNSt15underflow_errorD0Ev");

/** @type {function(...*):?} */
var __ZNSt15underflow_errorD1Ev = Module["__ZNSt15underflow_errorD1Ev"] = createExportWrapper("_ZNSt15underflow_errorD1Ev");

/** @type {function(...*):?} */
var __ZNSt12domain_errorD2Ev = Module["__ZNSt12domain_errorD2Ev"] = createExportWrapper("_ZNSt12domain_errorD2Ev");

/** @type {function(...*):?} */
var __ZNSt16invalid_argumentD2Ev = Module["__ZNSt16invalid_argumentD2Ev"] = createExportWrapper("_ZNSt16invalid_argumentD2Ev");

/** @type {function(...*):?} */
var __ZNSt12length_errorD2Ev = Module["__ZNSt12length_errorD2Ev"] = createExportWrapper("_ZNSt12length_errorD2Ev");

/** @type {function(...*):?} */
var __ZNSt12out_of_rangeD2Ev = Module["__ZNSt12out_of_rangeD2Ev"] = createExportWrapper("_ZNSt12out_of_rangeD2Ev");

/** @type {function(...*):?} */
var __ZNSt11range_errorD2Ev = Module["__ZNSt11range_errorD2Ev"] = createExportWrapper("_ZNSt11range_errorD2Ev");

/** @type {function(...*):?} */
var __ZNSt14overflow_errorD2Ev = Module["__ZNSt14overflow_errorD2Ev"] = createExportWrapper("_ZNSt14overflow_errorD2Ev");

/** @type {function(...*):?} */
var __ZNSt15underflow_errorD2Ev = Module["__ZNSt15underflow_errorD2Ev"] = createExportWrapper("_ZNSt15underflow_errorD2Ev");

/** @type {function(...*):?} */
var __ZNSt9type_infoD0Ev = Module["__ZNSt9type_infoD0Ev"] = createExportWrapper("_ZNSt9type_infoD0Ev");

/** @type {function(...*):?} */
var __ZNSt9type_infoD1Ev = Module["__ZNSt9type_infoD1Ev"] = createExportWrapper("_ZNSt9type_infoD1Ev");

/** @type {function(...*):?} */
var __ZNSt8bad_castC2Ev = Module["__ZNSt8bad_castC2Ev"] = createExportWrapper("_ZNSt8bad_castC2Ev");

/** @type {function(...*):?} */
var __ZNSt8bad_castD2Ev = Module["__ZNSt8bad_castD2Ev"] = createExportWrapper("_ZNSt8bad_castD2Ev");

/** @type {function(...*):?} */
var __ZNSt8bad_castD0Ev = Module["__ZNSt8bad_castD0Ev"] = createExportWrapper("_ZNSt8bad_castD0Ev");

/** @type {function(...*):?} */
var __ZNSt8bad_castD1Ev = Module["__ZNSt8bad_castD1Ev"] = createExportWrapper("_ZNSt8bad_castD1Ev");

/** @type {function(...*):?} */
var __ZNKSt8bad_cast4whatEv = Module["__ZNKSt8bad_cast4whatEv"] = createExportWrapper("_ZNKSt8bad_cast4whatEv");

/** @type {function(...*):?} */
var __ZNSt10bad_typeidC2Ev = Module["__ZNSt10bad_typeidC2Ev"] = createExportWrapper("_ZNSt10bad_typeidC2Ev");

/** @type {function(...*):?} */
var __ZNSt10bad_typeidD2Ev = Module["__ZNSt10bad_typeidD2Ev"] = createExportWrapper("_ZNSt10bad_typeidD2Ev");

/** @type {function(...*):?} */
var __ZNSt10bad_typeidD0Ev = Module["__ZNSt10bad_typeidD0Ev"] = createExportWrapper("_ZNSt10bad_typeidD0Ev");

/** @type {function(...*):?} */
var __ZNSt10bad_typeidD1Ev = Module["__ZNSt10bad_typeidD1Ev"] = createExportWrapper("_ZNSt10bad_typeidD1Ev");

/** @type {function(...*):?} */
var __ZNKSt10bad_typeid4whatEv = Module["__ZNKSt10bad_typeid4whatEv"] = createExportWrapper("_ZNKSt10bad_typeid4whatEv");

/** @type {function(...*):?} */
var __ZNSt8bad_castC1Ev = Module["__ZNSt8bad_castC1Ev"] = createExportWrapper("_ZNSt8bad_castC1Ev");

/** @type {function(...*):?} */
var __ZNSt10bad_typeidC1Ev = Module["__ZNSt10bad_typeidC1Ev"] = createExportWrapper("_ZNSt10bad_typeidC1Ev");

/** @type {function(...*):?} */
var dynCall_v = Module["dynCall_v"] = createExportWrapper("dynCall_v");

/** @type {function(...*):?} */
var dynCall_ii = Module["dynCall_ii"] = createExportWrapper("dynCall_ii");

/** @type {function(...*):?} */
var dynCall_vii = Module["dynCall_vii"] = createExportWrapper("dynCall_vii");

/** @type {function(...*):?} */
var dynCall_viii = Module["dynCall_viii"] = createExportWrapper("dynCall_viii");

/** @type {function(...*):?} */
var dynCall_vi = Module["dynCall_vi"] = createExportWrapper("dynCall_vi");

/** @type {function(...*):?} */
var dynCall_i = Module["dynCall_i"] = createExportWrapper("dynCall_i");

/** @type {function(...*):?} */
var dynCall_iiii = Module["dynCall_iiii"] = createExportWrapper("dynCall_iiii");

/** @type {function(...*):?} */
var dynCall_iii = Module["dynCall_iii"] = createExportWrapper("dynCall_iii");

/** @type {function(...*):?} */
var dynCall_viiii = Module["dynCall_viiii"] = createExportWrapper("dynCall_viiii");

/** @type {function(...*):?} */
var dynCall_iiiii = Module["dynCall_iiiii"] = createExportWrapper("dynCall_iiiii");

/** @type {function(...*):?} */
var dynCall_jiji = Module["dynCall_jiji"] = createExportWrapper("dynCall_jiji");

/** @type {function(...*):?} */
var dynCall_iidiiii = Module["dynCall_iidiiii"] = createExportWrapper("dynCall_iidiiii");

/** @type {function(...*):?} */
var dynCall_viiiiii = Module["dynCall_viiiiii"] = createExportWrapper("dynCall_viiiiii");

/** @type {function(...*):?} */
var dynCall_viiiii = Module["dynCall_viiiii"] = createExportWrapper("dynCall_viiiii");

/** @type {function(...*):?} */
var _asyncify_start_unwind = Module["_asyncify_start_unwind"] = createExportWrapper("asyncify_start_unwind");

/** @type {function(...*):?} */
var _asyncify_stop_unwind = Module["_asyncify_stop_unwind"] = createExportWrapper("asyncify_stop_unwind");

/** @type {function(...*):?} */
var _asyncify_start_rewind = Module["_asyncify_start_rewind"] = createExportWrapper("asyncify_start_rewind");

/** @type {function(...*):?} */
var _asyncify_stop_rewind = Module["_asyncify_stop_rewind"] = createExportWrapper("asyncify_stop_rewind");

var __ZN20__em_asm_sig_builderI19__em_asm_type_tupleIJPcEEE6bufferE = Module['__ZN20__em_asm_sig_builderI19__em_asm_type_tupleIJPcEEE6bufferE'] = 5242880;
var __ZTISt12length_error = Module['__ZTISt12length_error'] = 5282684;
var __ZTVSt12length_error = Module['__ZTVSt12length_error'] = 5282644;
var __ZTISt20bad_array_new_length = Module['__ZTISt20bad_array_new_length'] = 5282456;
var __ZTINSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE = Module['__ZTINSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE'] = 5254504;
var __ZTIPNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE = Module['__ZTIPNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE'] = 5254600;
var __ZTIPKNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE = Module['__ZTIPKNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE'] = 5254704;
var __ZZN10emscripten8internal19getGenericSignatureIJiiEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJiiEEEPKcvE9signature'] = 5254720;
var __ZZN10emscripten8internal19getGenericSignatureIJvEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJvEEEPKcvE9signature'] = 5254723;
var __ZZN10emscripten8internal19getGenericSignatureIJviEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJviEEEPKcvE9signature'] = 5254725;
var __ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEvE5types = Module['__ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEvE5types'] = 5254728;
var __ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEERKSB_EEEE3getEvE5types = Module['__ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEERKSB_EEEE3getEvE5types'] = 5254732;
var __ZZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcvE9signature'] = 5254816;
var __ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEmRKSB_EEEE3getEvE5types = Module['__ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEmRKSB_EEEE3getEvE5types'] = 5254832;
var __ZZN10emscripten8internal19getGenericSignatureIJviiiiEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJviiiiEEEPKcvE9signature'] = 5254848;
var __ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEvE5types = Module['__ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJmNS0_17AllowedRawPointerIKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEEEEEEE3getEvE5types'] = 5254856;
var __ZZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcvE9signature'] = 5254864;
var __ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS_3valERKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmEEEE3getEvE5types = Module['__ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS_3valERKNSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEmEEEE3getEvE5types'] = 5254868;
var __ZZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcvE9signature'] = 5254908;
var __ZTINSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEE = Module['__ZTINSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEE'] = 5254808;
var __ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbRNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmRKSA_EEEE3getEvE5types = Module['__ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbRNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEmRKSA_EEEE3getEvE5types'] = 5254928;
var __ZZN10emscripten8internal19getGenericSignatureIJiiiiiEEEPKcvE9signature = Module['__ZZN10emscripten8internal19getGenericSignatureIJiiiiiEEEPKcvE9signature'] = 5254944;
var __ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJiRKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEEE3getEvE5types = Module['__ZZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJiRKNSt3__26vectorINS3_12basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEENS8_ISA_EEEEEEEE3getEvE5types'] = 5254952;
var _rl_readline_name = Module['_rl_readline_name'] = 5283840;
var __ZTSNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE = Module['__ZTSNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE'] = 5254415;
var __ZTVN10__cxxabiv117__class_type_infoE = Module['__ZTVN10__cxxabiv117__class_type_infoE'] = 5281956;
var __ZTSPNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE = Module['__ZTSPNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE'] = 5254512;
var __ZTVN10__cxxabiv119__pointer_type_infoE = Module['__ZTVN10__cxxabiv119__pointer_type_infoE'] = 5282208;
var __ZTSPKNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE = Module['__ZTSPKNSt3__26vectorINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEENS4_IS6_EEEE'] = 5254616;
var __ZTIv = Module['__ZTIv'] = 5280460;
var __ZTSNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEE = Module['__ZTSNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEE'] = 5254744;
var __ZTIm = Module['__ZTIm'] = 5281088;
var __ZTIN10emscripten3valE = Module['__ZTIN10emscripten3valE'] = 5254900;
var __ZTSN10emscripten3valE = Module['__ZTSN10emscripten3valE'] = 5254880;
var __ZTIb = Module['__ZTIb'] = 5280568;
var __ZTIi = Module['__ZTIi'] = 5280932;
var _lua_ident = Module['_lua_ident'] = 5256416;
var _luai_ctype_ = Module['_luai_ctype_'] = 5255472;
var _luaP_opmodes = Module['_luaP_opmodes'] = 5256208;
var _luaT_typenames_ = Module['_luaT_typenames_'] = 5254976;
var ___THREW__ = Module['___THREW__'] = 5296664;
var ___threwValue = Module['___threwValue'] = 5296668;
var _stdin = Module['_stdin'] = 5275084;
var _stdout = Module['_stdout'] = 5275088;
var _stderr = Module['_stderr'] = 5275080;
var __ZTIc = Module['__ZTIc'] = 5280672;
var __ZTIa = Module['__ZTIa'] = 5280776;
var __ZTIh = Module['__ZTIh'] = 5280724;
var __ZTIs = Module['__ZTIs'] = 5280828;
var __ZTIt = Module['__ZTIt'] = 5280880;
var __ZTIj = Module['__ZTIj'] = 5280984;
var __ZTIl = Module['__ZTIl'] = 5281036;
var __ZTIx = Module['__ZTIx'] = 5281140;
var __ZTIy = Module['__ZTIy'] = 5281192;
var __ZTIf = Module['__ZTIf'] = 5281404;
var __ZTId = Module['__ZTId'] = 5281456;
var __ZTINSt3__212basic_stringIhNS_11char_traitsIhEENS_9allocatorIhEEEE = Module['__ZTINSt3__212basic_stringIhNS_11char_traitsIhEENS_9allocatorIhEEEE'] = 5258388;
var __ZTINSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEE = Module['__ZTINSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEE'] = 5258460;
var __ZTINSt3__212basic_stringIDsNS_11char_traitsIDsEENS_9allocatorIDsEEEE = Module['__ZTINSt3__212basic_stringIDsNS_11char_traitsIDsEENS_9allocatorIDsEEEE'] = 5258536;
var __ZTINSt3__212basic_stringIDiNS_11char_traitsIDiEENS_9allocatorIDiEEEE = Module['__ZTINSt3__212basic_stringIDiNS_11char_traitsIDiEENS_9allocatorIDiEEEE'] = 5258612;
var __ZTIN10emscripten11memory_viewIcEE = Module['__ZTIN10emscripten11memory_viewIcEE'] = 5258652;
var __ZTIN10emscripten11memory_viewIaEE = Module['__ZTIN10emscripten11memory_viewIaEE'] = 5258692;
var __ZTIN10emscripten11memory_viewIhEE = Module['__ZTIN10emscripten11memory_viewIhEE'] = 5258732;
var __ZTIN10emscripten11memory_viewIsEE = Module['__ZTIN10emscripten11memory_viewIsEE'] = 5258772;
var __ZTIN10emscripten11memory_viewItEE = Module['__ZTIN10emscripten11memory_viewItEE'] = 5258812;
var __ZTIN10emscripten11memory_viewIiEE = Module['__ZTIN10emscripten11memory_viewIiEE'] = 5258852;
var __ZTIN10emscripten11memory_viewIjEE = Module['__ZTIN10emscripten11memory_viewIjEE'] = 5258892;
var __ZTIN10emscripten11memory_viewIlEE = Module['__ZTIN10emscripten11memory_viewIlEE'] = 5258932;
var __ZTIN10emscripten11memory_viewImEE = Module['__ZTIN10emscripten11memory_viewImEE'] = 5258972;
var __ZTIN10emscripten11memory_viewIfEE = Module['__ZTIN10emscripten11memory_viewIfEE'] = 5259012;
var __ZTIN10emscripten11memory_viewIdEE = Module['__ZTIN10emscripten11memory_viewIdEE'] = 5259052;
var __ZTSNSt3__212basic_stringIhNS_11char_traitsIhEENS_9allocatorIhEEEE = Module['__ZTSNSt3__212basic_stringIhNS_11char_traitsIhEENS_9allocatorIhEEEE'] = 5258324;
var __ZTSNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEE = Module['__ZTSNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEE'] = 5258396;
var __ZTSNSt3__212basic_stringIDsNS_11char_traitsIDsEENS_9allocatorIDsEEEE = Module['__ZTSNSt3__212basic_stringIDsNS_11char_traitsIDsEENS_9allocatorIDsEEEE'] = 5258468;
var __ZTSNSt3__212basic_stringIDiNS_11char_traitsIDiEENS_9allocatorIDiEEEE = Module['__ZTSNSt3__212basic_stringIDiNS_11char_traitsIDiEENS_9allocatorIDiEEEE'] = 5258544;
var __ZTSN10emscripten11memory_viewIcEE = Module['__ZTSN10emscripten11memory_viewIcEE'] = 5258620;
var __ZTSN10emscripten11memory_viewIaEE = Module['__ZTSN10emscripten11memory_viewIaEE'] = 5258660;
var __ZTSN10emscripten11memory_viewIhEE = Module['__ZTSN10emscripten11memory_viewIhEE'] = 5258700;
var __ZTSN10emscripten11memory_viewIsEE = Module['__ZTSN10emscripten11memory_viewIsEE'] = 5258740;
var __ZTSN10emscripten11memory_viewItEE = Module['__ZTSN10emscripten11memory_viewItEE'] = 5258780;
var __ZTSN10emscripten11memory_viewIiEE = Module['__ZTSN10emscripten11memory_viewIiEE'] = 5258820;
var __ZTSN10emscripten11memory_viewIjEE = Module['__ZTSN10emscripten11memory_viewIjEE'] = 5258860;
var __ZTSN10emscripten11memory_viewIlEE = Module['__ZTSN10emscripten11memory_viewIlEE'] = 5258900;
var __ZTSN10emscripten11memory_viewImEE = Module['__ZTSN10emscripten11memory_viewImEE'] = 5258940;
var __ZTSN10emscripten11memory_viewIfEE = Module['__ZTSN10emscripten11memory_viewIfEE'] = 5258980;
var __ZTSN10emscripten11memory_viewIdEE = Module['__ZTSN10emscripten11memory_viewIdEE'] = 5259020;
var ___environ = Module['___environ'] = 5283980;
var ____environ = Module['____environ'] = 5283980;
var __environ = Module['__environ'] = 5283980;
var _environ = Module['_environ'] = 5283980;
var _timezone = Module['_timezone'] = 5283924;
var _daylight = Module['_daylight'] = 5283928;
var _tzname = Module['_tzname'] = 5283932;
var ___sig_actions = Module['___sig_actions'] = 5284976;
var __ZNSt3__26__itoa7__tableIvE10__pow10_32E = Module['__ZNSt3__26__itoa7__tableIvE10__pow10_32E'] = 5279616;
var __ZNSt3__26__itoa7__tableIvE16__digits_base_10E = Module['__ZNSt3__26__itoa7__tableIvE16__digits_base_10E'] = 5279664;
var __ZSt7nothrow = Module['__ZSt7nothrow'] = 5278480;
var __ZTVSt11logic_error = Module['__ZTVSt11logic_error'] = 5282468;
var __ZTVSt9exception = Module['__ZTVSt9exception'] = 5282304;
var __ZTVSt13runtime_error = Module['__ZTVSt13runtime_error'] = 5282488;
var __ZNSt3__26__itoa7__tableIvE10__pow10_64E = Module['__ZNSt3__26__itoa7__tableIvE10__pow10_64E'] = 5279872;
var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4nposE = Module['__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4nposE'] = 5279580;
var __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4nposE = Module['__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE4nposE'] = 5279584;
var ___cxa_unexpected_handler = Module['___cxa_unexpected_handler'] = 5283524;
var ___cxa_terminate_handler = Module['___cxa_terminate_handler'] = 5283520;
var ___cxa_new_handler = Module['___cxa_new_handler'] = 5296676;
var __ZTIN10__cxxabiv116__shim_type_infoE = Module['__ZTIN10__cxxabiv116__shim_type_infoE'] = 5280068;
var __ZTIN10__cxxabiv117__class_type_infoE = Module['__ZTIN10__cxxabiv117__class_type_infoE'] = 5280116;
var __ZTIN10__cxxabiv117__pbase_type_infoE = Module['__ZTIN10__cxxabiv117__pbase_type_infoE'] = 5280164;
var __ZTIDn = Module['__ZTIDn'] = 5280512;
var __ZTIN10__cxxabiv119__pointer_type_infoE = Module['__ZTIN10__cxxabiv119__pointer_type_infoE'] = 5280212;
var __ZTIN10__cxxabiv120__function_type_infoE = Module['__ZTIN10__cxxabiv120__function_type_infoE'] = 5280264;
var __ZTIN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTIN10__cxxabiv129__pointer_to_member_type_infoE'] = 5280324;
var __ZTSN10__cxxabiv116__shim_type_infoE = Module['__ZTSN10__cxxabiv116__shim_type_infoE'] = 5280032;
var __ZTVN10__cxxabiv120__si_class_type_infoE = Module['__ZTVN10__cxxabiv120__si_class_type_infoE'] = 5281996;
var __ZTISt9type_info = Module['__ZTISt9type_info'] = 5283004;
var __ZTSN10__cxxabiv117__class_type_infoE = Module['__ZTSN10__cxxabiv117__class_type_infoE'] = 5280080;
var __ZTSN10__cxxabiv117__pbase_type_infoE = Module['__ZTSN10__cxxabiv117__pbase_type_infoE'] = 5280128;
var __ZTSN10__cxxabiv119__pointer_type_infoE = Module['__ZTSN10__cxxabiv119__pointer_type_infoE'] = 5280176;
var __ZTSN10__cxxabiv120__function_type_infoE = Module['__ZTSN10__cxxabiv120__function_type_infoE'] = 5280224;
var __ZTSN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTSN10__cxxabiv129__pointer_to_member_type_infoE'] = 5280276;
var __ZTVN10__cxxabiv116__shim_type_infoE = Module['__ZTVN10__cxxabiv116__shim_type_infoE'] = 5280348;
var __ZTVN10__cxxabiv123__fundamental_type_infoE = Module['__ZTVN10__cxxabiv123__fundamental_type_infoE'] = 5280376;
var __ZTIN10__cxxabiv123__fundamental_type_infoE = Module['__ZTIN10__cxxabiv123__fundamental_type_infoE'] = 5280444;
var __ZTSN10__cxxabiv123__fundamental_type_infoE = Module['__ZTSN10__cxxabiv123__fundamental_type_infoE'] = 5280404;
var __ZTSv = Module['__ZTSv'] = 5280456;
var __ZTSPv = Module['__ZTSPv'] = 5280468;
var __ZTIPv = Module['__ZTIPv'] = 5280472;
var __ZTSPKv = Module['__ZTSPKv'] = 5280488;
var __ZTIPKv = Module['__ZTIPKv'] = 5280492;
var __ZTSDn = Module['__ZTSDn'] = 5280508;
var __ZTSPDn = Module['__ZTSPDn'] = 5280520;
var __ZTIPDn = Module['__ZTIPDn'] = 5280524;
var __ZTSPKDn = Module['__ZTSPKDn'] = 5280540;
var __ZTIPKDn = Module['__ZTIPKDn'] = 5280548;
var __ZTSb = Module['__ZTSb'] = 5280564;
var __ZTSPb = Module['__ZTSPb'] = 5280576;
var __ZTIPb = Module['__ZTIPb'] = 5280580;
var __ZTSPKb = Module['__ZTSPKb'] = 5280596;
var __ZTIPKb = Module['__ZTIPKb'] = 5280600;
var __ZTSw = Module['__ZTSw'] = 5280616;
var __ZTIw = Module['__ZTIw'] = 5280620;
var __ZTSPw = Module['__ZTSPw'] = 5280628;
var __ZTIPw = Module['__ZTIPw'] = 5280632;
var __ZTSPKw = Module['__ZTSPKw'] = 5280648;
var __ZTIPKw = Module['__ZTIPKw'] = 5280652;
var __ZTSc = Module['__ZTSc'] = 5280668;
var __ZTSPc = Module['__ZTSPc'] = 5280680;
var __ZTIPc = Module['__ZTIPc'] = 5280684;
var __ZTSPKc = Module['__ZTSPKc'] = 5280700;
var __ZTIPKc = Module['__ZTIPKc'] = 5280704;
var __ZTSh = Module['__ZTSh'] = 5280720;
var __ZTSPh = Module['__ZTSPh'] = 5280732;
var __ZTIPh = Module['__ZTIPh'] = 5280736;
var __ZTSPKh = Module['__ZTSPKh'] = 5280752;
var __ZTIPKh = Module['__ZTIPKh'] = 5280756;
var __ZTSa = Module['__ZTSa'] = 5280772;
var __ZTSPa = Module['__ZTSPa'] = 5280784;
var __ZTIPa = Module['__ZTIPa'] = 5280788;
var __ZTSPKa = Module['__ZTSPKa'] = 5280804;
var __ZTIPKa = Module['__ZTIPKa'] = 5280808;
var __ZTSs = Module['__ZTSs'] = 5280824;
var __ZTSPs = Module['__ZTSPs'] = 5280836;
var __ZTIPs = Module['__ZTIPs'] = 5280840;
var __ZTSPKs = Module['__ZTSPKs'] = 5280856;
var __ZTIPKs = Module['__ZTIPKs'] = 5280860;
var __ZTSt = Module['__ZTSt'] = 5280876;
var __ZTSPt = Module['__ZTSPt'] = 5280888;
var __ZTIPt = Module['__ZTIPt'] = 5280892;
var __ZTSPKt = Module['__ZTSPKt'] = 5280908;
var __ZTIPKt = Module['__ZTIPKt'] = 5280912;
var __ZTSi = Module['__ZTSi'] = 5280928;
var __ZTSPi = Module['__ZTSPi'] = 5280940;
var __ZTIPi = Module['__ZTIPi'] = 5280944;
var __ZTSPKi = Module['__ZTSPKi'] = 5280960;
var __ZTIPKi = Module['__ZTIPKi'] = 5280964;
var __ZTSj = Module['__ZTSj'] = 5280980;
var __ZTSPj = Module['__ZTSPj'] = 5280992;
var __ZTIPj = Module['__ZTIPj'] = 5280996;
var __ZTSPKj = Module['__ZTSPKj'] = 5281012;
var __ZTIPKj = Module['__ZTIPKj'] = 5281016;
var __ZTSl = Module['__ZTSl'] = 5281032;
var __ZTSPl = Module['__ZTSPl'] = 5281044;
var __ZTIPl = Module['__ZTIPl'] = 5281048;
var __ZTSPKl = Module['__ZTSPKl'] = 5281064;
var __ZTIPKl = Module['__ZTIPKl'] = 5281068;
var __ZTSm = Module['__ZTSm'] = 5281084;
var __ZTSPm = Module['__ZTSPm'] = 5281096;
var __ZTIPm = Module['__ZTIPm'] = 5281100;
var __ZTSPKm = Module['__ZTSPKm'] = 5281116;
var __ZTIPKm = Module['__ZTIPKm'] = 5281120;
var __ZTSx = Module['__ZTSx'] = 5281136;
var __ZTSPx = Module['__ZTSPx'] = 5281148;
var __ZTIPx = Module['__ZTIPx'] = 5281152;
var __ZTSPKx = Module['__ZTSPKx'] = 5281168;
var __ZTIPKx = Module['__ZTIPKx'] = 5281172;
var __ZTSy = Module['__ZTSy'] = 5281188;
var __ZTSPy = Module['__ZTSPy'] = 5281200;
var __ZTIPy = Module['__ZTIPy'] = 5281204;
var __ZTSPKy = Module['__ZTSPKy'] = 5281220;
var __ZTIPKy = Module['__ZTIPKy'] = 5281224;
var __ZTSn = Module['__ZTSn'] = 5281240;
var __ZTIn = Module['__ZTIn'] = 5281244;
var __ZTSPn = Module['__ZTSPn'] = 5281252;
var __ZTIPn = Module['__ZTIPn'] = 5281256;
var __ZTSPKn = Module['__ZTSPKn'] = 5281272;
var __ZTIPKn = Module['__ZTIPKn'] = 5281276;
var __ZTSo = Module['__ZTSo'] = 5281292;
var __ZTIo = Module['__ZTIo'] = 5281296;
var __ZTSPo = Module['__ZTSPo'] = 5281304;
var __ZTIPo = Module['__ZTIPo'] = 5281308;
var __ZTSPKo = Module['__ZTSPKo'] = 5281324;
var __ZTIPKo = Module['__ZTIPKo'] = 5281328;
var __ZTSDh = Module['__ZTSDh'] = 5281344;
var __ZTIDh = Module['__ZTIDh'] = 5281348;
var __ZTSPDh = Module['__ZTSPDh'] = 5281356;
var __ZTIPDh = Module['__ZTIPDh'] = 5281360;
var __ZTSPKDh = Module['__ZTSPKDh'] = 5281376;
var __ZTIPKDh = Module['__ZTIPKDh'] = 5281384;
var __ZTSf = Module['__ZTSf'] = 5281400;
var __ZTSPf = Module['__ZTSPf'] = 5281412;
var __ZTIPf = Module['__ZTIPf'] = 5281416;
var __ZTSPKf = Module['__ZTSPKf'] = 5281432;
var __ZTIPKf = Module['__ZTIPKf'] = 5281436;
var __ZTSd = Module['__ZTSd'] = 5281452;
var __ZTSPd = Module['__ZTSPd'] = 5281464;
var __ZTIPd = Module['__ZTIPd'] = 5281468;
var __ZTSPKd = Module['__ZTSPKd'] = 5281484;
var __ZTIPKd = Module['__ZTIPKd'] = 5281488;
var __ZTSe = Module['__ZTSe'] = 5281504;
var __ZTIe = Module['__ZTIe'] = 5281508;
var __ZTSPe = Module['__ZTSPe'] = 5281516;
var __ZTIPe = Module['__ZTIPe'] = 5281520;
var __ZTSPKe = Module['__ZTSPKe'] = 5281536;
var __ZTIPKe = Module['__ZTIPKe'] = 5281540;
var __ZTSg = Module['__ZTSg'] = 5281556;
var __ZTIg = Module['__ZTIg'] = 5281560;
var __ZTSPg = Module['__ZTSPg'] = 5281568;
var __ZTIPg = Module['__ZTIPg'] = 5281572;
var __ZTSPKg = Module['__ZTSPKg'] = 5281588;
var __ZTIPKg = Module['__ZTIPKg'] = 5281592;
var __ZTSDu = Module['__ZTSDu'] = 5281608;
var __ZTIDu = Module['__ZTIDu'] = 5281612;
var __ZTSPDu = Module['__ZTSPDu'] = 5281620;
var __ZTIPDu = Module['__ZTIPDu'] = 5281624;
var __ZTSPKDu = Module['__ZTSPKDu'] = 5281640;
var __ZTIPKDu = Module['__ZTIPKDu'] = 5281648;
var __ZTSDs = Module['__ZTSDs'] = 5281664;
var __ZTIDs = Module['__ZTIDs'] = 5281668;
var __ZTSPDs = Module['__ZTSPDs'] = 5281676;
var __ZTIPDs = Module['__ZTIPDs'] = 5281680;
var __ZTSPKDs = Module['__ZTSPKDs'] = 5281696;
var __ZTIPKDs = Module['__ZTIPKDs'] = 5281704;
var __ZTSDi = Module['__ZTSDi'] = 5281720;
var __ZTIDi = Module['__ZTIDi'] = 5281724;
var __ZTSPDi = Module['__ZTSPDi'] = 5281732;
var __ZTIPDi = Module['__ZTIPDi'] = 5281736;
var __ZTSPKDi = Module['__ZTSPKDi'] = 5281752;
var __ZTIPKDi = Module['__ZTIPKDi'] = 5281760;
var __ZTVN10__cxxabiv117__array_type_infoE = Module['__ZTVN10__cxxabiv117__array_type_infoE'] = 5281776;
var __ZTIN10__cxxabiv117__array_type_infoE = Module['__ZTIN10__cxxabiv117__array_type_infoE'] = 5281840;
var __ZTSN10__cxxabiv117__array_type_infoE = Module['__ZTSN10__cxxabiv117__array_type_infoE'] = 5281804;
var __ZTVN10__cxxabiv120__function_type_infoE = Module['__ZTVN10__cxxabiv120__function_type_infoE'] = 5281852;
var __ZTVN10__cxxabiv116__enum_type_infoE = Module['__ZTVN10__cxxabiv116__enum_type_infoE'] = 5281880;
var __ZTIN10__cxxabiv116__enum_type_infoE = Module['__ZTIN10__cxxabiv116__enum_type_infoE'] = 5281944;
var __ZTSN10__cxxabiv116__enum_type_infoE = Module['__ZTSN10__cxxabiv116__enum_type_infoE'] = 5281908;
var __ZTIN10__cxxabiv120__si_class_type_infoE = Module['__ZTIN10__cxxabiv120__si_class_type_infoE'] = 5282076;
var __ZTSN10__cxxabiv120__si_class_type_infoE = Module['__ZTSN10__cxxabiv120__si_class_type_infoE'] = 5282036;
var __ZTVN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTVN10__cxxabiv121__vmi_class_type_infoE'] = 5282088;
var __ZTIN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTIN10__cxxabiv121__vmi_class_type_infoE'] = 5282168;
var __ZTSN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTSN10__cxxabiv121__vmi_class_type_infoE'] = 5282128;
var __ZTVN10__cxxabiv117__pbase_type_infoE = Module['__ZTVN10__cxxabiv117__pbase_type_infoE'] = 5282180;
var __ZTVN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTVN10__cxxabiv129__pointer_to_member_type_infoE'] = 5282236;
var __ZTVSt9bad_alloc = Module['__ZTVSt9bad_alloc'] = 5282264;
var __ZTVSt20bad_array_new_length = Module['__ZTVSt20bad_array_new_length'] = 5282284;
var __ZTISt9bad_alloc = Module['__ZTISt9bad_alloc'] = 5282416;
var __ZTISt9exception = Module['__ZTISt9exception'] = 5282340;
var __ZTSSt9exception = Module['__ZTSSt9exception'] = 5282324;
var __ZTVSt13bad_exception = Module['__ZTVSt13bad_exception'] = 5282348;
var __ZTISt13bad_exception = Module['__ZTISt13bad_exception'] = 5282388;
var __ZTSSt13bad_exception = Module['__ZTSSt13bad_exception'] = 5282368;
var __ZTSSt9bad_alloc = Module['__ZTSSt9bad_alloc'] = 5282400;
var __ZTSSt20bad_array_new_length = Module['__ZTSSt20bad_array_new_length'] = 5282428;
var __ZTISt11logic_error = Module['__ZTISt11logic_error'] = 5282564;
var __ZTISt13runtime_error = Module['__ZTISt13runtime_error'] = 5282804;
var __ZTVSt12domain_error = Module['__ZTVSt12domain_error'] = 5282508;
var __ZTISt12domain_error = Module['__ZTISt12domain_error'] = 5282576;
var __ZTSSt12domain_error = Module['__ZTSSt12domain_error'] = 5282528;
var __ZTSSt11logic_error = Module['__ZTSSt11logic_error'] = 5282545;
var __ZTVSt16invalid_argument = Module['__ZTVSt16invalid_argument'] = 5282588;
var __ZTISt16invalid_argument = Module['__ZTISt16invalid_argument'] = 5282632;
var __ZTSSt16invalid_argument = Module['__ZTSSt16invalid_argument'] = 5282608;
var __ZTSSt12length_error = Module['__ZTSSt12length_error'] = 5282664;
var __ZTVSt12out_of_range = Module['__ZTVSt12out_of_range'] = 5282696;
var __ZTISt12out_of_range = Module['__ZTISt12out_of_range'] = 5282736;
var __ZTSSt12out_of_range = Module['__ZTSSt12out_of_range'] = 5282716;
var __ZTVSt11range_error = Module['__ZTVSt11range_error'] = 5282748;
var __ZTISt11range_error = Module['__ZTISt11range_error'] = 5282816;
var __ZTSSt11range_error = Module['__ZTSSt11range_error'] = 5282768;
var __ZTSSt13runtime_error = Module['__ZTSSt13runtime_error'] = 5282784;
var __ZTVSt14overflow_error = Module['__ZTVSt14overflow_error'] = 5282828;
var __ZTISt14overflow_error = Module['__ZTISt14overflow_error'] = 5282868;
var __ZTSSt14overflow_error = Module['__ZTSSt14overflow_error'] = 5282848;
var __ZTVSt15underflow_error = Module['__ZTVSt15underflow_error'] = 5282880;
var __ZTISt15underflow_error = Module['__ZTISt15underflow_error'] = 5282920;
var __ZTSSt15underflow_error = Module['__ZTSSt15underflow_error'] = 5282900;
var __ZTVSt8bad_cast = Module['__ZTVSt8bad_cast'] = 5282932;
var __ZTVSt10bad_typeid = Module['__ZTVSt10bad_typeid'] = 5282952;
var __ZTISt8bad_cast = Module['__ZTISt8bad_cast'] = 5283024;
var __ZTISt10bad_typeid = Module['__ZTISt10bad_typeid'] = 5283052;
var __ZTVSt9type_info = Module['__ZTVSt9type_info'] = 5282972;
var __ZTSSt9type_info = Module['__ZTSSt9type_info'] = 5282988;
var __ZTSSt8bad_cast = Module['__ZTSSt8bad_cast'] = 5283012;
var __ZTSSt10bad_typeid = Module['__ZTSSt10bad_typeid'] = 5283036;
var ___start_em_js = Module['___start_em_js'] = 5283557;
var ___stop_em_js = Module['___stop_em_js'] = 5283839;
function invoke_vii(index,a1,a2) {
  var sp = stackSave();
  try {
    dynCall_vii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (e !== e+0) throw e;
    _setThrew(1, 0);
  }
}




// === Auto-generated postamble setup entry stuff ===

Module["stringToUTF8"] = stringToUTF8;
Module["lengthBytesUTF8"] = lengthBytesUTF8;
var unexportedRuntimeSymbols = [
  'run',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'addOnPreRun',
  'addOnInit',
  'addOnPreMain',
  'addOnExit',
  'addOnPostRun',
  'addRunDependency',
  'removeRunDependency',
  'FS_createFolder',
  'FS_createPath',
  'FS_createDataFile',
  'FS_createPreloadedFile',
  'FS_createLazyFile',
  'FS_createLink',
  'FS_createDevice',
  'FS_unlink',
  'getLEB',
  'getFunctionTables',
  'alignFunctionTables',
  'registerFunctions',
  'prettyPrint',
  'getCompilerSetting',
  'out',
  'err',
  'callMain',
  'abort',
  'keepRuntimeAlive',
  'wasmMemory',
  'stackAlloc',
  'stackSave',
  'stackRestore',
  'getTempRet0',
  'setTempRet0',
  'writeStackCookie',
  'checkStackCookie',
  'ptrToString',
  'zeroMemory',
  'stringToNewUTF8',
  'exitJS',
  'getHeapMax',
  'emscripten_realloc_buffer',
  'ENV',
  'ERRNO_CODES',
  'ERRNO_MESSAGES',
  'setErrNo',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'DNS',
  'getHostByName',
  'Protocols',
  'Sockets',
  'getRandomDevice',
  'warnOnce',
  'traverseStack',
  'UNWIND_CACHE',
  'convertPCtoSourceLocation',
  'readAsmConstArgsArray',
  'readAsmConstArgs',
  'mainThreadEM_ASM',
  'jstoi_q',
  'jstoi_s',
  'getExecutableName',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'handleException',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'safeSetTimeout',
  'asmjsMangle',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'getCFunc',
  'ccall',
  'cwrap',
  'uleb128Encode',
  'sigToWasmTypes',
  'generateFuncType',
  'convertJsFunctionToWasm',
  'freeTableIndexes',
  'functionsInTableMap',
  'getEmptyTableSlot',
  'updateTableMap',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'intArrayFromString',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16Decoder',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'writeStringToMemory',
  'writeArrayToMemory',
  'writeAsciiToMemory',
  'SYSCALLS',
  'getSocketFromFD',
  'getSocketAddress',
  'JSEvents',
  'registerKeyEventCallback',
  'specialHTMLTargets',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'demangle',
  'demangleAll',
  'jsStackTrace',
  'stackTrace',
  'ExitStatus',
  'getEnvStrings',
  'checkWasiClock',
  'doReadv',
  'doWritev',
  'dlopenMissingError',
  'createDyncallWrapper',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'ExceptionInfo',
  'exception_addRef',
  'exception_decRef',
  'Browser',
  'setMainLoop',
  'wget',
  'FS',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  '_setNetworkCallback',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'heapObjectForWebGLType',
  'heapAccessShiftForWebGLHeap',
  'GL',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  'writeGLArray',
  'AL',
  'SDL_unicode',
  'SDL_ttfContext',
  'SDL_audio',
  'SDL',
  'SDL_gfx',
  'GLUT',
  'EGL',
  'GLFW_Window',
  'GLFW',
  'GLEW',
  'IDBStore',
  'runAndAbortIfError',
  'Asyncify',
  'Fibers',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'InternalError',
  'BindingError',
  'UnboundTypeError',
  'PureVirtualError',
  'init_embind',
  'throwInternalError',
  'throwBindingError',
  'throwUnboundTypeError',
  'ensureOverloadTable',
  'exposePublicSymbol',
  'replacePublicSymbol',
  'extendError',
  'createNamedFunction',
  'embindRepr',
  'registeredInstances',
  'getBasestPointer',
  'registerInheritedInstance',
  'unregisterInheritedInstance',
  'getInheritedInstance',
  'getInheritedInstanceCount',
  'getLiveInheritedInstances',
  'registeredTypes',
  'awaitingDependencies',
  'typeDependencies',
  'registeredPointers',
  'registerType',
  'whenDependentTypesAreResolved',
  'embind_charCodes',
  'embind_init_charCodes',
  'readLatin1String',
  'getTypeName',
  'heap32VectorToArray',
  'requireRegisteredType',
  'getShiftFromSize',
  'integerReadValueFromPointer',
  'enumReadValueFromPointer',
  'floatReadValueFromPointer',
  'simpleReadValueFromPointer',
  'runDestructors',
  'new_',
  'craftInvokerFunction',
  'embind__requireFunction',
  'tupleRegistrations',
  'structRegistrations',
  'genericPointerToWireType',
  'constNoSmartPtrRawPointerToWireType',
  'nonConstNoSmartPtrRawPointerToWireType',
  'init_RegisteredPointer',
  'RegisteredPointer',
  'RegisteredPointer_getPointee',
  'RegisteredPointer_destructor',
  'RegisteredPointer_deleteObject',
  'RegisteredPointer_fromWireType',
  'runDestructor',
  'releaseClassHandle',
  'finalizationRegistry',
  'detachFinalizer_deps',
  'detachFinalizer',
  'attachFinalizer',
  'makeClassHandle',
  'init_ClassHandle',
  'ClassHandle',
  'ClassHandle_isAliasOf',
  'throwInstanceAlreadyDeleted',
  'ClassHandle_clone',
  'ClassHandle_delete',
  'deletionQueue',
  'ClassHandle_isDeleted',
  'ClassHandle_deleteLater',
  'flushPendingDeletes',
  'delayFunction',
  'setDelayFunction',
  'RegisteredClass',
  'shallowCopyInternalPointer',
  'downcastPointer',
  'upcastPointer',
  'validateThis',
  'char_0',
  'char_9',
  'makeLegalFunctionName',
  'emval_handle_array',
  'emval_free_list',
  'emval_symbols',
  'init_emval',
  'count_emval_handles',
  'get_first_emval',
  'getStringOrSymbol',
  'Emval',
  'emval_newers',
  'craftEmvalAllocator',
  'emval_get_global',
  'emval_lookupTypes',
  'emval_allocateDestructors',
  'emval_methodCallers',
  'emval_addMethodCaller',
  'emval_registeredMethods',
];
unexportedRuntimeSymbols.forEach(unexportedRuntimeSymbol);
var missingLibrarySymbols = [
  'stringToNewUTF8',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'getHostByName',
  'traverseStack',
  'convertPCtoSourceLocation',
  'mainThreadEM_ASM',
  'jstoi_q',
  'jstoi_s',
  'listenOnce',
  'autoResumeAudioContext',
  'maybeExit',
  'safeSetTimeout',
  'asmjsMangle',
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertU32PairToI53',
  'getCFunc',
  'ccall',
  'cwrap',
  'uleb128Encode',
  'generateFuncType',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'writeStringToMemory',
  'getSocketFromFD',
  'getSocketAddress',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'stackTrace',
  'checkWasiClock',
  'createDyncallWrapper',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'exception_addRef',
  'exception_decRef',
  'setMainLoop',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'heapAccessShiftForWebGLHeap',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  'writeGLArray',
  'SDL_unicode',
  'SDL_ttfContext',
  'SDL_audio',
  'GLFW_Window',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'registerInheritedInstance',
  'unregisterInheritedInstance',
  'enumReadValueFromPointer',
  'validateThis',
  'getStringOrSymbol',
  'craftEmvalAllocator',
  'emval_get_global',
  'emval_lookupTypes',
  'emval_allocateDestructors',
  'emval_addMethodCaller',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)


var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = Module['_main'];

  args = args || [];
  args.unshift(thisProgram);

  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv >> 2;
  args.forEach((arg) => {
    HEAP32[argv_ptr++] = allocateUTF8OnStack(arg);
  });
  HEAP32[argv_ptr] = 0;

  try {

    var ret = entryFunction(argc, argv);

    // In PROXY_TO_PTHREAD builds, we should never exit the runtime below, as
    // execution is asynchronously handed off to a pthread.
    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  }
  catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

/** @type {function(Array=)} */
function run(args) {
  args = args || arguments_;

  if (runDependencies > 0) {
    return;
  }

    stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (shouldRunNow) callMain(args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    ['stdout', 'stderr'].forEach(function(name) {
      var info = FS.analyzePath('/dev/' + name);
      if (!info) return;
      var stream = info.object;
      var rdev = stream.rdev;
      var tty = TTY.ttys[rdev];
      if (tty && tty.output && tty.output.length) {
        has = true;
      }
    });
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.');
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = false;

if (Module['noInitialRun']) shouldRunNow = false;

run();





