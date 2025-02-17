// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import Progress from 'antd/lib/progress';

import { CombinedState } from 'reducers';

function UploadFileStatusModal(): JSX.Element {
    const {
        id: importingId,
        progress: importingProgress,
        status: importingStatus,
    } = useSelector((state: CombinedState) => {
        const { id, progress, status } = state.import.projects.dataset.uploadState;
        return {
            id,
            progress: id === null ? 0 : progress,
            status: id === null ? '' : status,
        };
    }, shallowEqual);

    return (
        <Modal
            title='Uploading the file'
            open={!!importingId && importingProgress < 100}
            closable={false}
            footer={null}
            className='cvat-modal-upload-file-status'
            destroyOnClose
        >
            <Progress type='circle' percent={importingProgress} />
            <Alert message={importingStatus} type='info' />
        </Modal>
    );
}

export default React.memo(UploadFileStatusModal);
