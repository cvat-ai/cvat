// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

export function getFileContentType(file: File): string {
    return file.type.split('/')[0];
}

export function checkFileTypesEqual(files: File[]): boolean {
    if (!files.length) return true;
    const typeFirstFile: string = getFileContentType(files[0]);
    return files.every((file) => getFileContentType(file) === typeFirstFile);
}

function getUrlExtension(url: string): string {
    return url.split(/[#?]/)[0].split('.').pop()?.trim() || '';
}

export function getContentTypeRemoteFile(url: string): string {
    console.log(url);
    // TODO:
    // 1. check extention
    // 2. try load used XMLHttpRequest (https://jsfiddle.net/2fhmwbaj/1/)
    // 3. if cors error, try load used document.createElement('video') and add src and try load
    return getUrlExtension(url) === 'mp4' ? 'video' : 'image'; // TODO
}

export function getNameRemoteFile(url: string): string {
    console.log(url);
    return url; // TODO
}
