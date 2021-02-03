// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import { PredictorState, Workspace } from 'reducers/interfaces';
import { InfoIcon, FullscreenIcon, BrainIcon } from 'icons';
import Tooltip from 'antd/lib/tooltip';

interface Props {
    workspace: Workspace;
    predictor: PredictorState;
    showStatistics(): void;
    switchPredictor(predictorEnabled: boolean): void;
    changeWorkspace(workspace: Workspace): void;
}

function RightGroup(props: Props): JSX.Element {
    const {
        showStatistics, changeWorkspace, switchPredictor, workspace, predictor,
    } = props;

    const formattedScore = `${(predictor.projectScore * 100).toFixed(0)}%`;
    const predictorTooltip = (
        <div className='cvat-predictor-tooltip'>
            <span>Adaptive auto annotation is</span>
            { predictor.enabled ?
                <Text type='success' strong>{' active'}</Text> : <Text type='warning' strong>{' inactive'}</Text> }
            <br />
            <span>Model mAp is</span>
            <span>{` ${formattedScore}`}</span>
            <br />
            { predictor.error ? (
                <Text type='danger'>
                    {predictor.error.toString()}
                    <br />
                </Text>
            ) : null }
            { predictor.message ? <span>{`Message: ${predictor.message}`}</span> : null }
        </div>
    );

    let predictorClassName = 'cvat-annotation-header-button cvat-predictor-button';
    if (!!predictor.error || predictor.projectScore === 0) {
        predictorClassName += ' cvat-predictor-disabled';
    } else if (predictor.enabled) {
        if (predictor.fetching) {
            predictorClassName += ' cvat-predictor-fetching';
        }
        predictorClassName += ' cvat-predictor-inprogress';
    }

    return (
        <Col className='cvat-annotation-header-right-group'>
            <Button
                type='link'
                className={predictorClassName}
                onClick={() => {
                    switchPredictor(!predictor.enabled);
                }}
            >
                <Tooltip title={predictorTooltip}>
                    <Icon component={BrainIcon} />
                </Tooltip>
                {`mAp ${formattedScore}`}
            </Button>
            <Button
                type='link'
                className='cvat-annotation-header-button'
                onClick={(): void => {
                    if (window.document.fullscreenEnabled) {
                        if (window.document.fullscreenElement) {
                            window.document.exitFullscreen();
                        } else {
                            window.document.documentElement.requestFullscreen();
                        }
                    }
                }}
            >
                <Icon component={FullscreenIcon} />
                Fullscreen
            </Button>
            <Button type='link' className='cvat-annotation-header-button' onClick={showStatistics}>
                <Icon component={InfoIcon} />
                Info
            </Button>
            <div>
                <Select
                    dropdownClassName='cvat-workspace-selector-dropdown'
                    className='cvat-workspace-selector'
                    onChange={changeWorkspace}
                    value={workspace}
                >
                    {Object.values(Workspace).map((ws) => (
                        <Select.Option key={ws} value={ws}>
                            {ws}
                        </Select.Option>
                    ))}
                </Select>
            </div>
        </Col>
    );
}

export default React.memo(RightGroup);
