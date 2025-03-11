// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Row, Col } from 'antd/lib/grid';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';
import Select from 'antd/lib/select';
import { useTranslation } from 'react-i18next';

import {
    MAX_ACCURACY,
    marks,
} from 'components/annotation-page/standard-workspace/controls-side-bar/approximation-accuracy';
import { clamp } from 'utils/math';

interface Props {
    autoSave: boolean;
    autoSaveInterval: number;
    aamZoomMargin: number;
    showAllInterpolationTracks: boolean;
    showObjectsTextAlways: boolean;
    automaticBordering: boolean;
    intelligentPolygonCrop: boolean;
    defaultApproxPolyAccuracy: number;
    textFontSize: number;
    controlPointsSize: number;
    textPosition: 'center' | 'auto';
    textContent: string;
    showTagsOnFrame: boolean;
    onSwitchAutoSave(enabled: boolean): void;
    onChangeAutoSaveInterval(interval: number): void;
    onChangeAAMZoomMargin(margin: number): void;
    onChangeDefaultApproxPolyAccuracy(approxPolyAccuracy: number): void;
    onSwitchShowingInterpolatedTracks(enabled: boolean): void;
    onSwitchShowingObjectsTextAlways(enabled: boolean): void;
    onSwitchAutomaticBordering(enabled: boolean): void;
    onSwitchIntelligentPolygonCrop(enabled: boolean): void;
    onChangeTextFontSize(fontSize: number): void;
    onChangeControlPointsSize(pointsSize: number): void;
    onChangeTextPosition(position: 'auto' | 'center'): void;
    onChangeTextContent(textContent: string[]): void;
    onSwitchShowingTagsOnFrame(enabled: boolean): void;
}

function WorkspaceSettingsComponent(props: Props): JSX.Element {
    const {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
        showObjectsTextAlways,
        automaticBordering,
        intelligentPolygonCrop,
        defaultApproxPolyAccuracy,
        textFontSize,
        controlPointsSize,
        textPosition,
        textContent,
        showTagsOnFrame,
        onSwitchAutoSave,
        onChangeAutoSaveInterval,
        onChangeAAMZoomMargin,
        onSwitchShowingInterpolatedTracks,
        onSwitchShowingObjectsTextAlways,
        onSwitchAutomaticBordering,
        onSwitchIntelligentPolygonCrop,
        onChangeDefaultApproxPolyAccuracy,
        onChangeTextFontSize,
        onChangeControlPointsSize,
        onChangeTextPosition,
        onChangeTextContent,
        onSwitchShowingTagsOnFrame,
    } = props;

    const { t: tSettingsWorkspace } = useTranslation('header', { keyPrefix: 'settings.Workspace' });
    const { t: tTextSettingsContents } = useTranslation('header', { keyPrefix: 'settings.Workspace.text-settings-contents' });

    const minAutoSaveInterval = 1;
    const maxAutoSaveInterval = 60;
    const minAAMMargin = 0;
    const maxAAMMargin = 1000;
    const minControlPointsSize = 2;
    const maxControlPointsSize = 10;

    return (
        <div className='cvat-workspace-settings'>
            <Row className='cvat-player-setting'>
                <Col span={24}>
                    <Checkbox
                        className='cvat-text-color cvat-workspace-settings-auto-save'
                        checked={autoSave}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchAutoSave(event.target.checked);
                        }}
                    >
                        {tSettingsWorkspace('Enable auto save')}
                    </Checkbox>
                </Col>
                <Col className='cvat-workspace-settings-auto-save-interval'>
                    <Text type='secondary'>{tSettingsWorkspace('auto-save-tips.0', 'Auto save every')}</Text>
                    <InputNumber
                        size='small'
                        min={minAutoSaveInterval}
                        max={maxAutoSaveInterval}
                        step={1}
                        value={Math.round(autoSaveInterval / (60 * 1000))}
                        onChange={(value: number | null | string): void => {
                            if (typeof value === 'number' || typeof value === 'string') {
                                onChangeAutoSaveInterval(
                                    Math.floor(clamp(+value, minAutoSaveInterval, maxAutoSaveInterval)) * 60 * 1000,
                                );
                            }
                        }}
                    />
                    <Text type='secondary'>{tSettingsWorkspace('auto-save-tips.1', 'minutes')}</Text>
                </Col>
            </Row>
            <Row className='cvat-player-setting'>
                <Col span={12} className='cvat-workspace-settings-show-interpolated'>
                    <Row>
                        <Checkbox
                            className='cvat-text-color'
                            checked={showAllInterpolationTracks}
                            onChange={(event: CheckboxChangeEvent): void => {
                                onSwitchShowingInterpolatedTracks(event.target.checked);
                            }}
                        >
                            {tSettingsWorkspace('show-interpolated', 'Show all interpolation tracks')}
                        </Checkbox>
                    </Row>
                    <Row>
                        <Text type='secondary'>
                            {tSettingsWorkspace('show-interpolated-tips', 'Show hidden interpolated objects in the side panel')}
                        </Text>
                    </Row>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-show-text-always cvat-player-setting'>
                <Col span={24}>
                    <Checkbox
                        className='cvat-text-color'
                        checked={showObjectsTextAlways}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchShowingObjectsTextAlways(event.target.checked);
                        }}
                    >
                        {tSettingsWorkspace('show-text-always', 'Always show object details')}
                    </Checkbox>
                </Col>
                <Col span={24}>
                    <Text type='secondary'>
                        {tSettingsWorkspace('show-text-always-tips', 'Show text for an object on the canvas not only when the object is activated')}
                    </Text>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-text-settings cvat-player-setting'>
                <Col span={24}>
                    <Text>{tSettingsWorkspace('text-settings-content', 'Content of a text')}</Text>
                </Col>
                <Col span={16}>
                    <Select
                        className='cvat-workspace-settings-text-content'
                        mode='multiple'
                        value={textContent.split(',').filter((entry: string) => !!entry)}
                        onChange={onChangeTextContent}
                    >
                        <Select.Option value='id'>{tTextSettingsContents('ID')}</Select.Option>
                        <Select.Option value='label'>{tTextSettingsContents('Label')}</Select.Option>
                        <Select.Option value='attributes'>{tTextSettingsContents('Attributes')}</Select.Option>
                        <Select.Option value='source'>{tTextSettingsContents('Source')}</Select.Option>
                        <Select.Option value='descriptions'>{tTextSettingsContents('Descriptions')}</Select.Option>
                        <Select.Option value='dimensions'>{tTextSettingsContents('Dimensions')}</Select.Option>
                    </Select>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-text-settings cvat-player-setting'>
                <Col span={12}>
                    <Text>{tSettingsWorkspace('text-settings-text-position', 'Position of a text')}</Text>
                </Col>
                <Col span={12}>
                    <Text>{tSettingsWorkspace('text-settings-font-size', 'Font size of a text')}</Text>
                </Col>
                <Col span={12}>
                    <Select
                        className='cvat-workspace-settings-text-position'
                        value={textPosition}
                        onChange={onChangeTextPosition}
                    >
                        <Select.Option value='auto'>
                            {tSettingsWorkspace('text-settings-text-positions.Auto', 'Auto')}
                        </Select.Option>
                        <Select.Option value='center'>
                            {tSettingsWorkspace('text-settings-text-positions.Center', 'Center')}
                        </Select.Option>
                    </Select>
                </Col>
                <Col span={12}>
                    <InputNumber
                        className='cvat-workspace-settings-text-size'
                        onChange={(value) => {
                            if (typeof value === 'number') {
                                onChangeTextFontSize(value);
                            }
                        }}
                        min={8}
                        max={20}
                        value={textFontSize}
                    />
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-autoborders cvat-player-setting'>
                <Col span={24}>
                    <Checkbox
                        className='cvat-text-color'
                        checked={automaticBordering}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchAutomaticBordering(event.target.checked);
                        }}
                    >
                        {tSettingsWorkspace('auto-borders', 'Automatic bordering')}
                    </Checkbox>
                </Col>
                <Col span={24}>
                    <Text type='secondary'>
                        {tSettingsWorkspace('auto-borders-tips', 'Enable automatic bordering for polygons and polylines during drawing/editing')}
                    </Text>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-intelligent-polygon-cropping cvat-player-setting'>
                <Col span={24}>
                    <Checkbox
                        className='cvat-text-color'
                        checked={intelligentPolygonCrop}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchIntelligentPolygonCrop(event.target.checked);
                        }}
                    >
                        {tSettingsWorkspace('intelligent-polygon-cropping', 'Intelligent polygon cropping')}
                    </Checkbox>
                </Col>
                <Col span={24}>
                    <Text type='secondary'>
                        {tSettingsWorkspace('intelligent-polygon-cropping-tips', 'Try to crop polygons automatically when editing')}
                    </Text>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-show-frame-tags cvat-player-setting'>
                <Col span={24}>
                    <Checkbox
                        className='cvat-text-color'
                        checked={showTagsOnFrame}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchShowingTagsOnFrame(event.target.checked);
                        }}
                    >
                        {tSettingsWorkspace('Show tags on frame')}
                    </Checkbox>
                </Col>
                <Col span={24}>
                    <Text type='secondary'>{tSettingsWorkspace('Show frame tags in the corner of the workspace')}</Text>
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-aam-zoom-margin cvat-player-setting'>
                <Col>
                    <Text className='cvat-text-color'>
                        {tSettingsWorkspace('aam-zoom-margin', 'Attribute annotation mode (AAM) zoom margin')}
                    </Text>
                    <InputNumber
                        min={minAAMMargin}
                        max={maxAAMMargin}
                        value={aamZoomMargin}
                        onChange={(value: number | null | string): void => {
                            if (typeof value === 'number' || typeof value === 'string') {
                                onChangeAAMZoomMargin(Math.floor(clamp(+value, minAAMMargin, maxAAMMargin)));
                            }
                        }}
                    />
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-control-points-size cvat-player-setting'>
                <Col>
                    <Text className='cvat-text-color'>
                        {tSettingsWorkspace('control-points-size', 'Control points size')}
                    </Text>
                    <InputNumber
                        min={minControlPointsSize}
                        max={maxControlPointsSize}
                        value={controlPointsSize}
                        onChange={(value: number | null | string): void => {
                            if (typeof value === 'number' || typeof value === 'string') {
                                onChangeControlPointsSize(
                                    Math.floor(clamp(+value, minControlPointsSize, maxControlPointsSize)),
                                );
                            }
                        }}
                    />
                </Col>
            </Row>
            <Row className='cvat-workspace-settings-approx-poly-threshold cvat-player-setting'>
                <Col>
                    <Text className='cvat-text-color'>
                        {tSettingsWorkspace('approx-poly-threshold', 'Default number of points in polygon approximation')}
                    </Text>
                </Col>
                <Col span={7} offset={1}>
                    <Slider
                        min={0}
                        max={MAX_ACCURACY}
                        step={1}
                        value={defaultApproxPolyAccuracy}
                        dots
                        onChange={onChangeDefaultApproxPolyAccuracy}
                        marks={marks}
                    />
                </Col>
                <Col>
                    <Text type='secondary'>
                        {tSettingsWorkspace('approx-poly-threshold-tips', 'Works for serverless interactors and OpenCV scissors')}
                    </Text>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(WorkspaceSettingsComponent);
