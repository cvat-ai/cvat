// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import Progress from 'antd/lib/progress';
import getCore from 'cvat-core-wrapper';

import { CombinedState } from 'reducers';

const core = getCore();

function ImportDatasetStatusModal(): JSX.Element | null {
    const importing = useSelector((state: CombinedState) => state.import.importing);
    const importingId = useSelector((state: CombinedState) => state.import.projects?.importingId);
    const progress = useSelector((state: CombinedState) => state.import.projects?.progress);
    const status = useSelector((state: CombinedState) => {
        return state.import.projects?.status;
    });

    if (!importingId) {
        return null;
    }
    return (
        <Modal
            title={`Importing a dataset for the project #${importingId}`}
            visible={importing}
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
