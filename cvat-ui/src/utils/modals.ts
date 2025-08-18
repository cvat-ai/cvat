// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Modal from 'antd/lib/modal';

import { Organization, Project, Task } from 'cvat-core-wrapper';

export function confirmTransferModal(
    instance: Project | Task,
    activeWorkspace: Organization | null,
    dstWorkspace: Organization | null,
    onOk: (id: number | null) => void,
): void {
    const instanceType = instance.constructor.name.toLowerCase();
    let details = `You are going to move a ${instanceType} to the ` +
            `${(dstWorkspace) ? `${dstWorkspace.slug} organization` : 'Personal sandbox'}`;
    if (activeWorkspace) {
        details += `. Other organization members will lose access to the ${instanceType}`;
    }
    Modal.confirm({
        title: `Transfer the ${instanceType} #${instance.id} to another workspace`,
        content: (
            `${details}. Continue?`
        ),
        className: 'cvat-modal-confirm-project-transfer-between-workspaces',
        onOk: () => {
            onOk(dstWorkspace?.id || null);
        },
        okButtonProps: {
            type: 'primary',
            danger: true,
        },
        okText: (activeWorkspace) ? 'Move anyway' : 'Continue',
    });
}
