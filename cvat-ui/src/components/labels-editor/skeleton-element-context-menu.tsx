import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Menu from 'antd/lib/menu';
import Modal from 'antd/lib/modal';

import LabelForm from './label-form';
import { fromSVGCoord, Label } from './common';

interface ContextMenuProps {
    elementID: number;
    labels: Record<number, Label>;
    container: SVGSVGElement;
    onConfigureLabel(elementID: number, data: Label | null): void;
    onDelete(element: SVGElement): void;
}

function SkeletonElementContextMenu(props: ContextMenuProps): JSX.Element {
    const {
        container, elementID, labels, onConfigureLabel, onDelete,
    } = props;
    const [modalVisible, setModalVisible] = useState<boolean>(false);

    const elementLabel = labels[elementID];
    const element = container.querySelector(`[data-element-id="${elementID}"]`);
    const [portalContainer] = window.document.getElementsByClassName('cvat-skeleton-canvas-wrapper');
    if (!element || !portalContainer) {
        throw new Error('SVG container or portal container are not found');
    }

    const cx = element.getAttribute('cx');
    const cy = element.getAttribute('cy');
    if (!cx || !cy) {
        throw new Error('Circle attributes "cx", "cy" are not defined');
    }

    const [x, y] = fromSVGCoord(container, [+cx, +cy]);
    return (
        <>
            <Modal
                okButtonProps={{ hidden: true }}
                cancelButtonProps={{ hidden: true }}
                visible={modalVisible}
                width={700}
            >
                <LabelForm
                    label={elementLabel}
                    labelNames={Object.values(labels).map((label: Label) => label.name)
                        .filter((name: string) => name !== elementLabel.name)}
                    onSubmit={(data) => {
                        setModalVisible(false);
                        onConfigureLabel(elementID, data);
                    }}
                />
            </Modal>
            { ReactDOM.createPortal(
                (
                    <Menu
                        onClick={({ key }) => {
                            if (key === 'configure_label') {
                                setModalVisible(true);
                            } else if (key === 'delete') {
                                onDelete(element as SVGElement);
                            }
                        }}
                        className='cvat-skeleton-configurator-context-menu'
                        style={{ top: y, left: x }}
                    >
                        <Menu.Item icon={<EditOutlined />} key='configure_label'>Configure</Menu.Item>
                        <Menu.Item icon={<DeleteOutlined />} key='delete'>Delete</Menu.Item>
                    </Menu>
                ), portalContainer,
            ) }
        </>
    );
}

export default React.memo(SkeletonElementContextMenu);
