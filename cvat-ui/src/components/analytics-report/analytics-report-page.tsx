// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useCallback } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import notification from 'antd/lib/notification';
import { Row, Col } from 'antd/lib/grid';

import {
    Project, Task, Job, getCore, MembershipRole, AnalyticsEventsFilter,
} from 'cvat-core-wrapper';
import { useInstanceType, useInstanceId } from 'utils/hooks';
import { CombinedState, InstanceType } from 'reducers';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import AnalyticsReportContent from './analytics-report-content';
import AnalyticsPageHeader from './analytics-page-header';
import { TimePeriod } from '.';

const core = getCore();

function AnalyticsReportPage(): JSX.Element {
    const requestedInstanceType: InstanceType = useInstanceType();
    const requestedInstanceId = useInstanceId(requestedInstanceType);
    const [timePeriod, setTimePeriod] = useState<TimePeriod | null>(null);
    const [exporting, setExporting] = useState(false);
    const [resource, setResource] = useState<Project | Task | Job | null>(null);
    const [fetching, setFetching] = useState(true);
    const { user, org } = useSelector((state: CombinedState) => ({
        user: state.auth.user,
        org: state.organizations.current,
    }), shallowEqual);

    const onExportEvents = useCallback(async () => {
        if (!resource || !user) {
            return;
        }

        try {
            setExporting(true);
            const params: AnalyticsEventsFilter = {};

            if (timePeriod) {
                params.from = timePeriod.startDate;
                params.to = timePeriod.endDate;
            }

            if (resource instanceof Project) {
                params.projectId = resource.id;
                params.filename = `export-csv-events-project-${resource.id}.csv`;
            } else if (resource instanceof Task) {
                params.taskId = resource.id;
                params.filename = `export-csv-events-task-${resource.id}.csv`;
            } else {
                params.jobId = resource.id;
                params.filename = `export-csv-events-job-${resource.id}.csv`;
            }

            if (org) {
                const memberships = await org.members(
                    { filter: `{"and":[{"==":[{"var":"user"},"${user.username}"]}]}` },
                );
                const isMaintainer = !!memberships.length &&
                    [MembershipRole.MAINTAINER, MembershipRole.OWNER].includes(memberships[0].role);

                if (!(user.isSuperuser || isMaintainer)) {
                    // in an organization only admin and maintainer may export all events
                    // for others add user filter
                    params.userId = user.id;
                }
            } else if (!user.isSuperuser) {
                // in sandbox only admin may export all events, for others add user filter
                params.userId = user.id;
            }

            const url = await core.analytics.events.export(params);
            const a = document.createElement('a');

            try {
                a.setAttribute('href', url);
                a.setAttribute('download', params.filename);
                a.click();
            } finally {
                a.remove();
            }
        } catch (error: unknown) {
            notification.error({
                message: 'Could not export events for the target resource',
                description: error instanceof Error ? error.message : '',
            });
        } finally {
            setExporting(false);
        }
    }, [user, org, resource, timePeriod]);

    useEffect(() => {
        if (
            Number.isInteger(requestedInstanceId) &&
            [InstanceType.PROJECT, InstanceType.TASK, InstanceType.JOB].includes(requestedInstanceType)
        ) {
            let resourcePromise = null as (
                ReturnType<typeof core.projects.get> |
                ReturnType<typeof core.tasks.get> |
                ReturnType<typeof core.jobs.get> |
                null
            );

            if (requestedInstanceType === InstanceType.PROJECT) {
                resourcePromise = core.projects.get({ id: requestedInstanceId });
            } else if (requestedInstanceType === InstanceType.TASK) {
                resourcePromise = core.tasks.get({ id: requestedInstanceId });
            } else {
                resourcePromise = core.jobs.get({ jobID: requestedInstanceId });
            }

            setFetching(true);
            resourcePromise.then((_resource) => {
                setResource(_resource[0]);
            }).catch((error: unknown) => {
                notification.error({
                    message: 'Could not receive the target resource from the server',
                    description: error instanceof Error ? error.message : '',
                });
            }).finally(() => {
                setFetching(false);
            });
        }
    }, []);

    return (
        <div className='cvat-analytics-page'>
            <div className='cvat-analytics-wrapper'>
                <Row justify='center'>
                    <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                        <GoBackButton />
                    </Col>
                </Row>
                <Row justify='center' className='cvat-analytics-inner-wrapper'>
                    <Col span={22} xl={18} xxl={14} className='cvat-analytics-inner'>
                        { resource && (
                            <AnalyticsPageHeader
                                exporting={exporting}
                                fetching={fetching}
                                resource={resource}
                                onExportEvents={onExportEvents}
                                onUpdateTimePeriod={(from: Date | null, to: Date | null) => {
                                    function localToUTC(date: Date): string {
                                        // convert local time to UTC string WITHOUT applying any timezone offset
                                        // the user specified UTC time already in the date picker
                                        // basically we only convert timezone information
                                        return (
                                            new Date((Number(date) - date.getTimezoneOffset() * 60000)).toISOString()
                                        );
                                    }

                                    setTimePeriod((from && to) ? {
                                        startDate: localToUTC(from),
                                        endDate: localToUTC(to),
                                    } : null);
                                }}
                            />
                        )}
                        { fetching && <CVATLoadingSpinner /> }
                        { resource && <AnalyticsReportContent timePeriod={timePeriod} resource={resource} /> }
                    </Col>
                </Row>
            </div>
        </div>
    );
}

export default React.memo(AnalyticsReportPage);
