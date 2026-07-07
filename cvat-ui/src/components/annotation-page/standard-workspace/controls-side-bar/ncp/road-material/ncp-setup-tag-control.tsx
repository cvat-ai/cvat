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
import Button from 'antd/lib/button';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';

import { getCore, ObjectType } from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { CombinedState } from 'reducers';
import { createAnnotationsAsync, removeObjectAsync, rememberObject } from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { RoadSVGIcon } from 'icons';

import withVisibilityHandling from '../../handle-popover-visibility';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface Props {
    /** When true the control is shown but greyed-out and non-interactive. */
    disabled?: boolean;
    /**
     * Only labels whose name starts with this string are offered in the
     * popover.  Defaults to `"Material --"`.
     */
    labelPrefix?: string;
    labelPrefixFr?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const core = getCore();
const CustomPopover = withVisibilityHandling(Popover, 'ncp-setup-tag');

function NCPSetupTagControl(props: Props): JSX.Element {
    const {
        disabled = false,
        labelPrefix = 'Material --',
        labelPrefixFr = 'Matière --',
    } = props;
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
    // ── Filtered labels ──────────────────────────────────────────────────────
    const satisfiedLabels = useMemo(
        () => allLabels.filter(
            (label: any) => ['any', ObjectType.TAG].includes(label.type) &&
                (label.name.startsWith(labelPrefix) || label.name.startsWith(labelPrefixFr)),
        ),
        [allLabels, labelPrefix, labelPrefixFr],
    );

    // ── Selected label state ─────────────────────────────────────────────────
    const [selectedLabelID, setSelectedLabelID] = useState<number | null>(
        satisfiedLabels.length ? (satisfiedLabels[0].id as number) : null,
    );

    useEffect(() => {
        if (satisfiedLabels.length && selectedLabelID === null) {
            setSelectedLabelID(satisfiedLabels[0].id as number);
        }
    }, [satisfiedLabels, selectedLabelID]);

    // ── Duplicate-tag guard ──────────────────────────────────────────────────
    const frameTags = annotationStates.filter(
        (s: any) => s.objectType === ObjectType.TAG,
    );

    const canAddTag = useCallback(
        (labelID: number | null) => labelID !== null && frameTags.every(
            (s: any) => s.label.id !== labelID,
        ),
        [frameTags],
    );

    // ── Core create helper ───────────────────────────────────────────────────
    /**
     * Creates a tag for `labelID`, after first removing any existing tag whose
     * label name starts with `labelPrefix` (enforces the one-material-tag rule).
     */
    const createTag = useCallback((labelID: number): void => {
        canvasInstance.cancel();

        // Remove the previous Material-- tag on this frame (if any)
        const existingPrefixTags = frameTags.filter(
            (s: any) => (
                s.label.name.startsWith(labelPrefix) ||
                s.label.name.startsWith(labelPrefixFr)
            ),
        );
        for (const tagState of existingPrefixTags) {
            dispatch(removeObjectAsync(tagState, true));
        }

        dispatch(rememberObject({
            activeObjectType: ObjectType.TAG,
            activeLabelID: labelID,
            activeShapeType: undefined,
        }));
        const label = allLabels.find((l: any) => l.id === labelID);
        if (!label) return;
        const objectState = new core.classes.ObjectState({
            objectType: ObjectType.TAG,
            label,
            frame,
        });
        dispatch(createAnnotationsAsync([objectState]));
    }, [canvasInstance, allLabels, frame, dispatch, frameTags, labelPrefix, labelPrefixFr]);

    /** List mode: label button clicked. */
    const onSetupLabel = useCallback((label: any): void => {
        if (!canAddTag(label.id)) return;
        setSelectedLabelID(label.id as number);
        createTag(label.id as number);
    }, [canAddTag, createTag]);

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

    const listModeContent = (
        <div className='cvat-ncp-setup-tag-popover-content'>
            <Row justify='start' style={{ marginBottom: 6 }}>
                <Col>
                    <Text className='cvat-text-color' strong>Material tag</Text>
                </Col>
            </Row>
            {satisfiedLabels.map((label: any) => {
                // A label is "active" when it is the current Material-- tag on
                // this frame.  Active labels are shown as disabled (already set)
                // but with a ✓ indicator — clicking a different label will swap.
                const isActive = !canAddTag(label.id as number);
                return (
                    <Row key={label.id} style={{ marginTop: 2 }}>
                        <Col span={24}>
                            <Button
                                block
                                disabled={isActive}
                                style={{ textAlign: 'left' }}
                                onClick={() => onSetupLabel(label)}
                            >
                                {isActive && (
                                    <Text
                                        type='success'
                                        style={{ marginRight: 6, fontSize: 11 }}
                                    >
                                        ✓
                                    </Text>
                                )}
                                {label.name}
                            </Button>
                        </Col>
                    </Row>
                );
            })}
        </div>
    );

    return (
        <CustomPopover placement='right' content={listModeContent}>
            <CVATTooltip title='Material tag' placement='right'>
                <Icon className='cvat-ncp-setup-tag-control' component={RoadSVGIcon} />
            </CVATTooltip>
        </CustomPopover>
    );
}

Object.assign(NCPSetupTagControl, { displayName: 'NCPSetupTagControl' });
export default React.memo(NCPSetupTagControl);
