// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React, { useEffect, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import { Task } from 'cvat-core-wrapper';
import { useIsMounted } from 'utils/hooks';
import AnalyticsCard from '../views/analytics-card';
import { percent, clampValue } from '../utils/text-formatting';

interface Props {
    task: Task;
}

function Issues(props: Props): JSX.Element {
    const { task } = props;

    const [issuesCount, setIssuesCount] = useState<number>(0);
    const [resolvedIssues, setResolvedIssues] = useState<number>(0);
    const isMounted = useIsMounted();

    useEffect(() => {
        task
            .issues()
            .then((issues: any[]) => {
                if (isMounted()) {
                    setIssuesCount(issues.length);
                    setResolvedIssues(issues.reduce((acc, issue) => (issue.resolved ? acc + 1 : acc), 0));
                }
            })
            .catch((_error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: _error.toString(),
                        message: "Couldn't fetch issues",
                        className: 'cvat-notification-notice-get-issues-error',
                    });
                }
            });
    }, []);

    const bottomElement = (
        <Text type='secondary'>
            Resolved:
            {' '}
            {clampValue(resolvedIssues)}
            {resolvedIssues ? ` (${percent(resolvedIssues, issuesCount)})` : ''}
        </Text>
    );

    return (
        <AnalyticsCard
            title='Issues'
            className='cvat-task-issues'
            value={issuesCount}
            size={12}
            bottomElement={bottomElement}
        />
    );
}

export default React.memo(Issues);
