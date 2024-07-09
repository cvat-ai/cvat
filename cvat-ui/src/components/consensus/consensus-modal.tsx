// Copyright (c) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Form from 'antd/lib/form';
import { CombinedState } from 'reducers';
import { getCore } from 'cvat-core-wrapper';

import { consensusActions, mergeTaskConsensusJobsAsync } from 'actions/consensus-actions';

import CVATLoadingSpinner from 'components/common/loading-spinner';
import { Button } from 'antd/lib';
import { Divider, notification } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import ConsensusSettingsForm from './consensus-settings-form';

const core = getCore();

function ConsensusModal(): JSX.Element {
    const dispatch = useDispatch();
    const [form] = Form.useForm();

    const instance = useSelector((state: CombinedState) => state.consensus?.taskInstance);

    const fetching = useSelector((state: CombinedState) => state.consensus?.fetching);

    const consensusSettings = useSelector((state: CombinedState) => state.consensus?.consensusSettings);

    const mergingIsActive = useSelector((state: CombinedState) => state.consensus?.mergingConsensus[instance?.id]);

    function handleError(error: Error): void {
        notification.error({
            description: error.toString(),
            message: 'Could not fetch consensus settings.',
        });
    }

    useEffect(() => {
        if (instance) {
            dispatch(consensusActions.setFetching(true));

            const settingsRequest = core.consensus.settings.get({ taskID: instance.id });

            Promise.all([settingsRequest])
                .then(([settings]) => {
                    dispatch(consensusActions.setConsensusSettings(settings));
                })
                .catch(handleError)
                .finally(() => {
                    dispatch(consensusActions.setFetching(false));
                });
        }
    }, [instance?.id]);

    const closeModal = (): void => {
        form.resetFields();
        dispatch(consensusActions.closeConsensusModal(instance));
    };

    const handleMerge = useCallback(() => {
        dispatch(mergeTaskConsensusJobsAsync(instance));
        Notification.info({
            message: 'Merging consensus jobs...',
            description: 'Merge Report will be available as the merging process is completed successfully.',
            className: 'cvat-notification-notice-export-backup-start',
        });
    }, [instance]);

    return (
        <Modal
            title={<Text> Consensus Configuration </Text>}
            open={!!instance}
            className='cvat-modal-export-task custom-modal-center-title'
            destroyOnClose
            confirmLoading={fetching}
            footer={null}
            onCancel={closeModal}
        >
            {fetching && instance ? (
                <CVATLoadingSpinner size='large' />
            ) : (
                <ConsensusSettingsForm
                    settings={consensusSettings}
                    setConsensusSettings={(settings) => dispatch(consensusActions.setConsensusSettings(settings))}
                />
            )}
            <Divider />
            <Form
                name='Consensus'
                form={form}
                layout='vertical'
                onFinish={handleMerge}
                className='consensus-modal-form'
            >
                <Button
                    type='default'
                    htmlType='submit'
                    disabled={mergingIsActive}
                    icon={mergingIsActive && <LoadingOutlined />}
                >
                    {' '}
                    Merge Consensus Task
                </Button>
            </Form>
        </Modal>
    );
}

export default React.memo(ConsensusModal);
