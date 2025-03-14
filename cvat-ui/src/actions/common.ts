// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore, ProjectOrTaskOrJob } from 'cvat-core-wrapper';
import { RequestInstanceType } from './requests-actions';

const core = getCore();

export function getInstanceType(instance: ProjectOrTaskOrJob | RequestInstanceType): 'project' | 'task' | 'job' {
    if (instance instanceof core.classes.Project) {
        return 'project';
    }

    if (instance instanceof core.classes.Task) {
        return 'task';
    }

    if (instance instanceof core.classes.Job) {
        return 'job';
    }

    return instance.type;
}
