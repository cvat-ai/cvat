// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getFileContentType } from 'utils/files';

function getUrlExtension(url: string): string {
    return (url.split(/[#?]/)[0].split('.').pop()?.trim() || '').toLowerCase();
}

const AUDIO_EXTENSIONS = ['aac', 'aif', 'aifc', 'aiff', 'amr', 'ape', 'au', 'flac', 'm4a', 'm4b',
    'mka', 'mp3', 'oga', 'ogg', 'opus', 'ra', 'wav', 'weba', 'wma',
];

export function isAudioFile(file: File): boolean {
    if (file.type) return getFileContentType(file) === 'audio';
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    return AUDIO_EXTENSIONS.includes(ext);
}

export function isAudioPath(path: string): boolean {
    return AUDIO_EXTENSIONS.includes(getUrlExtension(path));
}
