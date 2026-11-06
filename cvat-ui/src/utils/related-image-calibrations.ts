// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { RelatedImageMetadata } from 'cvat-core-wrapper';

function getPathWithoutExtension(path: string, segmentsToKeep: number): string {
    const pathSegments = path.split('/');
    pathSegments.splice(0, Math.max(pathSegments.length - segmentsToKeep, 0));

    const fileName = pathSegments.pop() || '';
    const extensionIndex = fileName.lastIndexOf('.');
    const fileNameWithoutExtension = extensionIndex === -1 ? fileName : fileName.slice(0, extensionIndex);
    return [...pathSegments, fileNameWithoutExtension].join('/');
}

/**
 * Finds the related image metadata that matches the given related image name.
 * @param relatedImageMetas - An array of related image metadata.
 * @param relatedImageName - The name of the related image to match against.
 * It's a relative path that may contain folders.
 * @returns The matching related image metadata, or null if no match is found.
 */
export function getRelatedImageMetadata(
    relatedImageMetas: RelatedImageMetadata[],
    relatedImageName: string,
): RelatedImageMetadata | null {
    // relatedImageName is taken from the zip layout.
    // Backend strips common path and extension from all related images for a frame before creating the zip.
    // So for formats that don't have all related images in one folder zip may contain folders
    // and map related images to something like:
    // 0000/000001
    // 0001/000001
    // 0002/000001
    // The name in meta is the same path but it's normally relative to higher level folder
    // and it contains more segments and extension not stripped.
    const contextImagePathSegments = relatedImageName.split('/').length;

    return relatedImageMetas.find((meta) => (
        getPathWithoutExtension(meta.name, contextImagePathSegments) === relatedImageName
    )) || null;
}
