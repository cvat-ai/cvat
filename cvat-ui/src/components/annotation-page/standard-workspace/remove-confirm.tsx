// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';

import config from 'config';
import { removeObjectAsync, removeObject as removeObjectAction } from 'actions/annotation-actions';
import { ObjectType } from 'cvat-core-wrapper';

export default function RemoveConfirmComponent(): JSX.Element | null {
    const dispatch = useDispatch();
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState<string | JSX.Element>('');
    const { objectState, force } = useSelector((state: CombinedState) => ({
        objectState: state.annotation.remove.objectState,
        force: state.annotation.remove.force,
    }), shallowEqual);

    const onOk = useCallback(() => {
        dispatch(removeObjectAsync(objectState, true));
    }, [objectState]);

    const onCancel = useCallback(() => {
        dispatch(removeObjectAction(null, false));
    }, []);

    useEffect(() => {
        const newVisible = (!!objectState && !force && objectState.lock) ||
            (objectState?.objectType === ObjectType.TRACK && !force);
        setTitle(objectState?.lock ? '对象已锁定' : '删除对象');
        let descriptionMessage: string | JSX.Element = '确认要删除吗？';

        if (objectState?.objectType === ObjectType.TRACK && !force) {
            descriptionMessage = (
                <>
                    <Text>
                        {
                            `你正在尝试删除的是“轨迹”对象。
                            如果继续，将删除该轨迹在不同帧上的多个标注。
                            如果你只是想在当前帧隐藏它，请改用“外部（Outside）”功能。
                            ${descriptionMessage}`
                        }
                    </Text>
                    <div className='cvat-remove-object-confirm-wrapper'>
                        {/* eslint-disable-next-line */}
                        <img src={config.OUTSIDE_PIC_URL} />
                    </div>
                </>
            );
        }

        setDescription(descriptionMessage);
        setVisible(newVisible);
        if (!newVisible && objectState) {
            dispatch(removeObjectAsync(objectState, true));
        }
    }, [objectState, force]);

    return (
        <Modal
            okType='primary'
            okText='是'
            cancelText='取消'
            title={title}
            open={visible}
            cancelButtonProps={{
                autoFocus: true,
            }}
            onOk={onOk}
            onCancel={onCancel}
            destroyOnClose
            className='cvat-modal-confirm-remove-object'
        >
            <div>
                {description}
            </div>
        </Modal>
    );
}

