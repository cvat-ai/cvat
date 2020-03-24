// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Row, Col } from 'antd/lib/grid';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';

import { clamp } from 'utils/math';

interface Props {
    autoSave: boolean;
    autoSaveInterval: number;
    aamZoomMargin: number;
    showAllInterpolationTracks: boolean;
    onSwitchAutoSave(enabled: boolean): void;
    onChangeAutoSaveInterval(interval: number): void;
    onChangeAAMZoomMargin(margin: number): void;
    onSwitchShowingInterpolatedTracks(enabled: boolean): void;
}

export default function WorkspaceSettingsComponent(props: Props): JSX.Element {
    const {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
        onSwitchAutoSave,
        onChangeAutoSaveInterval,
        onChangeAAMZoomMargin,
        onSwitchShowingInterpolatedTracks,
    } = props;

    const minAutoSaveInterval = 5;
    const maxAutoSaveInterval = 60;
    const minAAMMargin = 0;
    const maxAAMMargin = 1000;

    return (
        <div className='cvat-workspace-settings'>
            <Row type='flex'>
                <Col>
                    <Checkbox
                        className='cvat-text-color cvat-workspace-settings-auto-save'
                        checked={autoSave}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchAutoSave(event.target.checked);
                        }}
                    >
                        Enable auto save
                    </Checkbox>
                </Col>
            </Row>
            <Row type='flex'>
                <Col className='cvat-workspace-settings-auto-save-interval'>
                    <Text type='secondary'> Auto save every </Text>
                    <InputNumber
                        min={minAutoSaveInterval}
                        max={maxAutoSaveInterval}
                        step={1}
                        value={Math.round(autoSaveInterval / (60 * 1000))}
                        onChange={(value: number | undefined): void => {
                            if (typeof (value) === 'number') {
                                onChangeAutoSaveInterval(
                                    clamp(
                                        value,
                                        minAutoSaveInterval,
                                        maxAutoSaveInterval,
                                    ) * 60 * 1000,
                                );
                            }
                        }}
                    />
                    <Text type='secondary'> minutes </Text>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-show-interpolated'>
                <Col className='cvat-workspace-settings-show-interpolated-checkbox'>
                    <Checkbox
                        className='cvat-text-color'
                        checked={showAllInterpolationTracks}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchShowingInterpolatedTracks(event.target.checked);
                        }}
                    >
                        Show all interpolation tracks
                    </Checkbox>
                </Col>
                <Col>
                    <Text type='secondary'> Show hidden interpolated objects in the side panel </Text>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-aam-zoom-margin'>
                <Col>
                    <Text className='cvat-text-color'> Attribute annotation mode (AAM) zoom margin </Text>
                    <InputNumber
                        min={minAAMMargin}
                        max={maxAAMMargin}
                        value={aamZoomMargin}
                        onChange={(value: number | undefined): void => {
                            if (typeof (value) === 'number') {
                                onChangeAAMZoomMargin(clamp(value, minAAMMargin, maxAAMMargin));
                            }
                        }}
                    />
                </Col>
            </Row>
        </div>
    );
}
