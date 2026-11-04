// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Modal from 'antd/lib/modal';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import Space from 'antd/lib/space';
import Upload, { RcFile } from 'antd/lib/upload';
import notification from 'antd/lib/notification';
import _ from 'lodash';
import { ArrowRightOutlined, UploadOutlined } from '@ant-design/icons';

import {
    getCore, Job, ServerError, User,
} from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { jobsActions } from 'actions/jobs-actions';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import { shallowEqual } from 'utils/redux';

import './styles.scss';

const core = getCore();

const USERNAMES_PER_REQUEST = 50;

interface Props {
    listedJobIds?: number[];
}

const searchUsers = _.debounce(
    (search: string, setOptions: (users: User[]) => void): void => {
        core.users.get({ search, is_active: true }).then(setOptions);
    }, 500,
);

async function getUsersByUsernames(usernames: string[]): Promise<User[]> {
    const found: User[] = [];
    for (const chunk of _.chunk(usernames, USERNAMES_PER_REQUEST)) {
        const filter = JSON.stringify({
            or: chunk.map((username) => ({ '==': [{ var: 'username' }, username] })),
        });
        found.push(...await core.users.get({ filter, is_active: true, pageSize: chunk.length }));
    }

    const usersByUsername = _.keyBy(found, 'username');
    return usernames.map((username) => usersByUsername[username]).filter(Boolean);
}

function distributeRoundRobin(jobs: Job[], users: User[]): { job: Job; assignee: User }[] {
    if (!users.length) {
        return [];
    }

    return jobs.map((job, idx) => ({ job, assignee: users[idx % users.length] }));
}

function DistributeJobsModal(props: Readonly<Props>): JSX.Element {
    const { listedJobIds } = props;
    const dispatch = useDispatch();
    const { visible, jobs } = useSelector((state: CombinedState) => ({
        visible: state.jobs.distributeJobs.modalVisible,
        jobs: state.jobs.distributeJobs.jobs,
    }), shallowEqual);
    const [users, setUsers] = useState<User[]>([]);
    const [initialOptions, setInitialOptions] = useState<User[]>([]);
    const [options, setOptions] = useState<User[]>([]);
    const [fetchingUsers, setFetchingUsers] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);

    // selected jobs hidden by the current filter go last
    const orderedJobs = listedJobIds ? _.sortBy(jobs, (job: Job) => {
        const idx = listedJobIds.indexOf(job.id);
        return idx === -1 ? Infinity : idx;
    }) : jobs;

    const assignments = distributeRoundRobin(orderedJobs, users);

    useEffect(() => {
        if (visible) {
            setUsers([]);
            core.users.get({ is_active: true }).then((result: User[]) => {
                setInitialOptions(result);
                setOptions(result);
            });
        }
    }, [visible]);

    const onCancel = (): void => {
        dispatch(jobsActions.closeDistributeJobsModal());
    };

    const onDistribute = (): void => {
        const jobsToUpdate = assignments.filter(({ job, assignee }) => job.assignee?.id !== assignee.id);
        if (jobsToUpdate.length) {
            dispatch(makeBulkOperationAsync(
                jobsToUpdate,
                async ({ job, assignee }) => {
                    try {
                        dispatch(jobsActions.updateJobSuccess(await job.save({ assignee })));
                    } catch (error: unknown) {
                        if (!(error instanceof ServerError && [400, 404].includes(error.code))) {
                            throw error;
                        }
                    }
                },
                ({ job, assignee }, idx, total) => (
                    `Assigning job #${job.id} to ${assignee.username} (${idx + 1}/${total})`
                ),
            )).catch((error: unknown) => {
                dispatch(jobsActions.updateJobFailed(jobsToUpdate[0].job.id, error));
            });
        }
        onCancel();
    };

    const appendUsers = useCallback((newUsers: User[]): void => {
        setUsers((prevUsers) => _.uniqBy([...prevUsers, ...newUsers], 'id'));
    }, []);

    const addUsersByUsernames = (usernames: string[]): void => {
        setSuggestionsOpen(false);
        setFetchingUsers(true);
        getUsersByUsernames(usernames).then(appendUsers).finally(() => setFetchingUsers(false));
    };

    const onPaste = (event: React.ClipboardEvent): void => {
        const usernames = _.uniq(event.clipboardData.getData('text').split(/[\s,;]+/).filter(Boolean));
        if (usernames.length > 1) {
            event.preventDefault();
            event.stopPropagation();
            addUsersByUsernames(usernames);
        }
    };

    const onUploadCSV = (file: RcFile): boolean => {
        file.text().then((text) => {
            const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
            if (rows.some((row) => /[,;\t]/.test(row))) {
                notification.error({
                    message: 'The CSV file must have only one column with usernames',
                    className: 'cvat-notification-notice-distribute-jobs-invalid-csv',
                });
            } else {
                addUsersByUsernames(_.uniq(rows));
            }
        });
        return false;
    };

    // the search is cleared on blur without calling onSearch
    const resetOptions = (): void => {
        searchUsers.cancel();
        setOptions(initialOptions);
    };

    const knownUsers = _.uniqBy([...users, ...options], 'id');

    return (
        <Modal
            destroyOnClose
            open={visible}
            title={`Distribute ${orderedJobs.length} jobs`}
            className='cvat-modal-distribute-jobs'
            okText='Distribute'
            okButtonProps={{ disabled: !users.length || fetchingUsers }}
            onCancel={onCancel}
            onOk={onDistribute}
        >
            <Text strong>Usernames</Text>
            <div onPasteCapture={onPaste}>
                <Select
                    className='cvat-distribute-jobs-users'
                    popupClassName='cvat-distribute-jobs-users-dropdown'
                    mode='multiple'
                    showSearch
                    autoFocus
                    filterOption={false}
                    loading={fetchingUsers}
                    open={suggestionsOpen}
                    onDropdownVisibleChange={setSuggestionsOpen}
                    value={users.map((user) => user.id)}
                    options={knownUsers.map((user) => ({ value: user.id, label: user.username }))}
                    onSearch={(search: string) => (search ? searchUsers(search, setOptions) : resetOptions())}
                    onBlur={resetOptions}
                    onChange={(ids: number[]) => {
                        setUsers(ids.map((id) => knownUsers.find((user) => user.id === id) as User));
                    }}
                />
            </div>
            <Upload.Dragger
                className='cvat-distribute-jobs-csv'
                accept='.csv'
                showUploadList={false}
                disabled={fetchingUsers}
                beforeUpload={onUploadCSV}
            >
                <Space>
                    Click or drag a CSV file with usernames
                    <UploadOutlined />
                </Space>
            </Upload.Dragger>
            <Text strong>Preview</Text>
            <div className='cvat-distribute-jobs-preview'>
                {assignments.map(({ job, assignee }) => (
                    <React.Fragment key={job.id}>
                        <Link to={`/tasks/${job.taskId}/jobs/${job.id}`} target='_blank'>
                            {`Job #${job.id}`}
                        </Link>
                        <ArrowRightOutlined />
                        <span>{assignee.username}</span>
                    </React.Fragment>
                ))}
            </div>
            <Text className='cvat-distribute-jobs-summary'>
                {`${users.length} users `}
                <ArrowRightOutlined />
                {` ${orderedJobs.length} jobs`}
            </Text>
        </Modal>
    );
}

export default React.memo(DistributeJobsModal);
