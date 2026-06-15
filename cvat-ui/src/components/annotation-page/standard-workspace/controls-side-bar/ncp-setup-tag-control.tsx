// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * NCPSetupTagControl — a variant of SetupTagControl that only exposes labels
 * whose names start with a configurable prefix (default: "Material --").
 *
 * Uses a road icon instead of the generic tag icon to visually distinguish it
 * from the standard tag control.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';
import { PlusOutlined } from '@ant-design/icons';

import { getCore, ObjectState, ObjectType } from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { CombinedState } from 'reducers';
import { createAnnotationsAsync, rememberObject } from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';

import withVisibilityHandling from './handle-popover-visibility';

// ─── Road icon ────────────────────────────────────────────────────────────────

/**
 * A perspective road viewed from above: a trapezoid that widens toward the
 * bottom with white centre-line dashes receding to a vanishing point.
 */
const RoadSVGIcon = (): JSX.Element => (
    <svg
        width='1em'
        height='1em'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
    >
        {/* Road body (trapezoid) */}
        <path d='M3 22 L9.5 2 L14.5 2 L21 22 Z' fill='currentColor' />
        {/* Centre-line dashes (white, receding with perspective) */}
        <line x1='12' y1='19.5' x2='12' y2='17' stroke='white' strokeWidth='1.5' strokeLinecap='round' />
        <line x1='12' y1='14.5' x2='12' y2='12.5' stroke='white' strokeWidth='1.2' strokeLinecap='round' />
        <line x1='12' y1='10.5' x2='12' y2='9' stroke='white' strokeWidth='1' strokeLinecap='round' />
    </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface Props {
    /** When true the control is shown but greyed-out and non-interactive. */
    disabled?: boolean;
    /**
     * Only labels whose name starts with this string are offered in the
     * popover.  Defaults to `"Material --"`.
     */
    labelPrefix?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const core = getCore();
const CustomPopover = withVisibilityHandling(Popover, 'ncp-setup-tag');

function NCPSetupTagControl(props: Props): JSX.Element {
    const { disabled = false, labelPrefix = 'Material --' } = props;
    const dispatch = useDispatch();

    // ── Redux ────────────────────────────────────────────────────────────────
    const allLabels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const frame = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const annotationStates = useSelector(
        (state: CombinedState) => state.annotation.annotations.states,
    );
    const canvasInstance = useSelector(
        (state: CombinedState) => state.annotation.canvas.instance as Canvas,
    );
    const normalizedKeyMap = useSelector(
        (state: CombinedState) => state.shortcuts.normalizedKeyMap,
    );

    // ── Filtered labels ──────────────────────────────────────────────────────
    const satisfiedLabels = useMemo(
        () => allLabels.filter(
            (label: any) => ['any', ObjectType.TAG].includes(label.type) &&
                label.name.startsWith(labelPrefix),
        ),
        [allLabels, labelPrefix],
    );

    // ── Selected label state ─────────────────────────────────────────────────
    const [selectedLabelID, setSelectedLabelID] = useState<number | null>(
        satisfiedLabels.length ? (satisfiedLabels[0].id as number) : null,
    );

    // Resync default when filtered list changes (e.g. labels loaded async)
    useEffect(() => {
        if (satisfiedLabels.length && selectedLabelID === null) {
            setSelectedLabelID(satisfiedLabels[0].id as number);
        }
    }, [satisfiedLabels, selectedLabelID]);

    // ── Duplicate-tag guard ──────────────────────────────────────────────────
    const frameTags = annotationStates.filter(
        (s: any) => s.objectType === ObjectType.TAG,
    );
    const canAddSelectedTag = frameTags.every(
        (s: any) => s.label.id !== selectedLabelID,
    );

    // ── Handlers ─────────────────────────────────────────────────────────────
    const onChangeLabel = useCallback((value: any): void => {
        if (!value) return;
        setSelectedLabelID(value.id as number);
        dispatch(rememberObject({
            activeObjectType: ObjectType.TAG,
            activeLabelID: value.id,
            activeShapeType: undefined,
        }));
    }, [dispatch]);

    const onSetup = useCallback((): void => {
        if (selectedLabelID === null || !canAddSelectedTag) return;
        canvasInstance.cancel();
        dispatch(rememberObject({
            activeObjectType: ObjectType.TAG,
            activeLabelID: selectedLabelID,
            activeShapeType: undefined,
        }));
        const label = allLabels.find((l: any) => l.id === selectedLabelID);
        if (!label) return;
        const objectState = new core.classes.ObjectState({
            objectType: ObjectType.TAG,
            label,
            frame,
        });
        dispatch(createAnnotationsAsync([objectState]));
    }, [selectedLabelID, canAddSelectedTag, canvasInstance, allLabels, frame, dispatch]);

    // ── Disabled state ───────────────────────────────────────────────────────
    const effectivelyDisabled = disabled || satisfiedLabels.length === 0;

    if (effectivelyDisabled) {
        return (
            <Icon
                className='cvat-ncp-setup-tag-control cvat-disabled-canvas-control'
                component={RoadSVGIcon}
            />
        );
    }

    // ── Popover ───────────────────────────────────────────────────────────────
    const repeatShortcut = normalizedKeyMap.SWITCH_DRAW_MODE_STANDARD_CONTROLS ?? 'N';

    const popoverContent = (
        <div className='cvat-ncp-setup-tag-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>
                        Material tag
                    </Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Label</Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <LabelSelector
                        labels={satisfiedLabels}
                        value={selectedLabelID}
                        onChange={onChangeLabel}
                        onEnterPress={onSetup}
                    />
                    <CVATTooltip title={`Press ${repeatShortcut} to add a tag again`}>
                        <Button
                            type='primary'
                            className='cvat-add-tag-button'
                            disabled={!canAddSelectedTag}
                            onClick={onSetup}
                            icon={<PlusOutlined />}
                        />
                    </CVATTooltip>
                </Col>
            </Row>
        </div>
    );

    return (
        <CustomPopover placement='right' content={popoverContent}>
            <CVATTooltip title='Material tag' placement='right'>
                <Icon className='cvat-ncp-setup-tag-control' component={RoadSVGIcon} />
            </CVATTooltip>
        </CustomPopover>
    );
}

Object.assign(NCPSetupTagControl, { displayName: 'NCPSetupTagControl' });
export default React.memo(NCPSetupTagControl);
