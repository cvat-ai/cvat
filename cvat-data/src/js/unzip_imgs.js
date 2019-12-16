const JSZip = require('jszip');

self.onmessage = function (e) {

    const zip = new JSZip();
    const start =  e.data.start;
    const end =  e.data.end;
    const block =  e.data.block;

    zip.loadAsync(block).then((_zip) => {
        fileMapping = {};
        let index = start;
        _zip.forEach((relativePath) => {

            fileMapping[relativePath] = index++;
        });
        index = start;
        let inverseUnzippedFilesCount = end;
        _zip.forEach((relativePath) => {
            const fileIndex = index++;

            _zip.file(relativePath).async('blob').then((fileData) => {
                const reader = new FileReader();
                reader.onload = (function(i, event){
                    postMessage({fileName : relativePath, index : fileIndex, data: reader.result, isEnd : inverseUnzippedFilesCount <= start});
                    inverseUnzippedFilesCount --;
                    if (inverseUnzippedFilesCount < start){
                        self.close();
                    }
                }).bind(fileIndex, relativePath);

                reader.readAsDataURL(fileData);
            });
        });
    });

}
