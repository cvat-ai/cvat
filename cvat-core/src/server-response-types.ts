// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { DimensionType } from 'enums';

export interface AnnotationImporterResponseBody {
    name: string;
    ext: string;
    version: string;
    enabled: boolean;
    dimension: DimensionType;
}

export type AnnotationExporterResponseBody = AnnotationImporterResponseBody;

export interface AnnotationFormatsResponseBody {
    importers: AnnotationImporterResponseBody[];
    exporters: AnnotationExporterResponseBody[];
}
