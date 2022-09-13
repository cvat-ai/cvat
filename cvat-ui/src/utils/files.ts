// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function getFileContentTypeByMimeType(mime_type: string): string {
    return mime_type.split('/')[0];
}

export function getFileContentType(file: File): string {
    return getFileContentTypeByMimeType(file.type);
}

export function checkFileTypesEqual(files: File[]): boolean {
    if (!files.length) return true;
    const typeFirstFile: string = getFileContentType(files[0]);
    return files.every((file) => getFileContentType(file) === typeFirstFile);
}

function checkCreatingVideoElement(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const el = document.createElement('video');
        el.src = url;
        el.onloadedmetadata = () => {
            el.remove();
            resolve();
        };
        el.onerror = reject;
    });
}

function checkCreatingImageElement(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const el = document.createElement('img');
        el.src = url;
        el.onload = () => {
            el.remove();
            resolve();
        };
        el.onerror = reject;
    });
}

function getUrlExtension(url: string): string {
    return url.split(/[#?]/)[0].split('.').pop()?.trim() || '';
}

// source https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const IMAGE_EXTENSIONS = ['apng', 'avif', 'gif', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'webp'];

// source https://en.wikipedia.org/wiki/Video_file_format
const VIDEO_EXTENSIONS = ['webm', 'mkv', 'flv', 'flv', 'vob', 'ogv', 'ogg', 'drc', 'gifv', 'mng', 'avi', 'MTS',
    'M2TS', 'TS', 'mov', 'qt', 'wmv', 'yuv', 'rm', 'rmvb', 'viv', 'asf', 'amv', 'mp4', 'm4p', 'm4v',
    'mpg', 'mp2', 'mpeg', 'mpe', 'mpv', 'mpg', 'mpeg', 'm2v', 'm4v', 'svi', '3gp', '3g2', 'mxf', 'roq',
    'nsv', 'flv', 'f4v', 'f4p', 'f4a', 'f4b',
];

export function getContentTypeRemoteFile(url: string): Promise<string> {
    return new Promise((resolve): void => {
        const extention = getUrlExtension(url);
        if (IMAGE_EXTENSIONS.includes(extention)) {
            resolve('image');
            return;
        }
        if (VIDEO_EXTENSIONS.includes(extention)) {
            resolve('video');
            return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);

        xhr.onreadystatechange = () => {
            const contentType = xhr.getResponseHeader('Content-Type');
            if (xhr.status > 299) {
                xhr.abort();
                resolve('unknown');
                return;
            }
            if (contentType) {
                xhr.abort();
                resolve(contentType.split('/')[0]);
            }
        };

        xhr.onerror = () => {
            checkCreatingVideoElement(url)
                .then(() => {
                    resolve('video');
                })
                .catch(() => {
                    checkCreatingImageElement(url);
                })
                .then(() => {
                    resolve('image');
                })
                .catch(() => {
                    resolve('unknown');
                });
        };

        xhr.send();
    });
}

export function getFileNameFromPath(path: string): string {
    return path.split('/').filter(Boolean).pop()?.split(/[#?]/)?.[0] || '';
}
