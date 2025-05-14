// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';

import config from 'config';
import { Project, QualitySettings, Task } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import PaidFeaturePlaceholder from 'components/paid-feature-placeholder/paid-feature-placeholder';

interface Props {
    instance: Project | Task;
    qualitySettings: {
        settings: QualitySettings | null;
        childrenSettings: QualitySettings[] | null;
    };
}

function QualityOverviewTab(): JSX.Element {
    return (
        <PaidFeaturePlaceholder featureDescription={config.PAID_PLACEHOLDER_CONFIG.features.qualityControl} />
    );
}

function QualityOverviewTabWrap(props: Readonly<Props>): JSX.Element {
    const { instance } = props;

    const overrides = useSelector(
        (state: CombinedState) => (instance instanceof Project ?
            state.plugins.overridableComponents.qualityControlPage.project.overviewTab :
            state.plugins.overridableComponents.qualityControlPage.task.overviewTab),
    );

    if (overrides.length) {
        const [Component] = overrides.slice(-1);
        return <Component {...props} />;
    }

    return <QualityOverviewTab />;
}

export default React.memo(QualityOverviewTabWrap);
