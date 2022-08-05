// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import Progress from 'antd/lib/progress';
import getCore from 'cvat-core-wrapper';

import { CombinedState } from 'reducers/interfaces';

const core = getCore();

function ImportDatasetStatusModal(): JSX.Element {
    const importing = useSelector((state: CombinedState) => state.import.importing);
    const instance = useSelector((state: CombinedState) => state.import.instance);
    const progress = useSelector((state: CombinedState) => {
        if (instance instanceof core.classes.Project) {
            return state.import.projects?.progress;
        }
    });
    const status = useSelector((state: CombinedState) => {
        if (instance instanceof core.classes.Project) {
            return state.import.projects?.status;
        }
    });

    return (
        <Modal
            title={`Importing a dataset for the project #${instance.id}`}
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
