// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function getFileContentTypeByMimeType(mimeType: string): string {
    return mimeType.split('/')[0];
}

export function getFileContentType(file: File): string {
    return getFileContentTypeByMimeType(file.type);
}

export function checkFileTypesEqual(files: File[]): boolean {
    if (!files.length) return true;
    const typeFirstFile: string = getFileContentType(files[0]);
    return files.every((file) => getFileContentType(file) === typeFirstFile);
}

function getUrlExtension(url: string): string {
    return (url.split(/[#?]/)[0].split('.').pop()?.trim() || '').toLowerCase();
}

// source https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const IMAGE_EXTENSIONS = ['3ds', 'ag', 'arw', 'bay', 'bmp', 'bmq', 'cgm', 'cr2', 'crw', 'cs1', 'cs2', 'cur', 'dcr',
    'dds', 'djv', 'djvu', 'dng', 'dwg', 'dxf', 'emf', 'eps', 'eps.bz2', 'eps.gz', 'epsf', 'epsf.bz2', 'epsf.gz',
    'epsi', 'epsi.bz2', 'epsi.gz', 'erf', 'exr', 'fff', 'fig', 'fits', 'g3', 'gif', 'hdr', 'hrd', 'icb',
    'icns', 'ico', 'ief', 'iff', 'ilbm', 'jng', 'jp2', 'jpe', 'jpeg', 'jpf', 'jpg', 'jpx', 'k25', 'kdc',
    'lbm', 'lwo', 'lwob', 'lws', 'mdc', 'mdi', 'mos', 'mrw.', 'msod', 'nef', 'ora', 'orf', 'pbm', 'pct', 'pcx',
    'pef', 'pgm', 'pic', 'pict', 'pict1', 'pict2', 'png', 'pnm', 'pntg', 'pnx', 'ppm', 'psd', 'qif', 'qtif', 'raf',
    'ras', 'raw', 'rdc', 'rgb', 'rle', 'rp', 'rw2', 'sgi', 'sk', 'sk1', 'sr2', 'srf', 'sun', 'svg', 'svgz', 'tga',
    'tif', 'tiff', 'tpic', 'vda', 'vst', 'wbmp', 'webp', 'wmf', 'x3f', 'xbm', 'xcf', 'xcf.bz2', 'xcf.gz', 'xpm', 'xwd',
];

// source https://en.wikipedia.org/wiki/Video_file_format
const VIDEO_EXTENSIONS = ['3g2', '3ga', '3gp', '3gp2', '3gpp', '3gpp2', 'amv', 'asf', 'avf', 'avi', 'axv', 'bdm',
    'bdmv', 'clpi', 'cpi', 'divx', 'drc', 'dv', 'f4a', 'f4b', 'f4p', 'f4v', 'flc', 'fli', 'flv', 'fxm', 'gifv',
    'lrv', 'm1u', 'm2t', 'm2ts', 'm2v', 'm4p', 'm4u', 'm4v', 'mk3d', 'mkv', 'mng', 'moov', 'mov', 'movie',
    'mp2', 'mp4', 'mpe', 'mpeg', 'mpg', 'mpl', 'mpls', 'mpv', 'mts', 'mxf', 'mxu', 'nsv', 'ogg', 'ogm', 'ogv',
    'qt', 'qtvr', 'rm', 'rmvb', 'roq', 'rv', 'rvx', 'svi', 'ts', 'vdr', 'viv', 'vivo', 'vob', 'webm', 'wmp', 'wmv', 'yuv',
];

export function getContentTypeRemoteFile(url: string): 'image' | 'video' | 'unknown' {
    const extension = getUrlExtension(url);
    if (IMAGE_EXTENSIONS.includes(extension)) {
        return 'image';
    }

    if (VIDEO_EXTENSIONS.includes(extension)) {
        return 'video';
    }

    return 'unknown';
}

export function getFileNameFromPath(path: string): string {
    return path.split('/').filter(Boolean).pop()?.split(/[#?]/)?.[0] || '';
}
