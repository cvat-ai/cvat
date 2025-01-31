// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';

import config from 'config';
import { QualitySettings, Task } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import PaidFeaturePlaceholder from 'components/paid-feature-placeholder/paid-feature-placeholder';

interface Props {
    task: Task;
    qualitySettings: QualitySettings;
}

function QualityOverviewTab(): JSX.Element {
    return (
        <PaidFeaturePlaceholder featureDescription={config.PAID_PLACEHOLDER_CONFIG.features.qualityControl} />
    );
}

function QualityOverviewTabWrap(props: Readonly<Props>): JSX.Element {
    const overrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.qualityControlPage.overviewTab,
    );

    if (overrides.length) {
        const [Component] = overrides.slice(-1);
        return <Component {...props} />;
    }

    return <QualityOverviewTab />;
}

export default React.memo(QualityOverviewTabWrap);
