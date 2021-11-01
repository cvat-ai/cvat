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
    const projects = useSelector((state: CombinedState) => state.import.projects);
    const progress = useSelector((state: CombinedState) => state.import.progress);
    const status = useSelector((state: CombinedState) => state.import.status);
    const id = Object.keys(projects).length && Object.keys(projects)[0];

    return (
        <Modal
            title={`Importing dataset for project #${id}`}
            visible={!!id}
            closable={false}
            footer={null}
            className='cvat-modal-import-project-status'
        >
            <Progress type='circle' percent={progress} />
            <Alert message={status} type='info' />
        </Modal>
    );
}

export default ImportDatasetStatusModal;
