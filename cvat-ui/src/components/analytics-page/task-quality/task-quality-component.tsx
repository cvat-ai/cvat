// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import JobItem from 'components/job-item/job-item';
import {
    Job, JobType, QualityReport, QualitySettings, Task, getCore,
} from 'cvat-core-wrapper';
import React, { useEffect } from 'react';
import { useIsMounted, useStateIfMounted } from 'utils/hooks';
import EmptyGtJob from './empty-job';
import GtConflicts from './gt-conflicts';
import Issues from './issues';
import JobList from './job-list';
import MeanQuality from './mean-quality';
import QualitySettingsModal from '../shared/quality-settings-modal';

const core = getCore();

interface Props {
    task: Task,
    onJobUpdate: (job: Job) => void
}

function TaskQualityComponent(props: Props): JSX.Element {
    const { task, onJobUpdate } = props;
    const isMounted = useIsMounted();
    const [fetching, setFetching] = useStateIfMounted<boolean>(true);
    const [taskReport, setTaskReport] = useStateIfMounted<QualityReport | null>(null);
    const [jobsReports, setJobsReports] = useStateIfMounted<QualityReport[]>([]);
    const [qualitySettings, setQualitySettings] = useStateIfMounted<QualitySettings | null>(null);
    const [qualitySettingsVisible, setQualitySettingsVisible] = useStateIfMounted<boolean>(false);
    const [qualitySettingsFetching, setQualitySettingsFetching] = useStateIfMounted<boolean>(true);

    useEffect(() => {
        setFetching(true);
        setQualitySettingsFetching(true);

        function handleError(error: Error): void {
            if (isMounted()) {
                notification.error({
                    description: error.toString(),
                    message: 'Could not initialize quality analytics page',
                });
            }
        }

        core.analytics.quality.reports({ pageSize: 1, target: 'task', taskId: task.id }).then(([report]) => {
            let reportRequest = Promise.resolve<QualityReport[]>([]);
            if (report) {
                reportRequest = core.analytics.quality.reports({
                    pageSize: task.jobs.length,
                    parentId: report.id,
                    target: 'job',
                });
            }
            const settingsRequest = core.analytics.quality.settings.get({
                ...(!task.projectId ? { taskId: task.id } : {}),
                ...(task.projectId ? { projectId: task.projectId } : {}),
            }, !task.projectId);

            Promise.all([reportRequest, settingsRequest]).then(([jobReports, settings]) => {
                setQualitySettings(settings);
                setTaskReport(report || null);
                setJobsReports(jobReports);
            }).catch(handleError).finally(() => {
                setQualitySettingsFetching(false);
                setFetching(false);
            });
        }).catch(handleError);
    }, [task?.id]);

    const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);

    return (
        <div className='cvat-task-quality-page'>
            {
                fetching ? (
                    <CVATLoadingSpinner size='large' />
                ) : (
                    <>
                        {
                            gtJob ? (
                                <>
                                    <Row>
                                        <MeanQuality
                                            taskReport={taskReport}
                                            setQualitySettingsVisible={setQualitySettingsVisible}
                                            taskId={task.id}
                                        />
                                    </Row>
                                    <Row gutter={16}>
                                        <GtConflicts taskReport={taskReport} />
                                        <Issues task={task} />
                                    </Row>
                                    {
                                        (!(gtJob && gtJob.stage === 'acceptance' && gtJob.state === 'completed')) ? (
                                            <Row>
                                                <Text type='secondary' className='cvat-task-quality-reports-hint'>
                                                    Quality reports are not computed unless the GT job is in the&nbsp;
                                                    <strong>completed state</strong>
                                                    &nbsp;and&nbsp;
                                                    <strong>acceptance stage.</strong>
                                                </Text>
                                            </Row>
                                        ) : null
                                    }
                                    <Row>
                                        <JobItem job={gtJob} task={task} onJobUpdate={onJobUpdate} />
                                    </Row>
                                    <Row>
                                        <JobList jobsReports={jobsReports} task={task} />
                                    </Row>
                                </>
                            ) : (
                                <Row justify='center'>
                                    <EmptyGtJob taskId={task.id} />
                                </Row>
                            )
                        }
                        <QualitySettingsModal
                            fetching={qualitySettingsFetching}
                            qualitySettings={qualitySettings}
                            setQualitySettings={setQualitySettings}
                            visible={qualitySettingsVisible}
                            setVisible={setQualitySettingsVisible}
                        />
                    </>
                )
            }
        </div>
    );
}

export default React.memo(TaskQualityComponent);
