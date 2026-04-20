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

    const projectOverrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.qualityControlPage.project.overviewTab,
    );
    const taskOverrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.qualityControlPage.task.overviewTab,
    );

    if (instance instanceof Project) {
        if (projectOverrides.length) {
            const [Component] = projectOverrides.slice(-1);
            return <Component {...props as { instance: Project; qualitySettings: Props['qualitySettings'] }} />;
        }

        return <QualityOverviewTab />;
    }

    if (taskOverrides.length) {
        const [Component] = taskOverrides.slice(-1);
        return <Component {...props as { instance: Task; qualitySettings: Props['qualitySettings'] }} />;
    }

    return <QualityOverviewTab />;
}

export default React.memo(QualityOverviewTabWrap);
