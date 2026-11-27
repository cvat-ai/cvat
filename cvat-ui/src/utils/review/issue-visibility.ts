// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { Issue } from 'cvat-core-wrapper';

export function visibleFrameIssues(issues: Issue[], hidden: boolean, resolvedHidden: boolean): Issue[] {
    if (hidden) return [];
    return resolvedHidden ? issues.filter((issue) => !issue.resolved) : issues;
}

export function showIssueGeometry(issue: Issue, selectedId: number | null, highlightedId: number | null): boolean {
    return !issue.resolved || issue.id === selectedId || issue.id === highlightedId;
}
