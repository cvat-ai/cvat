// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';

import config from 'config';
import { Project, Task, Job } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import PaidFeaturePlaceholder from 'components/paid-feature-placeholder/paid-feature-placeholder';
import { TimePeriod } from '.';

interface Props {
    resource: Project | Task | Job;
    timePeriod: TimePeriod | null;
}

function AnalyticsReportContent(): JSX.Element {
    return (
        <PaidFeaturePlaceholder featureDescription={config.PAID_PLACEHOLDER_CONFIG.features.analyticsReport} />
    );
}

function AnalyticsReportContentWrap(props: Readonly<Props>): JSX.Element {
    const overrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.analyticsReportPage.content,
    );

    if (overrides.length) {
        const [Component] = overrides.slice(-1);
        return <Component {...props} />;
    }

    return <AnalyticsReportContent />;
}

export default React.memo(AnalyticsReportContentWrap);
