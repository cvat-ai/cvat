// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';

import config from 'config';
import { Project, QualitySettings, Task } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import PaidFeaturePlaceholder from 'components/paid-feature-placeholder/paid-feature-placeholder';
import { shallowEqual } from 'utils/redux';

interface Props {
    instance: Project | Task;
    qualitySettings: {
        settings: QualitySettings | null;
        childrenSettings: QualitySettings[] | null;
    };
}

function QualityRequirementsTab(): JSX.Element {
    return (
        <PaidFeaturePlaceholder featureDescription={config.PAID_PLACEHOLDER_CONFIG.features.qualityControl} />
    );
}

function QualityRequirementsTabWrap(props: Readonly<Props>): JSX.Element {
    const { instance } = props;

    const {
        taskOverrides, projectOverrides,
    } = useSelector((state: CombinedState) => ({
        taskOverrides: state.plugins.overridableComponents.qualityControlPage.task.requirementsTab,
        projectOverrides: state.plugins.overridableComponents.qualityControlPage.project.requirementsTab,
    }), shallowEqual);

    if (instance instanceof Task && taskOverrides.length) {
        const [Component] = taskOverrides.slice(-1);
        return <Component {...props} instance={instance} />;
    }

    if (instance instanceof Project && projectOverrides.length) {
        const [Component] = projectOverrides.slice(-1);
        return <Component {...props} instance={instance} />;
    }

    return <QualityRequirementsTab />;
}

export default React.memo(QualityRequirementsTabWrap);
