// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { RelatedImageCalibration } from 'cvat-core-wrapper';

function getFileName(name: string): string {
    const fileName = name.split('/').pop() || name;
    const extensionIndex = fileName.lastIndexOf('.');
    return extensionIndex === -1 ? fileName : fileName.slice(0, extensionIndex);
}

export function getRelatedImageCalibration(
    calibrations: RelatedImageCalibration[],
    contextImageName: string,
): RelatedImageCalibration | null {
    const contextImageFileName = getFileName(contextImageName);

    return calibrations.find((calibration) => (
        getFileName(calibration.name) === contextImageFileName
    )) || null;
}
