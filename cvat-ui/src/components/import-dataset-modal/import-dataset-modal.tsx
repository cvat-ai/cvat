// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';

import { CombinedState } from 'reducers/interfaces';

function ImportDatasetModal(): JSX.Element {
    const modalVisible = useSelector((state: CombinedState) => state.import.modalVisible);

    return (
        <Modal
            title='Import dataset to project'
            visible={modalVisible}
            onCancel={() => {}}
            onOk={() => {}}
            className={`cvat-modal-import-${'project'}`}
        >
            <div />
        </Modal>
    );
}

export default ImportDatasetModal;
