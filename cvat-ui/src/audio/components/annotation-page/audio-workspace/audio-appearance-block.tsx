// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { Dispatch } from 'react';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Slider from 'antd/lib/slider';
import Collapse from 'antd/lib/collapse';

import { ColorBy, CombinedState } from 'reducers';
import { collapseAppearance as collapseAppearanceAction } from 'actions/annotation-actions';
import {
    changeShapesColorBy as changeShapesColorByAction,
    changeShapesOpacity as changeShapesOpacityAction,
    changeSelectedShapesOpacity as changeSelectedShapesOpacityAction,
} from 'actions/settings-actions';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';

const componentShortcuts = {
    SWITCH_COLOR_BY_APPEARANCE_AUDIO: {
        name: 'Switch objects appearance setting "Color by" (audio)',
        description: 'Audio region color mode may be by label or instance',
        sequences: [],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

interface StateToProps {
    appearanceCollapsed: boolean;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    keyMap: KeyMap;
}

interface DispatchToProps {
    collapseAppearance(): void;
    changeShapesColorBy(colorBy: ColorBy): void;
    changeShapesOpacity(value: number): void;
    changeSelectedShapesOpacity(value: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: { appearanceCollapsed },
        settings: {
            shapes: { colorBy, opacity, selectedOpacity },
        },
        shortcuts: { keyMap },
    } = state;

    return {
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        keyMap,
    };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>): DispatchToProps {
    return {
        collapseAppearance(): void {
            dispatch(collapseAppearanceAction());
        },
        changeShapesColorBy(colorBy: ColorBy): void {
            dispatch(changeShapesColorByAction(colorBy));
        },
        changeShapesOpacity(value: number): void {
            dispatch(changeShapesOpacityAction(value));
        },
        changeSelectedShapesOpacity(value: number): void {
            dispatch(changeSelectedShapesOpacityAction(value));
        },
    };
}

type Props = StateToProps & DispatchToProps;

const colorByOptions = [ColorBy.LABEL, ColorBy.INSTANCE];

const nextColorBy: Record<ColorBy, ColorBy> = {
    [ColorBy.LABEL]: ColorBy.INSTANCE,
    [ColorBy.INSTANCE]: ColorBy.LABEL,
    [ColorBy.GROUP]: ColorBy.LABEL,
};

function AudioAppearanceBlock(props: Props): JSX.Element {
    const {
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        collapseAppearance,
        changeShapesColorBy,
        changeShapesOpacity,
        changeSelectedShapesOpacity,
        keyMap,
    } = props;

    const effectiveColorBy = colorBy === ColorBy.GROUP ? ColorBy.LABEL : colorBy;

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SWITCH_COLOR_BY_APPEARANCE_AUDIO: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            changeShapesColorBy(nextColorBy[colorBy]);
        },
    };

    return (
        <Collapse
            onChange={collapseAppearance}
            activeKey={appearanceCollapsed ? [] : ['appearance']}
            className='cvat-objects-appearance-collapse'
            items={[{
                label: (
                    <Text strong className='cvat-objects-appearance-collapse-header'>
                        Appearance
                    </Text>
                ),
                key: 'appearance',
                children: (
                    <div className='cvat-objects-appearance-content cvat-appearance-block'>
                        <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                        <Text type='secondary'>Color by</Text>
                        <Radio.Group
                            className='cvat-appearance-color-by-radio-group'
                            value={effectiveColorBy}
                            onChange={(event: RadioChangeEvent) => changeShapesColorBy(event.target.value)}
                        >
                            {colorByOptions.map((val) => (
                                <Radio.Button value={val} key={val}>{val}</Radio.Button>
                            ))}
                        </Radio.Group>
                        <Text type='secondary'>Opacity</Text>
                        <Slider
                            className='cvat-appearance-opacity-slider'
                            onChange={changeShapesOpacity}
                            value={opacity}
                            min={0}
                            max={100}
                        />
                        <Text type='secondary'>Selected opacity</Text>
                        <Slider
                            className='cvat-appearance-selected-opacity-slider'
                            onChange={changeSelectedShapesOpacity}
                            value={selectedOpacity}
                            min={0}
                            max={100}
                        />
                    </div>
                ),
            }]}
        />
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(AudioAppearanceBlock));
