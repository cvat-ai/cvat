// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

import Modal from 'antd/lib/modal';
import { removeObjectsAsync, removeObjects as removeObjectsAction } from 'actions/annotation-actions';

export default function RemoveConfirmComponent(): JSX.Element | null {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const objectStates = useSelector((state: CombinedState) => state.annotation.remove.objectStates);
    const force = useSelector((state: CombinedState) => state.annotation.remove.force);
    const jobInstance = useSelector((state: CombinedState) => state.annotation.job.instance);
    const dispatch = useDispatch();

    const onOk = useCallback(() => {
        dispatch(removeObjectsAsync(jobInstance, objectStates, true));
    }, [jobInstance, objectStates]);
    const onCancel = useCallback(() => {
        dispatch(removeObjectsAction([], false));
    }, []);

    useEffect(() => {
        if (objectStates.length === 0) {
            // No pending objects to delete
            setVisible(false);
            return;
        }
        const anyLocked = !!objectStates.find((os) => os.lock);
        const newVisible = !force && anyLocked;
        setTitle(anyLocked ? 'Object is locked' : 'Remove object');
        setVisible(newVisible);

        // If none of the objects are locked then the dialog doesn't show, but the object removal still flows
        // through here!!!
        if (!newVisible) {
            dispatch(removeObjectsAsync(jobInstance, objectStates, true));
        }
    }, [objectStates, force]);

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
