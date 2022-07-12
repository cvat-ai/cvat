// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';

import Modal from 'antd/lib/modal';
import { removeObjectAsync, removeObject as removeObjectAction } from 'actions/annotation-actions';

export default function RemoveConfirmComponent(): JSX.Element | null {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const objectState = useSelector((state: CombinedState) => state.annotation.remove.objectState);
    const force = useSelector((state: CombinedState) => state.annotation.remove.force);
    const jobInstance = useSelector((state: CombinedState) => state.annotation.job.instance);
    const dispatch = useDispatch();

    const onOk = useCallback(() => {
        dispatch(removeObjectAsync(jobInstance, objectState, true));
    }, [jobInstance, objectState]);
    const onCancel = useCallback(() => {
        dispatch(removeObjectAction(null, false));
    }, []);

    useEffect(() => {
        const newVisible = !!objectState && !force && objectState.lock;
        setTitle(objectState?.lock ? 'Object is locked' : 'Remove object');
        setVisible(newVisible);
        if (!newVisible && objectState) {
            dispatch(removeObjectAsync(jobInstance, objectState, true));
        }
    }, [objectState, force]);

    return (
        <Modal
            okType='primary'
            okText='Yes'
            cancelText='Cancel'
            title={title}
            visible={visible}
            onOk={onOk}
            onCancel={onCancel}
            className='cvat-modal-confirm'
        >
            <div>
                Are you sure you want to remove it?
            </div>
        </Modal>
    );
}
