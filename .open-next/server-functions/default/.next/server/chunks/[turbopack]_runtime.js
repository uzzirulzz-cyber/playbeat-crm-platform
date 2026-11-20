const RUNTIME_PUBLIC_PATH = "server/chunks/[turbopack]_runtime.js";
const RELATIVE_ROOT_PATH = "..";
const ASSET_PREFIX = "/";
/**
 * This file contains runtime types and functions that are shared between all
 * TurboPack ECMAScript runtimes.
 *
 * It will be prepended to the runtime code of each runtime.
 */ /* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-types.d.ts" />
const REEXPORTED_OBJECTS = new WeakMap();
/**
 * Constructs the `__turbopack_context__` object for a module.
 */ function Context(module, exports) {
    this.m = module;
    // We need to store this here instead of accessing it from the module object to:
    // 1. Make it available to factories directly, since we rewrite `this` to
    //    `__turbopack_context__.e` in CJS modules.
    // 2. Support async modules which rewrite `module.exports` to a promise, so we
    //    can still access the original exports object from functions like
    //    `esmExport`
    // Ideally we could find a new approach for async modules and drop this property altogether.
    this.e = exports;
}
const contextPrototype = Context.prototype;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;
function defineProp(obj, name, options) {
    if (!hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, options);
}
function getOverwrittenModule(moduleCache, id) {
    let module = moduleCache[id];
    if (!module) {
        // This is invoked when a module is merged into another module, thus it wasn't invoked via
        // instantiateModule and the cache entry wasn't created yet.
        module = createModuleObject(id);
        moduleCache[id] = module;
    }
    return module;
}
/**
 * Creates the module object. Only done here to ensure all module objects have the same shape.
 */ function createModuleObject(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined
    };
}
const BindingTag_Value = 0;
/**
 * Adds the getters to the exports object.
 */ function esm(exports, bindings) {
    defineProp(exports, '__esModule', {
        value: true
    });
    if (toStringTag) defineProp(exports, toStringTag, {
        value: 'Module'
    });
    let i = 0;
    while(i < bindings.length){
        const propName = bindings[i++];
        const tagOrFunction = bindings[i++];
        if (typeof tagOrFunction === 'number') {
            if (tagOrFunction === BindingTag_Value) {
                defineProp(exports, propName, {
                    value: bindings[i++],
                    enumerable: true,
                    writable: false
                });
            } else {
                throw new Error(`unexpected tag: ${tagOrFunction}`);
            }
        } else {
            const getterFn = tagOrFunction;
            if (typeof bindings[i] === 'function') {
                const setterFn = bindings[i++];
                defineProp(exports, propName, {
                    get: getterFn,
                    set: setterFn,
                    enumerable: true
                });
            } else {
                defineProp(exports, propName, {
                    get: getterFn,
                    enumerable: true
                });
            }
        }
    }
    Object.seal(exports);
}
/**
 * Makes the module an ESM with exports
 */ function esmExport(bindings, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    module.namespaceObject = exports;
    esm(exports, bindings);
}
contextPrototype.s = esmExport;
function ensureDynamicExports(module, exports) {
    let reexportedObjects = REEXPORTED_OBJECTS.get(module);
    if (!reexportedObjects) {
        REEXPORTED_OBJECTS.set(module, reexportedObjects = []);
        module.exports = module.namespaceObject = new Proxy(exports, {
            get (target, prop) {
                if (hasOwnProperty.call(target, prop) || prop === 'default' || prop === '__esModule') {
                    return Reflect.get(target, prop);
                }
                for (const obj of reexportedObjects){
                    const value = Reflect.get(obj, prop);
                    if (value !== undefined) return value;
                }
                return undefined;
            },
            ownKeys (target) {
                const keys = Reflect.ownKeys(target);
                for (const obj of reexportedObjects){
                    for (const key of Reflect.ownKeys(obj)){
                        if (key !== 'default' && !keys.includes(key)) keys.push(key);
                    }
                }
                return keys;
            }
        });
    }
    return reexportedObjects;
}
/**
 * Dynamically exports properties from an object
 */ function dynamicExport(object, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    const reexportedObjects = ensureDynamicExports(module, exports);
    if (typeof object === 'object' && object !== null) {
        reexportedObjects.push(object);
    }
}
contextPrototype.j = dynamicExport;
function exportValue(value, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = value;
}
contextPrototype.v = exportValue;
function exportNamespace(namespace, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = module.namespaceObject = namespace;
}
contextPrototype.n = exportNamespace;
function createGetter(obj, key) {
    return ()=>obj[key];
}
/**
 * @returns prototype of the object
 */ const getProto = Object.getPrototypeOf ? (obj)=>Object.getPrototypeOf(obj) : (obj)=>obj.__proto__;
/** Prototypes that are not expanded for exports */ const LEAF_PROTOTYPES = [
    null,
    getProto({}),
    getProto([]),
    getProto(getProto)
];
/**
 * @param raw
 * @param ns
 * @param allowExportDefault
 *   * `false`: will have the raw module as default export
 *   * `true`: will have the default property as default export
 */ function interopEsm(raw, ns, allowExportDefault) {
    const bindings = [];
    let defaultLocation = -1;
    for(let current = raw; (typeof current === 'object' || typeof current === 'function') && !LEAF_PROTOTYPES.includes(current); current = getProto(current)){
        for (const key of Object.getOwnPropertyNames(current)){
            bindings.push(key, createGetter(raw, key));
            if (defaultLocation === -1 && key === 'default') {
                defaultLocation = bindings.length - 1;
            }
        }
    }
    // this is not really correct
    // we should set the `default` getter if the imported module is a `.cjs file`
    if (!(allowExportDefault && defaultLocation >= 0)) {
        // Replace the binding with one for the namespace itself in order to preserve iteration order.
        if (defaultLocation >= 0) {
            // Replace the getter with the value
            bindings.splice(defaultLocation, 1, BindingTag_Value, raw);
        } else {
            bindings.push('default', BindingTag_Value, raw);
        }
    }
    esm(ns, bindings);
    return ns;
}
function createNS(raw) {
    if (typeof raw === 'function') {
        return function(...args) {
            return raw.apply(this, args);
        };
    } else {
        return Object.create(null);
    }
}
function esmImport(id) {
    const module = getOrInstantiateModuleFromParent(id, this.m);
    // any ES module has to have `module.namespaceObject` defined.
    if (module.namespaceObject) return module.namespaceObject;
    // only ESM can be an async module, so we don't need to worry about exports being a promise here.
    const raw = module.exports;
    return module.namespaceObject = interopEsm(raw, createNS(raw), raw && raw.__esModule);
}
contextPrototype.i = esmImport;
function asyncLoader(moduleId) {
    const loader = this.r(moduleId);
    return loader(esmImport.bind(this));
}
contextPrototype.A = asyncLoader;
// Add a simple runtime require so that environments without one can still pass
// `typeof require` CommonJS checks so that exports are correctly registered.
const runtimeRequire = // @ts-ignore
typeof require === 'function' ? require : function require1() {
    throw new Error('Unexpected use of runtime require');
};
contextPrototype.t = runtimeRequire;
function commonJsRequire(id) {
    return getOrInstantiateModuleFromParent(id, this.m).exports;
}
contextPrototype.r = commonJsRequire;
/**
 * Remove fragments and query parameters since they are never part of the context map keys
 *
 * This matches how we parse patterns at resolving time.  Arguably we should only do this for
 * strings passed to `import` but the resolve does it for `import` and `require` and so we do
 * here as well.
 */ function parseRequest(request) {
    // Per the URI spec fragments can contain `?` characters, so we should trim it off first
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    const hashIndex = request.indexOf('#');
    if (hashIndex !== -1) {
        request = request.substring(0, hashIndex);
    }
    const queryIndex = request.indexOf('?');
    if (queryIndex !== -1) {
        request = request.substring(0, queryIndex);
    }
    return request;
}
/**
 * `require.context` and require/import expression runtime.
 */ function moduleContext(map) {
    function moduleContext(id) {
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].module();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    moduleContext.keys = ()=>{
        return Object.keys(map);
    };
    moduleContext.resolve = (id)=>{
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].id();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    };
    moduleContext.import = async (id)=>{
        return await moduleContext(id);
    };
    return moduleContext;
}
contextPrototype.f = moduleContext;
/**
 * Returns the path of a chunk defined by its data.
 */ function getChunkPath(chunkData) {
    return typeof chunkData === 'string' ? chunkData : chunkData.path;
}
function isPromise(maybePromise) {
    return maybePromise != null && typeof maybePromise === 'object' && 'then' in maybePromise && typeof maybePromise.then === 'function';
}
function isAsyncModuleExt(obj) {
    return turbopackQueues in obj;
}
function createPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        reject = rej;
        resolve = res;
    });
    return {
        promise,
        resolve: resolve,
        reject: reject
    };
}
// Load the CompressedmoduleFactories of a chunk into the `moduleFactories` Map.
// The CompressedModuleFactories format is
// - 1 or more module ids
// - a module factory function
// So walking this is a little complex but the flat structure is also fast to
// traverse, we can use `typeof` operators to distinguish the two cases.
function installCompressedModuleFactories(chunkModules, offset, moduleFactories, newModuleId) {
    let i = offset;
    while(i < chunkModules.length){
        let moduleId = chunkModules[i];
        let end = i + 1;
        // Find our factory function
        while(end < chunkModules.length && typeof chunkModules[end] !== 'function'){
            end++;
        }
        if (end === chunkModules.length) {
            throw new Error('malformed chunk format, expected a factory function');
        }
        // Each chunk item has a 'primary id' and optional additional ids. If the primary id is already
        // present we know all the additional ids are also present, so we don't need to check.
        if (!moduleFactories.has(moduleId)) {
            const moduleFactoryFn = chunkModules[end];
            applyModuleFactoryName(moduleFactoryFn);
            newModuleId?.(moduleId);
            for(; i < end; i++){
                moduleId = chunkModules[i];
                moduleFactories.set(moduleId, moduleFactoryFn);
            }
        }
        i = end + 1; // end is pointing at the last factory advance to the next id or the end of the array.
    }
}
// everything below is adapted from webpack
// https://github.com/webpack/webpack/blob/6be4065ade1e252c1d8dcba4af0f43e32af1bdc1/lib/runtime/AsyncModuleRuntimeModule.js#L13
const turbopackQueues = Symbol('turbopack queues');
const turbopackExports = Symbol('turbopack exports');
const turbopackError = Symbol('turbopack error');
function resolveQueue(queue) {
    if (queue && queue.status !== 1) {
        queue.status = 1;
        queue.forEach((fn)=>fn.queueCount--);
        queue.forEach((fn)=>fn.queueCount-- ? fn.queueCount++ : fn());
    }
}
function wrapDeps(deps) {
    return deps.map((dep)=>{
        if (dep !== null && typeof dep === 'object') {
            if (isAsyncModuleExt(dep)) return dep;
            if (isPromise(dep)) {
                const queue = Object.assign([], {
                    status: 0
                });
                const obj = {
                    [turbopackExports]: {},
                    [turbopackQueues]: (fn)=>fn(queue)
                };
                dep.then((res)=>{
                    obj[turbopackExports] = res;
                    resolveQueue(queue);
                }, (err)=>{
                    obj[turbopackError] = err;
                    resolveQueue(queue);
                });
                return obj;
            }
        }
        return {
            [turbopackExports]: dep,
            [turbopackQueues]: ()=>{}
        };
    });
}
function asyncModule(body, hasAwait) {
    const module = this.m;
    const queue = hasAwait ? Object.assign([], {
        status: -1
    }) : undefined;
    const depQueues = new Set();
    const { resolve, reject, promise: rawPromise } = createPromise();
    const promise = Object.assign(rawPromise, {
        [turbopackExports]: module.exports,
        [turbopackQueues]: (fn)=>{
            queue && fn(queue);
            depQueues.forEach(fn);
            promise['catch'](()=>{});
        }
    });
    const attributes = {
        get () {
            return promise;
        },
        set (v) {
            // Calling `esmExport` leads to this.
            if (v !== promise) {
                promise[turbopackExports] = v;
            }
        }
    };
    Object.defineProperty(module, 'exports', attributes);
    Object.defineProperty(module, 'namespaceObject', attributes);
    function handleAsyncDependencies(deps) {
        const currentDeps = wrapDeps(deps);
        const getResult = ()=>currentDeps.map((d)=>{
                if (d[turbopackError]) throw d[turbopackError];
                return d[turbopackExports];
            });
        const { promise, resolve } = createPromise();
        const fn = Object.assign(()=>resolve(getResult), {
            queueCount: 0
        });
        function fnQueue(q) {
            if (q !== queue && !depQueues.has(q)) {
                depQueues.add(q);
                if (q && q.status === 0) {
                    fn.queueCount++;
                    q.push(fn);
                }
            }
        }
        currentDeps.map((dep)=>dep[turbopackQueues](fnQueue));
        return fn.queueCount ? promise : getResult();
    }
    function asyncResult(err) {
        if (err) {
            reject(promise[turbopackError] = err);
        } else {
            resolve(promise[turbopackExports]);
        }
        resolveQueue(queue);
    }
    body(handleAsyncDependencies, asyncResult);
    if (queue && queue.status === -1) {
        queue.status = 0;
    }
}
contextPrototype.a = asyncModule;
/**
 * A pseudo "fake" URL object to resolve to its relative path.
 *
 * When UrlRewriteBehavior is set to relative, calls to the `new URL()` will construct url without base using this
 * runtime function to generate context-agnostic urls between different rendering context, i.e ssr / client to avoid
 * hydration mismatch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
// Make `globalThis` available to the module in a way that cannot be shadowed by a local variable.
contextPrototype.g = globalThis;
function applyModuleFactoryName(factory) {
    // Give the module factory a nice name to improve stack traces.
    Object.defineProperty(factory, 'name', {
        value: 'module evaluation'
    });
}
/// <reference path="../shared/runtime-utils.ts" />
/// A 'base' utilities to support runtime can have externals.
/// Currently this is for node.js / edge runtime both.
/// If a fn requires node.js specific behavior, it should be placed in `node-external-utils` instead.
async function externalImport(id) {
    let raw;
    try {
        switch (id) {
  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;
  default:
    raw = await import(id);
};
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (raw && raw.__esModule && raw.default && 'default' in raw.default) {
        return interopEsm(raw.default, createNS(raw), true);
    }
    return raw;
}
contextPrototype.y = externalImport;
function externalRequire(id, thunk, esm = false) {
    let raw;
    try {
        raw = thunk();
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (!esm || raw.__esModule) {
        return raw;
    }
    return interopEsm(raw, createNS(raw), true);
}
externalRequire.resolve = (id, options)=>{
    return require.resolve(id, options);
};
contextPrototype.x = externalRequire;
/* eslint-disable @typescript-eslint/no-unused-vars */ const path = require('path');
const relativePathToRuntimeRoot = path.relative(RUNTIME_PUBLIC_PATH, '.');
// Compute the relative path to the `distDir`.
const relativePathToDistRoot = path.join(relativePathToRuntimeRoot, RELATIVE_ROOT_PATH);
const RUNTIME_ROOT = path.resolve(__filename, relativePathToRuntimeRoot);
// Compute the absolute path to the root, by stripping distDir from the absolute path to this file.
const ABSOLUTE_ROOT = path.resolve(__filename, relativePathToDistRoot);
/**
 * Returns an absolute path to the given module path.
 * Module path should be relative, either path to a file or a directory.
 *
 * This fn allows to calculate an absolute path for some global static values, such as
 * `__dirname` or `import.meta.url` that Turbopack will not embeds in compile time.
 * See ImportMetaBinding::code_generation for the usage.
 */ function resolveAbsolutePath(modulePath) {
    if (modulePath) {
        return path.join(ABSOLUTE_ROOT, modulePath);
    }
    return ABSOLUTE_ROOT;
}
Context.prototype.P = resolveAbsolutePath;
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../shared/runtime-utils.ts" />
function readWebAssemblyAsResponse(path) {
    const { createReadStream } = require('fs');
    const { Readable } = require('stream');
    const stream = createReadStream(path);
    // @ts-ignore unfortunately there's a slight type mismatch with the stream.
    return new Response(Readable.toWeb(stream), {
        headers: {
            'content-type': 'application/wasm'
        }
    });
}
async function compileWebAssemblyFromPath(path) {
    const response = readWebAssemblyAsResponse(path);
    return await WebAssembly.compileStreaming(response);
}
async function instantiateWebAssemblyFromPath(path, importsObj) {
    const response = readWebAssemblyAsResponse(path);
    const { instance } = await WebAssembly.instantiateStreaming(response, importsObj);
    return instance.exports;
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../shared/runtime-utils.ts" />
/// <reference path="../shared-node/base-externals-utils.ts" />
/// <reference path="../shared-node/node-externals-utils.ts" />
/// <reference path="../shared-node/node-wasm-utils.ts" />
var SourceType = /*#__PURE__*/ function(SourceType) {
    /**
   * The module was instantiated because it was included in an evaluated chunk's
   * runtime.
   * SourceData is a ChunkPath.
   */ SourceType[SourceType["Runtime"] = 0] = "Runtime";
    /**
   * The module was instantiated because a parent module imported it.
   * SourceData is a ModuleId.
   */ SourceType[SourceType["Parent"] = 1] = "Parent";
    return SourceType;
}(SourceType || {});
process.env.TURBOPACK = '1';
const nodeContextPrototype = Context.prototype;
const url = require('url');
const moduleFactories = new Map();
nodeContextPrototype.M = moduleFactories;
const moduleCache = Object.create(null);
nodeContextPrototype.c = moduleCache;
/**
 * Returns an absolute path to the given module's id.
 */ function resolvePathFromModule(moduleId) {
    const exported = this.r(moduleId);
    const exportedPath = exported?.default ?? exported;
    if (typeof exportedPath !== 'string') {
        return exported;
    }
    const strippedAssetPrefix = exportedPath.slice(ASSET_PREFIX.length);
    const resolved = path.resolve(RUNTIME_ROOT, strippedAssetPrefix);
    return url.pathToFileURL(resolved).href;
}
nodeContextPrototype.R = resolvePathFromModule;
function loadRuntimeChunk(sourcePath, chunkData) {
    if (typeof chunkData === 'string') {
        loadRuntimeChunkPath(sourcePath, chunkData);
    } else {
        loadRuntimeChunkPath(sourcePath, chunkData.path);
    }
}
const loadedChunks = new Set();
const unsupportedLoadChunk = Promise.resolve(undefined);
const loadedChunk = Promise.resolve(undefined);
const chunkCache = new Map();
function clearChunkCache() {
    chunkCache.clear();
}
function loadRuntimeChunkPath(sourcePath, chunkPath) {
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return;
    }
    if (loadedChunks.has(chunkPath)) {
        return;
    }
    try {
        const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
        const chunkModules = requireChunk(chunkPath);
        installCompressedModuleFactories(chunkModules, 0, moduleFactories);
        loadedChunks.add(chunkPath);
    } catch (cause) {
        let errorMessage = `Failed to load chunk ${chunkPath}`;
        if (sourcePath) {
            errorMessage += ` from runtime for chunk ${sourcePath}`;
        }
        const error = new Error(errorMessage, {
            cause
        });
        error.name = 'ChunkLoadError';
        throw error;
    }
}
function loadChunkAsync(chunkData) {
    const chunkPath = typeof chunkData === 'string' ? chunkData : chunkData.path;
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return unsupportedLoadChunk;
    }
    let entry = chunkCache.get(chunkPath);
    if (entry === undefined) {
        try {
            // resolve to an absolute path to simplify `require` handling
            const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io
            // However this is incompatible with hot reloading (since `import` doesn't use the require cache)
            const chunkModules = requireChunk(chunkPath);
            installCompressedModuleFactories(chunkModules, 0, moduleFactories);
            entry = loadedChunk;
        } catch (cause) {
            const errorMessage = `Failed to load chunk ${chunkPath} from module ${this.m.id}`;
            const error = new Error(errorMessage, {
                cause
            });
            error.name = 'ChunkLoadError';
            // Cache the failure promise, future requests will also get this same rejection
            entry = Promise.reject(error);
        }
        chunkCache.set(chunkPath, entry);
    }
    // TODO: Return an instrumented Promise that React can use instead of relying on referential equality.
    return entry;
}
contextPrototype.l = loadChunkAsync;
function loadChunkAsyncByUrl(chunkUrl) {
    const path1 = url.fileURLToPath(new URL(chunkUrl, RUNTIME_ROOT));
    return loadChunkAsync.call(this, path1);
}
contextPrototype.L = loadChunkAsyncByUrl;
async function loadWebAssembly(chunkPath, _edgeModule, imports) {
  const mod = await loadWasmChunk(chunkPath);
  const { exports } = await WebAssembly.instantiate(mod, imports);
  return exports;
}
contextPrototype.w = loadWebAssembly;
function loadWebAssemblyModule(chunkPath, _edgeModule) {
  return loadWasmChunk(chunkPath);
}
contextPrototype.u = loadWebAssemblyModule;
function getWorkerBlobURL(_chunks) {
    throw new Error('Worker blobs are not implemented yet for Node.js');
}
nodeContextPrototype.b = getWorkerBlobURL;
function instantiateModule(id, sourceType, sourceData) {
    const moduleFactory = moduleFactories.get(id);
    if (typeof moduleFactory !== 'function') {
        // This can happen if modules incorrectly handle HMR disposes/updates,
        // e.g. when they keep a `setTimeout` around which still executes old code
        // and contains e.g. a `require("something")` call.
        let instantiationReason;
        switch(sourceType){
            case 0:
                instantiationReason = `as a runtime entry of chunk ${sourceData}`;
                break;
            case 1:
                instantiationReason = `because it was required from module ${sourceData}`;
                break;
            default:
                invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
        }
        throw new Error(`Module ${id} was instantiated ${instantiationReason}, but the module factory is not available.`);
    }
    const module1 = createModuleObject(id);
    const exports = module1.exports;
    moduleCache[id] = module1;
    const context = new Context(module1, exports);
    // NOTE(alexkirsz) This can fail when the module encounters a runtime error.
    try {
        moduleFactory(context, module1, exports);
    } catch (error) {
        module1.error = error;
        throw error;
    }
    module1.loaded = true;
    if (module1.namespaceObject && module1.exports !== module1.namespaceObject) {
        // in case of a circular dependency: cjs1 -> esm2 -> cjs1
        interopEsm(module1.exports, module1.namespaceObject);
    }
    return module1;
}
/**
 * Retrieves a module from the cache, or instantiate it if it is not cached.
 */ // @ts-ignore
function getOrInstantiateModuleFromParent(id, sourceModule) {
    const module1 = moduleCache[id];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, 1, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, 0, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache[moduleId];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
const regexJsUrl = /\.js(?:\?[^#]*)?(?:#.*)?$/;
/**
 * Checks if a given path/URL ends with .js, optionally followed by ?query or #fragment.
 */ function isJs(chunkUrlOrPath) {
    return regexJsUrl.test(chunkUrlOrPath);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map

  function requireChunk(chunkPath) {
    switch(chunkPath) {
      case "server/chunks/ssr/[root-of-the-server]__15600e29._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__15600e29._.js");
      case "server/chunks/ssr/[root-of-the-server]__7a84c364._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__7a84c364._.js");
      case "server/chunks/ssr/[root-of-the-server]__b2b5170b._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__b2b5170b._.js");
      case "server/chunks/ssr/[root-of-the-server]__c34c586d._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__c34c586d._.js");
      case "server/chunks/ssr/[root-of-the-server]__e17d8479._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__e17d8479._.js");
      case "server/chunks/ssr/[turbopack]_runtime.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[turbopack]_runtime.js");
      case "server/chunks/ssr/_73674818._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_73674818._.js");
      case "server/chunks/ssr/_next-internal_server_app__not-found_page_actions_554ec2bf.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__not-found_page_actions_554ec2bf.js");
      case "server/chunks/ssr/node_modules_13986a24._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_13986a24._.js");
      case "server/chunks/ssr/node_modules_next_dist_4b9a0874._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_4b9a0874._.js");
      case "server/chunks/ssr/node_modules_next_dist_7769b563._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_7769b563._.js");
      case "server/chunks/ssr/node_modules_next_dist_77ec7569._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_77ec7569._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_9774470f._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_9774470f._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_45780354.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_45780354.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_65a7265e.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_65a7265e.js");
      case "server/chunks/ssr/src_components_ui_8dfd8cec._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_8dfd8cec._.js");
      case "server/chunks/ssr/[root-of-the-server]__9fe72a73._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__9fe72a73._.js");
      case "server/chunks/ssr/[root-of-the-server]__b9356576._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__b9356576._.js");
      case "server/chunks/ssr/_next-internal_server_app__global-error_page_actions_75761787.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__global-error_page_actions_75761787.js");
      case "server/chunks/ssr/node_modules_next_dist_08570d7f._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_08570d7f._.js");
      case "server/chunks/ssr/[root-of-the-server]__2277ae35._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__2277ae35._.js");
      case "server/chunks/ssr/[root-of-the-server]__7fca329e._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__7fca329e._.js");
      case "server/chunks/ssr/[root-of-the-server]__9148aa09._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__9148aa09._.js");
      case "server/chunks/ssr/_39ff2d21._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_39ff2d21._.js");
      case "server/chunks/ssr/_96cf8361._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_96cf8361._.js");
      case "server/chunks/ssr/_c66ccb81._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_c66ccb81._.js");
      case "server/chunks/ssr/_ff0937f5._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_ff0937f5._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_page_actions_c7bd1b4f.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_page_actions_c7bd1b4f.js");
      case "server/chunks/ssr/node_modules_ea845e5f._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_ea845e5f._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_ece394eb.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_ece394eb.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_15817684.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_15817684.js");
      case "server/chunks/ssr/src_app_admin_page_tsx_645532da._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_page_tsx_645532da._.js");
      case "server/chunks/[root-of-the-server]__19a92707._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__19a92707._.js");
      case "server/chunks/[root-of-the-server]__39276483._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__39276483._.js");
      case "server/chunks/[root-of-the-server]__8f5ebbc3._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__8f5ebbc3._.js");
      case "server/chunks/[turbopack]_runtime.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[turbopack]_runtime.js");
      case "server/chunks/_3adbf0dd._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_3adbf0dd._.js");
      case "server/chunks/_next-internal_server_app_api_analytics_route_actions_ac389de2.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_analytics_route_actions_ac389de2.js");
      case "server/chunks/node_modules_next_a56e0a3a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/node_modules_next_a56e0a3a._.js");
      case "server/chunks/[root-of-the-server]__db60a138._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__db60a138._.js");
      case "server/chunks/_next-internal_server_app_api_audit-logs_route_actions_5e32e0b0.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_audit-logs_route_actions_5e32e0b0.js");
      case "server/chunks/[root-of-the-server]__03645f42._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__03645f42._.js");
      case "server/chunks/_next-internal_server_app_api_auth_login_route_actions_d02a8f19.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_auth_login_route_actions_d02a8f19.js");
      case "server/chunks/[root-of-the-server]__ad879103._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__ad879103._.js");
      case "server/chunks/_next-internal_server_app_api_calls_[id]_end_route_actions_cdf77401.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_calls_[id]_end_route_actions_cdf77401.js");
      case "server/chunks/[root-of-the-server]__a4e63b42._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__a4e63b42._.js");
      case "server/chunks/_next-internal_server_app_api_calls_[id]_route_actions_817d1513.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_calls_[id]_route_actions_817d1513.js");
      case "server/chunks/[root-of-the-server]__7763335a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__7763335a._.js");
      case "server/chunks/_next-internal_server_app_api_calls_history_route_actions_4efcb5e3.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_calls_history_route_actions_4efcb5e3.js");
      case "server/chunks/[root-of-the-server]__2c07005d._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__2c07005d._.js");
      case "server/chunks/_next-internal_server_app_api_calls_route_actions_9c4c6f8e.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_calls_route_actions_9c4c6f8e.js");
      case "server/chunks/[root-of-the-server]__a9eebe7a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__a9eebe7a._.js");
      case "server/chunks/_next-internal_server_app_api_campaigns_[id]_cancel_route_actions_1064a949.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_campaigns_[id]_cancel_route_actions_1064a949.js");
      case "server/chunks/[root-of-the-server]__577ed39d._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__577ed39d._.js");
      case "server/chunks/_next-internal_server_app_api_campaigns_[id]_pause_route_actions_20fa5472.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_campaigns_[id]_pause_route_actions_20fa5472.js");
      case "server/chunks/[root-of-the-server]__04395fc4._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__04395fc4._.js");
      case "server/chunks/[root-of-the-server]__38854ff8._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__38854ff8._.js");
      case "server/chunks/_next-internal_server_app_api_campaigns_[id]_route_actions_9f009094.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_campaigns_[id]_route_actions_9f009094.js");
      case "server/chunks/[root-of-the-server]__711380e5._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__711380e5._.js");
      case "server/chunks/_next-internal_server_app_api_campaigns_[id]_start_route_actions_318927df.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_campaigns_[id]_start_route_actions_318927df.js");
      case "server/chunks/[root-of-the-server]__72e54052._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__72e54052._.js");
      case "server/chunks/_next-internal_server_app_api_campaigns_route_actions_f1d3f4db.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_campaigns_route_actions_f1d3f4db.js");
      case "server/chunks/[root-of-the-server]__b0dda805._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__b0dda805._.js");
      case "server/chunks/_next-internal_server_app_api_categories_route_actions_9c21f11d.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_categories_route_actions_9c21f11d.js");
      case "server/chunks/node_modules_next_1402a1da._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/node_modules_next_1402a1da._.js");
      case "server/chunks/[root-of-the-server]__ed41cce2._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__ed41cce2._.js");
      case "server/chunks/_next-internal_server_app_api_conversations_[id]_messages_route_actions_9b66ec90.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_conversations_[id]_messages_route_actions_9b66ec90.js");
      case "server/chunks/[root-of-the-server]__00c4ffca._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__00c4ffca._.js");
      case "server/chunks/_next-internal_server_app_api_conversations_[id]_route_actions_a9aab7bb.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_conversations_[id]_route_actions_a9aab7bb.js");
      case "server/chunks/[root-of-the-server]__84722709._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__84722709._.js");
      case "server/chunks/_next-internal_server_app_api_conversations_route_actions_fa8fb480.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_conversations_route_actions_fa8fb480.js");
      case "server/chunks/[root-of-the-server]__71f09338._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__71f09338._.js");
      case "server/chunks/_next-internal_server_app_api_email_inbox_route_actions_19f32f91.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_email_inbox_route_actions_19f32f91.js");
      case "server/chunks/[root-of-the-server]__20920ccf._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__20920ccf._.js");
      case "server/chunks/_next-internal_server_app_api_email_send_route_actions_de5b1b46.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_email_send_route_actions_de5b1b46.js");
      case "server/chunks/[root-of-the-server]__e58d7d8f._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__e58d7d8f._.js");
      case "server/chunks/_next-internal_server_app_api_employees_route_actions_ac5b0244.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_employees_route_actions_ac5b0244.js");
      case "server/chunks/[root-of-the-server]__d3a9767a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__d3a9767a._.js");
      case "server/chunks/_next-internal_server_app_api_export_leads_route_actions_e0dc9790.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_export_leads_route_actions_e0dc9790.js");
      case "server/chunks/[root-of-the-server]__14575bb1._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__14575bb1._.js");
      case "server/chunks/_next-internal_server_app_api_export_leads_xlsx_route_actions_b856baf1.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_export_leads_xlsx_route_actions_b856baf1.js");
      case "server/chunks/node_modules_xlsx_xlsx_mjs_539ebb60._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/node_modules_xlsx_xlsx_mjs_539ebb60._.js");
      case "server/chunks/[root-of-the-server]__66cb4622._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__66cb4622._.js");
      case "server/chunks/_next-internal_server_app_api_followups_[id]_route_actions_6d61f782.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_followups_[id]_route_actions_6d61f782.js");
      case "server/chunks/[root-of-the-server]__06297be7._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__06297be7._.js");
      case "server/chunks/_next-internal_server_app_api_followups_route_actions_35538d6e.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_followups_route_actions_35538d6e.js");
      case "server/chunks/[root-of-the-server]__62e8f121._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__62e8f121._.js");
      case "server/chunks/_next-internal_server_app_api_health_route_actions_da3433c4.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_health_route_actions_da3433c4.js");
      case "server/chunks/[root-of-the-server]__4a4c3a39._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__4a4c3a39._.js");
      case "server/chunks/_next-internal_server_app_api_inbox_route_actions_72519cd2.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_inbox_route_actions_72519cd2.js");
      case "server/chunks/[root-of-the-server]__e56072a6._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__e56072a6._.js");
      case "server/chunks/_next-internal_server_app_api_integrations_[provider]_route_actions_429d1efb.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_integrations_[provider]_route_actions_429d1efb.js");
      case "server/chunks/[root-of-the-server]__0608f207._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0608f207._.js");
      case "server/chunks/_next-internal_server_app_api_integrations_meta-capi_route_actions_11d24504.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_integrations_meta-capi_route_actions_11d24504.js");
      case "server/chunks/[root-of-the-server]__80aacc77._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__80aacc77._.js");
      case "server/chunks/_next-internal_server_app_api_integrations_route_actions_801c3632.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_integrations_route_actions_801c3632.js");
      case "server/chunks/[root-of-the-server]__0da673c8._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0da673c8._.js");
      case "server/chunks/_next-internal_server_app_api_leads_[id]_fire-capi_route_actions_e5b06865.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_leads_[id]_fire-capi_route_actions_e5b06865.js");
      case "server/chunks/[root-of-the-server]__eea6fb8b._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__eea6fb8b._.js");
      case "server/chunks/_next-internal_server_app_api_leads_[id]_route_actions_acacd2b6.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_leads_[id]_route_actions_acacd2b6.js");
      case "server/chunks/[root-of-the-server]__e794c3ae._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__e794c3ae._.js");
      case "server/chunks/_next-internal_server_app_api_leads_bulk_route_actions_49b67c19.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_leads_bulk_route_actions_49b67c19.js");
      case "server/chunks/[root-of-the-server]__25c4994e._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__25c4994e._.js");
      case "server/chunks/_next-internal_server_app_api_leads_import_route_actions_3c5e7bd4.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_leads_import_route_actions_3c5e7bd4.js");
      case "server/chunks/node_modules_ea329cd2._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/node_modules_ea329cd2._.js");
      case "server/chunks/[root-of-the-server]__92b19c28._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__92b19c28._.js");
      case "server/chunks/_next-internal_server_app_api_leads_route_actions_8059d9e6.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_leads_route_actions_8059d9e6.js");
      case "server/chunks/[root-of-the-server]__c2483bad._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__c2483bad._.js");
      case "server/chunks/_next-internal_server_app_api_licenses_[id]_route_actions_42259548.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_licenses_[id]_route_actions_42259548.js");
      case "server/chunks/[root-of-the-server]__9b337e4b._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__9b337e4b._.js");
      case "server/chunks/_next-internal_server_app_api_licenses_route_actions_cf41e565.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_licenses_route_actions_cf41e565.js");
      case "server/chunks/[root-of-the-server]__2b827c0b._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__2b827c0b._.js");
      case "server/chunks/_next-internal_server_app_api_me_route_actions_3ee82308.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_me_route_actions_3ee82308.js");
      case "server/chunks/[root-of-the-server]__a19ca429._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__a19ca429._.js");
      case "server/chunks/_next-internal_server_app_api_messages_route_actions_1d3125af.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_messages_route_actions_1d3125af.js");
      case "server/chunks/[root-of-the-server]__9846f362._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__9846f362._.js");
      case "server/chunks/_next-internal_server_app_api_notes_[id]_route_actions_c2418725.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notes_[id]_route_actions_c2418725.js");
      case "server/chunks/[root-of-the-server]__7444108b._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__7444108b._.js");
      case "server/chunks/_next-internal_server_app_api_notes_route_actions_4ad6f471.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notes_route_actions_4ad6f471.js");
      case "server/chunks/[root-of-the-server]__60dcc269._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__60dcc269._.js");
      case "server/chunks/_next-internal_server_app_api_notifications_[id]_route_actions_233733f6.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notifications_[id]_route_actions_233733f6.js");
      case "server/chunks/[root-of-the-server]__7a0c6d47._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__7a0c6d47._.js");
      case "server/chunks/_next-internal_server_app_api_notifications_mark-read_route_actions_ee8240f4.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notifications_mark-read_route_actions_ee8240f4.js");
      case "server/chunks/[root-of-the-server]__d00984fb._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__d00984fb._.js");
      case "server/chunks/_next-internal_server_app_api_notifications_route_actions_850cb780.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notifications_route_actions_850cb780.js");
      case "server/chunks/[root-of-the-server]__4315c996._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__4315c996._.js");
      case "server/chunks/_next-internal_server_app_api_orders_[id]_fulfill_route_actions_fd58c4c1.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_orders_[id]_fulfill_route_actions_fd58c4c1.js");
      case "server/chunks/[root-of-the-server]__dbc05b91._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__dbc05b91._.js");
      case "server/chunks/_next-internal_server_app_api_orders_[id]_route_actions_9505da60.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_orders_[id]_route_actions_9505da60.js");
      case "server/chunks/[root-of-the-server]__a3de131a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__a3de131a._.js");
      case "server/chunks/_next-internal_server_app_api_orders_route_actions_9a6edca0.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_orders_route_actions_9a6edca0.js");
      case "server/chunks/[root-of-the-server]__fb5ccbfd._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__fb5ccbfd._.js");
      case "server/chunks/_next-internal_server_app_api_payments_route_actions_066ae14c.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_payments_route_actions_066ae14c.js");
      case "server/chunks/[root-of-the-server]__93e00773._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__93e00773._.js");
      case "server/chunks/_next-internal_server_app_api_products_[id]_route_actions_60052b14.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_products_[id]_route_actions_60052b14.js");
      case "server/chunks/[root-of-the-server]__32043eb9._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__32043eb9._.js");
      case "server/chunks/_next-internal_server_app_api_products_route_actions_9a81c53e.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_products_route_actions_9a81c53e.js");
      case "server/chunks/[root-of-the-server]__a73e02d3._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__a73e02d3._.js");
      case "server/chunks/_next-internal_server_app_api_route_actions_dcc5d538.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_route_actions_dcc5d538.js");
      case "server/chunks/[root-of-the-server]__2661351c._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__2661351c._.js");
      case "server/chunks/_next-internal_server_app_api_segments_[id]_route_actions_ff342e92.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_segments_[id]_route_actions_ff342e92.js");
      case "server/chunks/[root-of-the-server]__027b473b._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__027b473b._.js");
      case "server/chunks/_next-internal_server_app_api_segments_route_actions_0a124489.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_segments_route_actions_0a124489.js");
      case "server/chunks/[root-of-the-server]__ad066be8._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__ad066be8._.js");
      case "server/chunks/_next-internal_server_app_api_settings_route_actions_a476013b.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_settings_route_actions_a476013b.js");
      case "server/chunks/[root-of-the-server]__d2422205._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__d2422205._.js");
      case "server/chunks/_next-internal_server_app_api_setup_route_actions_62f4ba02.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_setup_route_actions_62f4ba02.js");
      case "server/chunks/[root-of-the-server]__2d6cbe3e._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__2d6cbe3e._.js");
      case "server/chunks/_next-internal_server_app_api_suppression_[id]_route_actions_3022385a.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_suppression_[id]_route_actions_3022385a.js");
      case "server/chunks/[root-of-the-server]__fc0ef7db._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__fc0ef7db._.js");
      case "server/chunks/_next-internal_server_app_api_suppression_route_actions_d8fa5b5a.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_suppression_route_actions_d8fa5b5a.js");
      case "server/chunks/[root-of-the-server]__70369d06._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__70369d06._.js");
      case "server/chunks/_next-internal_server_app_api_tasks_[id]_route_actions_8de83605.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_tasks_[id]_route_actions_8de83605.js");
      case "server/chunks/[root-of-the-server]__78622511._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__78622511._.js");
      case "server/chunks/_next-internal_server_app_api_tasks_route_actions_84c37746.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_tasks_route_actions_84c37746.js");
      case "server/chunks/[root-of-the-server]__bd172636._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__bd172636._.js");
      case "server/chunks/_next-internal_server_app_api_telephony_config_route_actions_45bf746f.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_telephony_config_route_actions_45bf746f.js");
      case "server/chunks/[root-of-the-server]__44d23e15._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__44d23e15._.js");
      case "server/chunks/_next-internal_server_app_api_telephony_dial_route_actions_1665fb6b.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_telephony_dial_route_actions_1665fb6b.js");
      case "server/chunks/[root-of-the-server]__102a962d._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__102a962d._.js");
      case "server/chunks/_next-internal_server_app_api_telephony_voice_route_actions_e0a01013.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_telephony_voice_route_actions_e0a01013.js");
      case "server/chunks/[root-of-the-server]__5fcb1e15._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__5fcb1e15._.js");
      case "server/chunks/_next-internal_server_app_api_telephony_webhook_twilio_route_actions_c9d91559.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_telephony_webhook_twilio_route_actions_c9d91559.js");
      case "server/chunks/[root-of-the-server]__56264185._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__56264185._.js");
      case "server/chunks/_next-internal_server_app_api_templates_[id]_route_actions_6a91f957.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_templates_[id]_route_actions_6a91f957.js");
      case "server/chunks/[root-of-the-server]__b8c57d38._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__b8c57d38._.js");
      case "server/chunks/_next-internal_server_app_api_templates_route_actions_a59f4640.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_templates_route_actions_a59f4640.js");
      case "server/chunks/[root-of-the-server]__6b17a595._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__6b17a595._.js");
      case "server/chunks/_next-internal_server_app_api_timeline_[leadId]_route_actions_3a5e38af.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_timeline_[leadId]_route_actions_3a5e38af.js");
      case "server/chunks/[root-of-the-server]__0a84dc55._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0a84dc55._.js");
      case "server/chunks/_next-internal_server_app_api_users_[id]_route_actions_e7269cbb.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_users_[id]_route_actions_e7269cbb.js");
      case "server/chunks/[root-of-the-server]__6806e8a4._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__6806e8a4._.js");
      case "server/chunks/_next-internal_server_app_api_users_route_actions_4b9121e3.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_users_route_actions_4b9121e3.js");
      case "server/chunks/[root-of-the-server]__a2720630._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__a2720630._.js");
      case "server/chunks/_next-internal_server_app_api_webhooks_whatsapp_route_actions_64b9386e.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_webhooks_whatsapp_route_actions_64b9386e.js");
      case "server/chunks/ssr/[root-of-the-server]__4f7c61bf._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__4f7c61bf._.js");
      case "server/chunks/ssr/[root-of-the-server]__540ed229._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__540ed229._.js");
      case "server/chunks/ssr/[root-of-the-server]__b6f0535a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__b6f0535a._.js");
      case "server/chunks/ssr/_9d1ee929._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_9d1ee929._.js");
      case "server/chunks/ssr/_b987a89b._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_b987a89b._.js");
      case "server/chunks/ssr/_f1a4600a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_f1a4600a._.js");
      case "server/chunks/ssr/_next-internal_server_app_crm_page_actions_62c109e0.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_crm_page_actions_62c109e0.js");
      case "server/chunks/ssr/[root-of-the-server]__f437da88._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__f437da88._.js");
      case "server/chunks/ssr/_6f7a5c43._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_6f7a5c43._.js");
      case "server/chunks/ssr/_c1309523._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_c1309523._.js");
      case "server/chunks/ssr/_f3246be5._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_f3246be5._.js");
      case "server/chunks/ssr/_next-internal_server_app_page_actions_39d4fc33.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_page_actions_39d4fc33.js");
      case "server/chunks/ssr/[root-of-the-server]__8ee71551._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__8ee71551._.js");
      case "server/chunks/ssr/_8ca86393._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_8ca86393._.js");
      case "server/chunks/ssr/_9183c3e8._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_9183c3e8._.js");
      case "server/chunks/ssr/_aae5f29c._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_aae5f29c._.js");
      case "server/chunks/ssr/_next-internal_server_app_storefront_page_actions_ebfde6bd.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_storefront_page_actions_ebfde6bd.js");
      case "server/chunks/ssr/src_app_storefront_page_tsx_61f8ef7a._.js": return require("/home/z/my-project/crm-platform/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_storefront_page_tsx_61f8ef7a._.js");
      default:
        throw new Error(`Not found ${chunkPath}`);
    }
  }


  async function loadWasmChunk(chunkPath) {
    switch (chunkPath) {
      case "/home/z/my-project/crm-platform/.open-next/server-functions/default/node_modules/.prisma/client/query_compiler_bg.wasm": return (await import("/home/z/my-project/crm-platform/.open-next/server-functions/default/node_modules/.prisma/client/query_compiler_bg.wasm")).default;
      default:
        throw new Error(`Unknown wasm chunk: ${chunkPath}`);
    }
  }
