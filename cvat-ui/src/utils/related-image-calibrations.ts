// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { RelatedImageCalibration } from 'cvat-core-wrapper';

function getPathWithoutExtension(path: string, segmentsToKeep: number): string {
    const pathSegments = path.split('/');
    pathSegments.splice(0, Math.max(pathSegments.length - segmentsToKeep, 0));

    const fileName = pathSegments.pop() || '';
    const extensionIndex = fileName.lastIndexOf('.');
    const fileNameWithoutExtension = extensionIndex === -1 ? fileName : fileName.slice(0, extensionIndex);
    return [...pathSegments, fileNameWithoutExtension].join('/');
}

export function getRelatedImageCalibration(
    calibrations: RelatedImageCalibration[],
    contextImageName: string,
): RelatedImageCalibration | null {
    const contextImagePathSegments = contextImageName.split('/').length;

    return calibrations.find((calibration) => (
        getPathWithoutExtension(calibration.name, contextImagePathSegments) === contextImageName
    )) || null;
}
