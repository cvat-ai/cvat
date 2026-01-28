// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { Project, Task, Job } from 'cvat-core-wrapper';

function ResourceLink({ resource }: { resource: Project | Task | Job }): JSX.Element | null {
    if (resource instanceof Project) {
        return (
            <Link to={`/projects/${resource.id}`}>
                {`Project #${resource.id}`}
            </Link>
        );
    }

    if (resource instanceof Task) {
        return (
            <Link to={`/tasks/${resource.id}`}>
                {`Task #${resource.id}`}
            </Link>
        );
    }

    if (resource instanceof Job) {
        return (
            <Link to={`/tasks/${resource.taskId}/jobs/${resource.id}`}>
                {`Job #${resource.id}`}
            </Link>
        );
    }

    return null;
}

export default React.memo(ResourceLink);
