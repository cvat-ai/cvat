// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import Progress from 'antd/lib/progress';

import { CombinedState } from 'reducers/interfaces';

function ImportDatasetStatusModal(): JSX.Element {
    const currentImportId = useSelector((state: CombinedState) => state.import.importingId);
    const progress = useSelector((state: CombinedState) => state.import.progress);
    const status = useSelector((state: CombinedState) => state.import.status);

    return (
        <Modal
            title={`Importing a dataset for the project #${currentImportId}`}
            visible={currentImportId !== null}
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
