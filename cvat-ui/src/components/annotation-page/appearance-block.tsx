// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { Dispatch } from 'react';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Slider, { SliderValue } from 'antd/lib/slider';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Collapse from 'antd/lib/collapse';

import { ColorBy, CombinedState } from 'reducers/interfaces';
import {
    collapseAppearance as collapseAppearanceAction,
    updateTabContentHeight as updateTabContentHeightAction,
} from 'actions/annotation-actions';
import {
    changeShapesColorBy as changeShapesColorByAction,
    changeShapesOpacity as changeShapesOpacityAction,
    changeSelectedShapesOpacity as changeSelectedShapesOpacityAction,
    changeShapesBlackBorders as changeShapesBlackBordersAction,
    changeShowBitmap as changeShowBitmapAction,
    changeShowProjections as changeShowProjectionsAction,
} from 'actions/settings-actions';

interface StateToProps {
    appearanceCollapsed: boolean;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    blackBorders: boolean;
    showBitmap: boolean;
    showProjections: boolean;
}

interface DispatchToProps {
    collapseAppearance(): void;
    changeShapesColorBy(event: RadioChangeEvent): void;
    changeShapesOpacity(event: SliderValue): void;
    changeSelectedShapesOpacity(event: SliderValue): void;
    changeShapesBlackBorders(event: CheckboxChangeEvent): void;
    changeShowBitmap(event: CheckboxChangeEvent): void;
    changeShowProjections(event: CheckboxChangeEvent): void;
}

export function computeHeight(): number {
    const [sidebar] = window.document.getElementsByClassName('cvat-objects-sidebar');
    const [appearance] = window.document.getElementsByClassName('cvat-objects-appearance-collapse');
    const [tabs] = Array.from(
        window.document.querySelectorAll('.cvat-objects-sidebar-tabs > .ant-tabs-card-bar'),
    );

    if (sidebar && appearance && tabs) {
        const maxHeight = sidebar ? sidebar.clientHeight : 0;
        const appearanceHeight = appearance ? appearance.clientHeight : 0;
        const tabsHeight = tabs ? tabs.clientHeight : 0;
        return maxHeight - appearanceHeight - tabsHeight;
    }

    return 0;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            appearanceCollapsed,
        },
        settings: {
            shapes: {
                colorBy,
                opacity,
                selectedOpacity,
                blackBorders,
                showBitmap,
                showProjections,
            },
        },
    } = state;

    return {
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        blackBorders,
        showBitmap,
        showProjections,
    };
}


function mapDispatchToProps(dispatch: Dispatch<AnyAction>): DispatchToProps {
    return {
        collapseAppearance(): void {
            dispatch(collapseAppearanceAction());
            const [collapser] = window.document
                .getElementsByClassName('cvat-objects-appearance-collapse');

            if (collapser) {
                const listener = (event: Event): void => {
                    if ((event as TransitionEvent).propertyName === 'height') {
                        const height = computeHeight();
                        dispatch(updateTabContentHeightAction(height));
                        collapser.removeEventListener('transitionend', listener);
                    }
                };

                collapser.addEventListener('transitionend', listener);
            }
        },
        changeShapesColorBy(event: RadioChangeEvent): void {
            dispatch(changeShapesColorByAction(event.target.value));
        },
        changeShapesOpacity(value: SliderValue): void {
            dispatch(changeShapesOpacityAction(value as number));
        },
        changeSelectedShapesOpacity(value: SliderValue): void {
            dispatch(changeSelectedShapesOpacityAction(value as number));
        },
        changeShapesBlackBorders(event: CheckboxChangeEvent): void {
            dispatch(changeShapesBlackBordersAction(event.target.checked));
        },
        changeShowBitmap(event: CheckboxChangeEvent): void {
            dispatch(changeShowBitmapAction(event.target.checked));
        },
        changeShowProjections(event: CheckboxChangeEvent): void {
            dispatch(changeShowProjectionsAction(event.target.checked));
        },
    };
}

type Props = StateToProps & DispatchToProps;

function AppearanceBlock(props: Props): JSX.Element {
    const {
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        blackBorders,
        showBitmap,
        showProjections,
        collapseAppearance,
        changeShapesColorBy,
        changeShapesOpacity,
        changeSelectedShapesOpacity,
        changeShapesBlackBorders,
        changeShowBitmap,
        changeShowProjections,
    } = props;

    return (
        <Collapse
            onChange={collapseAppearance}
            activeKey={appearanceCollapsed ? [] : ['appearance']}
            className='cvat-objects-appearance-collapse'
        >
            <Collapse.Panel
                header={
                    <Text strong>Appearance</Text>
                }
                key='appearance'
            >
                <div className='cvat-objects-appearance-content'>
                    <Text type='secondary'>Color by</Text>
                    <Radio.Group value={colorBy} onChange={changeShapesColorBy}>
                        <Radio.Button value={ColorBy.INSTANCE}>{ColorBy.INSTANCE}</Radio.Button>
                        <Radio.Button value={ColorBy.GROUP}>{ColorBy.GROUP}</Radio.Button>
                        <Radio.Button value={ColorBy.LABEL}>{ColorBy.LABEL}</Radio.Button>
                    </Radio.Group>
                    <Text type='secondary'>Opacity</Text>
                    <Slider
                        onChange={changeShapesOpacity}
                        value={opacity}
                        min={0}
                        max={100}
                    />
                    <Text type='secondary'>Selected opacity</Text>
                    <Slider
                        onChange={changeSelectedShapesOpacity}
                        value={selectedOpacity}
                        min={0}
                        max={100}
                    />
                    <Checkbox
                        onChange={changeShapesBlackBorders}
                        checked={blackBorders}
                    >
                        Black borders
                    </Checkbox>
                    <Checkbox
                        onChange={changeShowBitmap}
                        checked={showBitmap}
                    >
                        Show bitmap
                    </Checkbox>
                    <Checkbox
                        onChange={changeShowProjections}
                        checked={showProjections}
                    >
                        Show projections
                    </Checkbox>
                </div>
            </Collapse.Panel>
        </Collapse>
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(React.memo(AppearanceBlock));
