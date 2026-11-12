// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import CVATTooltip from 'components/common/cvat-tooltip';
import { Job, QualityConflictRequirement } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';

interface Props {
    job: Job | null;
    requirements: readonly QualityConflictRequirement[];
}

const COLLAPSED_REQUIREMENT_COUNT = 3;

export default function ConflictRequirements(props: Readonly<Props>): JSX.Element {
    const { job, requirements } = props;
    const [expanded, setExpanded] = useState(false);
    const overrides = useSelector((state: CombinedState) => (
        state.plugins.overridableComponents.annotationPage.conflictRequirement
    ));
    const [Requirement] = overrides.slice(-1);
    const visibleRequirements = expanded ? requirements : requirements.slice(0, COLLAPSED_REQUIREMENT_COUNT);

    return (
        <div className='cvat-conflict-requirements'>
            <Text type='secondary'>Requirements:</Text>
            <div className='cvat-conflict-requirement-list'>
                {visibleRequirements.map((requirement) => (
                    <CVATTooltip key={requirement.id} title={requirement.name}>
                        <div className='cvat-conflict-requirement-name'>
                            {Requirement && job ? (
                                <Requirement job={job} requirement={requirement} />
                            ) : <Text>{requirement.name}</Text>}
                        </div>
                    </CVATTooltip>
                ))}
            </div>
            {requirements.length > COLLAPSED_REQUIREMENT_COUNT && (
                <Button
                    type='link'
                    size='small'
                    className='cvat-conflict-requirements-toggle'
                    aria-expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? 'Show less' : `Show all (${requirements.length})`}
                </Button>
            )}
        </div>
    );
}
