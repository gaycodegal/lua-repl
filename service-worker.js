const addResourcesToCache = async (resources) => {
  const cache = await caches.open("v1");
  await cache.addAll(resources);
};

self.addEventListener("install", event => {
    event.waitUntil(
	addResourcesToCache([
	    ".",
	    "index.html",
	    "manifest.json",
	    "favicon.ico",
	    
	    "html/file-management.html",
	    "html/manual.html",
	    "html/license.html",

	    "html/dark-mode.js",
	    "html/helpers.js",
	    "html/style.css",
	    "html/files.js",
	    "html/lua.js",
	    "html/lua.wasm",
	    "html/term.js",
	    "html/icons/lua-logo-192-mask.webp",
	    "html/icons/lua-logo-192.webp",
	    "html/icons/open_in_new_FILL0_wght400_GRAD0_opsz48.svg",

	    // files for the Lua Docs
	    "doc/contents.html",
	    "doc/logo.gif",
	    "doc/manual.css",
	    "doc/osi-certified-72x60.png",
	    "doc/index.css",
	    "doc/lua.css",
	    "doc/manual.html",
	    "doc/readme.html",
	])
    );
});

self.addEventListener("fetch", (event) => {
    console.log(event);
  event.respondWith(caches.match(event.request));
});

console.log("hi");
