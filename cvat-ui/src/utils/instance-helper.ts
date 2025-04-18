// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useParams, useLocation } from 'react-router';

export type InstanceType = 'project' | 'task' | 'job';

export function readInstanceType(location: ReturnType<typeof useLocation>): InstanceType {
    if (location.pathname.includes('projects')) {
        return 'project';
    }
    if (location.pathname.includes('jobs')) {
        return 'job';
    }
    return 'task';
}

export function readInstanceId(type: InstanceType): number {
    if (type === 'project') {
        return +useParams<{ pid: string }>().pid;
    }
    if (type === 'job') {
        return +useParams<{ jid: string }>().jid;
    }
    return +useParams<{ tid: string }>().tid;
}
