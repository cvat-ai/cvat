// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Modal from 'antd/lib/modal';

import { Organization, Project, Task } from 'cvat-core-wrapper';

export function confirmTransferModal(
    instances: Project[] | Task[],
    activeWorkspace: Organization | null,
    dstWorkspace: Organization | null,
    onOk: () => void,
): void {
    const first = instances[0];
    if (!first) {
        return;
    }

    const instanceType = first instanceof Task ? 'task' : 'project';
    const movingItems = instances.length > 1 ?
        `${instances.length} ${instanceType}s` : `the ${instanceType} #${first.id}`;
    let details = `You are going to move ${movingItems} ` +
        `to the ${dstWorkspace ? `organization ${dstWorkspace.slug}` : 'personal workspace'}. `;
    if (activeWorkspace) {
        details += 'Organization members will lose access to ' +
            `${instances.length > 1 ? 'these resources' : 'this resource'}.`;
    }

    Modal.confirm({
        title: 'Data transfer between workspaces',
        content: `${details} Would you like to proceed?`,
        className: 'cvat-modal-confirm-project-transfer-between-workspaces',
        onOk,
        okButtonProps: {
            type: 'primary',
            danger: true,
        },
        okText: 'Continue',
    });
}
