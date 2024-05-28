// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import Progress from 'antd/lib/progress';

import { CombinedState } from 'reducers';

function ImportDatasetStatusModal(): JSX.Element {
    const importingId = useSelector((state: CombinedState) => state.import.projects.dataset.uploadState.id);

    const progress = useSelector((state: CombinedState) => {
        if (!importingId) {
            return 0;
        }
        return state.import.projects.dataset.uploadState?.progress;
    });
    const status = useSelector((state: CombinedState) => {
        if (!importingId) {
            return '';
        }
        return state.import.projects.dataset.uploadState?.status;
    });

    return (
        <Modal
            title={`Importing a dataset for the project #${importingId}`}
            open={!!importingId && progress < 100}
            closable={false}
            footer={null}
            className='cvat-modal-import-dataset-status'
            destroyOnClose
        >
            <Progress type='circle' percent={progress} />
            <Alert message={status} type='info' />
        </Modal>
    );
}

export default React.memo(ImportDatasetStatusModal);
