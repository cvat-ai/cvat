// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';

import LabelForm from './label-form';
import { fromSVGCoord, LabelOptColor } from './common';

interface ContextMenuProps {
    elementID: number;
    labels: Record<number, LabelOptColor>;
    container: SVGSVGElement;
    onConfigureLabel(elementID: number, data: LabelOptColor | null): void;
    onDelete(element: SVGElement): void;
}

function WrappedSkeletonElementLabelForm(props: ContextMenuProps & { hideConfigurator: () => void }): JSX.Element {
    const {
        elementID, labels, onConfigureLabel, hideConfigurator,
    } = props;

    const elementLabel = labels[elementID];

    return (
        <Modal
            visible
            width={700}
            cancelButtonProps={{ hidden: true }}
            okButtonProps={{ hidden: true }}
            closable={false}
            destroyOnClose
        >
            <LabelForm
                label={elementLabel}
                labelNames={Object
                    .values(labels).map((label: LabelOptColor) => label.name)
                    .filter((name: string) => name !== elementLabel.name)}
                onSubmit={(data) => {
                    onConfigureLabel(elementID, data);
                    hideConfigurator();
                }}
                onCancel={() => {
                    onConfigureLabel(elementID, null);
                    hideConfigurator();
                }}
            />
        </Modal>
    );
}

function SkeletonElementContextMenu(props: ContextMenuProps): JSX.Element {
    const {
        container, elementID, onDelete,
    } = props;
    const [configuratorVisible, setConfiguratorVisible] = useState(false);

    const targetPoint = container.querySelector(`[data-element-id="${elementID}"]`);
    if (!targetPoint) {
        throw new Error('Target SVG point was not found');
    }

    const cx = targetPoint.getAttribute('cx');
    const cy = targetPoint.getAttribute('cy');

    if (!cx || !cy) {
        throw new Error('Circle attributes "cx", "cy" are not defined');
    }

    const [x, y] = fromSVGCoord(container, [+cx, +cy]);
    return ReactDOM.createPortal((
        <>
            {configuratorVisible && (
                <WrappedSkeletonElementLabelForm
                    {...props}
                    hideConfigurator={() => {
                        setConfiguratorVisible(false);
                    }}
                />
            )}
            {!configuratorVisible && (
                <div
                    className='cvat-skeleton-configurator-context-menu'
                    style={{ top: y, left: x }}
                >
                    <Button
                        type='link'
                        onClick={() => {
                            setConfiguratorVisible(true);
                        }}
                        icon={<EditOutlined />}
                        key='configure_label'
                    >
                        Configure
                    </Button>
                    <Button
                        type='link'
                        onClick={() => {
                            onDelete(targetPoint as SVGElement);
                        }}
                        icon={<DeleteOutlined />}
                        key='delete'
                    >
                        Delete
                    </Button>
                </div>
            )}
        </>
    ), window.document.body);
}

export default React.memo(SkeletonElementContextMenu);
