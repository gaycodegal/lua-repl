window.db = new Promise((accept, reject)=>{
    const openReq = indexedDB.open("app-files", 2);

    openReq.onblocked = event => {
	// If some other tab is loaded with the database,
	// then it needs to be closed before we can proceed.
	print("Please close all other tabs with this site open!\n");
    };

    openReq.onupgradeneeded = event => {
	const db = event.target.result;
	// All other databases have been closed. Set everything up.
	const os = db.createObjectStore("files", {keyPath: "path"});
	os.createIndex("content", "content", { unique: false });
	os.createIndex("size", "size", { unique: false });
	os.createIndex("access_date", "access_date", { unique: false });
	os.createIndex("modify_date", "modify_date", { unique: false });
	os.createIndex("mime_type", "mime_type", { unique: false });
	
	useDatabase(db);
    };

    openReq.onsuccess = event => {
	const db = event.target.result;
	useDatabase(db);
	return;
    };
    
    function useDatabase(db) {
	// Make sure to add a handler to be notified if another page
	// requests a version change. We must close the database.
	// This allows the other page to upgrade the database.
	// If you don't do this then the upgrade won't happen until
	// the user closes the tab.
	db.onversionchange = event => {
	    db.close();
	    print("You opened another tab, triggering an update. This tab will cease to function. Please reload or close.\n");
	    reject();
	};

	// Do stuff with the database.
	accept(db);
    }

});

async function writeFile(path, content) {
    const db = await window.db;
    transaction = db.transaction("files", "readwrite");
    files = transaction.objectStore('files');
    const size = content.length;
    const access_date = new Date();
    const modify_date = new Date();
    const file = {path, content, size, access_date, modify_date};
    files.add(file);
    transaction.commit(); // doesn't technically need to be called
}

function readFile(path) {
    return new Promise((accept, reject) => {
	const db = await window.db;
	transaction = db.transaction("files", "readwrite");
	files = transaction.objectStore('files');
	const request = files.get(path);
	console.log(request);
	request.onerror = event => {reject(event.target.result)};
	request.onsuccess = event => {accept(event.target.result)};
	transaction.commit(); // doesn't technically need to be called
    });
}
