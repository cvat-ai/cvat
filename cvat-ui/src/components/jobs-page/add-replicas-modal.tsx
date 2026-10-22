// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';

import { Job } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { createReplicaJobAsync, jobsActions } from 'actions/jobs-actions';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import config from 'config';

interface Props {
    fetchJobs?: () => void;
}

function AddReplicasModal(props: Readonly<Props>): JSX.Element {
    const { fetchJobs } = props;
    const dispatch = useDispatch();
    const { visible, jobs } = useSelector((state: CombinedState) => ({
        visible: state.jobs.addReplicas.modalVisible,
        jobs: state.jobs.addReplicas.jobs,
    }), shallowEqual);
    const [count, setCount] = useState<number | null>(1);
    const isBulkMode = jobs.length > 1;

    useEffect(() => {
        if (visible) {
            setCount(1);
        }
    }, [visible]);

    const onCancel = (): void => {
        dispatch(jobsActions.closeAddReplicasModal());
    };

    const onAdd = (): void => {
        if (count === null) {
            return;
        }

        dispatch(makeBulkOperationAsync(
            jobs.flatMap((job) => Array<Job>(count).fill(job)),
            async (job) => {
                await dispatch(createReplicaJobAsync(job));
            },
            (job, idx, total) => `Adding a replica to job #${job.id} (${idx + 1}/${total})`,
            fetchJobs,
        )).catch(() => {});
        onCancel();
    };

    return (
        <Modal
            destroyOnClose
            open={visible}
            title={isBulkMode ? `Add replicas to ${jobs.length} selected jobs` : `Add replicas to job #${jobs[0]?.id}`}
            className='cvat-modal-add-replicas'
            okText='Add'
            okButtonProps={{ disabled: count === null }}
            onCancel={onCancel}
            onOk={onAdd}
        >
            <Text>{isBulkMode ? 'Replicas per job: ' : 'Number of replicas: '}</Text>
            <InputNumber
                className='cvat-add-replicas-count-input'
                autoFocus
                min={1}
                max={config.MAX_REPLICAS_TO_ADD}
                precision={0}
                value={count}
                onChange={(value: number | null) => {
                    setCount(value);
                }}
            />
        </Modal>
    );
}

export default React.memo(AddReplicasModal);
