var Module = {
    onRuntimeInitialized: async function() {
	FS.mkdir('/idbfs');
	FS.mount(IDBFS, { root: '.' }, '/idbfs');
	cwd('/idbfs');
	FS.syncfs(true, listFiles);
    }
};

function cwd(path) {
    const pathEl = document.getElementById("current-path");
    FS.chdir(path);
    pathEl.textContent = FS.cwd();
    listFiles();
}

function pathOf(name) {
    return `${FS.cwd()}/${name}`;
}

function openDirButton(file) {
    const button = document.createElement("button");
    button.addEventListener("click", function(){
	cwd(pathOf(file));
    });
    button.textContent = "open";
    const label = `open ${file}`;
    button.ariaLabel = label;
    button.title = label;
    return button;
}

function downloadFileButton(file) {
    const button = document.createElement("button");
    button.addEventListener("click", function(){
	downloadFile(file);
    });
    button.textContent = "download";
    const label = `download ${file}`;
    button.ariaLabel = label;
    button.title = label;
    return button;
}

function deleteFileButton(file) {
    const button = document.createElement("button");
    button.addEventListener("click", function(){
	FS.unlink(pathOf(file));
	FS.syncfs(false, listFiles);
    });
    button.textContent = "delete";
    const label = `delete ${file}`;
    button.ariaLabel = label;
    button.title = label;
    return button;
}

function openFileButton(file) {
    const button = document.createElement("button");
    button.addEventListener("click", function(){
	localStorage.setItem('to-run', pathOf(file));
	location.href = '../';
    });
    button.textContent = "run";
    const label = `run ${file}`;
    button.ariaLabel = label;
    button.title = label;
    return button;
}

function makeFileListing(file) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = file;
    const actions = document.createElement("td");
    const mode = FS.stat(file).mode;
    if (FS.isDir(mode)) {
	actions.appendChild(openDirButton(file));
    } else if (FS.isFile(mode)) {
	actions.appendChild(openFileButton(file));
	actions.appendChild(downloadFileButton(file));
	actions.appendChild(deleteFileButton(file));
    }
    
    tr.appendChild(name);
    tr.appendChild(actions);
    return tr;
}

function listFiles() {
    const files = FS.readdir(".");
    const fileTable = document.getElementById("file-list");
    for (let i = fileTable.children.length - 1 ; i >= 1 ; --i) {
	const child = fileTable.children[i];
	fileTable.removeChild(child);
    }
    for (let file of files) {
	fileTable.appendChild(makeFileListing(file));
    }
}

function addFileFromInput(input, event) {
    const files = input.files;
    window.files = files;
    for (var i = 0; i < files.length; ++i) {
	const file = files[i];
	const file_reader = new FileReader();
        file_reader.onload = function(){
	    addFile(FS.cwd(), file.name, file_reader.result);
	    FS.syncfs(false, listFiles);
	};
        //file_reader.onabort = close;
        //file_reader.onerror = close;
        file_reader.readAsBinaryString(file);
    }
}

function addFile(path, name, data) {
    FS.writeFile(`${path}/${name}`, data);
}

function downloadFile(path) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const contents = FS.readFile(path, {encoding: 'utf8'});
    const href = `data:;base64,${btoa(contents)}`;
    downloadLink(name, href);
}

function downloadLink(name, href) {
    const a = document.createElement("a");
    a.textContent = `download ${name}`;
    a.setAttribute("href", href);
    a.setAttribute("download", name);
    a.click();
}
