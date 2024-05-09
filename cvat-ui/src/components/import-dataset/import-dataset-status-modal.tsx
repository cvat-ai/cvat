// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import Progress from 'antd/lib/progress';

import { CombinedState } from 'reducers';

function ImportDatasetStatusModal(): JSX.Element {
    const current = useSelector((state: CombinedState) => state.import.projects.dataset.current);
    const [importingId, setImportingId] = useState<number | null>(null);

    useEffect(() => {
        const [id] = Object.keys(current);
        setImportingId(parseInt(id, 10));
    }, [current]);

    const importing = useSelector((state: CombinedState) => {
        if (!importingId) {
            return false;
        }
        return !!state.import.projects.dataset.current[importingId];
    });
    const progress = useSelector((state: CombinedState) => {
        if (!importingId) {
            return 0;
        }
        return state.import.projects.dataset.current[importingId]?.progress;
    });
    const status = useSelector((state: CombinedState) => {
        if (!importingId) {
            return '';
        }
        return state.import.projects.dataset.current[importingId]?.status;
    });

    return (
        <Modal
            title={`Importing a dataset for the project #${importingId}`}
            open={importing}
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
