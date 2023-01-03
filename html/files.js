FS.mkdir('/idbfs');
FS.mount(IDBFS, { root: '.' }, '/idbfs');

function addFile(path, name, data) {
    FS.writeFile(`${path}/${name}`, data);
}

function downloadFile(path) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const contents = FS.readFile(path);
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
