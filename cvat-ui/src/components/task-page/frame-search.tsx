// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import Button from 'antd/lib/button';
import { SearchOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import FrameSearchModal, { FrameSearchItem } from 'components/common/frame-search-modal';
import { Task, FramesMetaData, JobType } from 'cvat-core-wrapper';

interface Props {
    task: Task;
    taskMeta: FramesMetaData | null;
}

// Task-level filename search. Reuses the annotation player's search modal, but on select
// it resolves which job contains the chosen frame and navigates straight into it.
function FrameSearch(props: Readonly<Props>): JSX.Element {
    const { task, taskMeta } = props;
    const history = useHistory();
    const [visible, setVisible] = useState(false);

    const searchData = useMemo<FrameSearchItem[]>(() => {
        if (!taskMeta) {
            return [];
        }
        const frameNumbers = taskMeta.getDataFrameNumbers();
        return taskMeta.frames.map((frame, idx) => ({
            name: frame.name,
            number: frameNumbers[idx],
        }));
    }, [taskMeta]);

    const onSelect = useCallback((frame: number) => {
        setVisible(false);
        const jobsWithFrame = task.jobs.filter((job) => job.startFrame <= frame && frame <= job.stopFrame);
        // The `?frame=` query parameter does not work for ground truth jobs, so prefer an annotation job.
        const targetJob = jobsWithFrame.find((job) => job.type !== JobType.GROUND_TRUTH) ?? jobsWithFrame[0];
        if (targetJob) {
            history.push(`/tasks/${task.id}/jobs/${targetJob.id}?frame=${frame}`);
        }
    }, [task, history]);

    return (
        <>
            <CVATTooltip title='Search image by filename'>
                <Button
                    className='cvat-task-search-frame-button'
                    icon={<SearchOutlined />}
                    disabled={!taskMeta}
                    onClick={() => setVisible(true)}
                />
            </CVATTooltip>
            <FrameSearchModal
                visible={visible}
                searchData={searchData}
                onSelect={onSelect}
                onCancel={() => setVisible(false)}
            />
        </>
    );
}

export default React.memo(FrameSearch);
