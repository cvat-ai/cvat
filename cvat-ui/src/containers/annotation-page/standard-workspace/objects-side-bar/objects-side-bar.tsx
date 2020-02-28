// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT


import React from 'react';
import { connect } from 'react-redux';

import { RadioChangeEvent } from 'antd/lib/radio';
import { SliderValue } from 'antd/lib/slider';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

import ObjectsSidebarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import {
    CombinedState,
    ColorBy,
} from 'reducers/interfaces';

import {
    collapseSidebar as collapseSidebarAction,
    collapseAppearance as collapseAppearanceAction,
    updateTabContentHeight as updateTabContentHeightAction,
} from 'actions/annotation-actions';

import {
    changeShapesColorBy as changeShapesColorByAction,
    changeShapesOpacity as changeShapesOpacityAction,
    changeSelectedShapesOpacity as changeSelectedShapesOpacityAction,
    changeShapesBlackBorders as changeShapesBlackBordersAction,
} from 'actions/settings-actions';


interface StateToProps {
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    blackBorders: boolean;
}

interface DispatchToProps {
    collapseSidebar(): void;
    collapseAppearance(): void;
    updateTabContentHeight(): void;
    changeShapesColorBy(colorBy: ColorBy): void;
    changeShapesOpacity(shapesOpacity: number): void;
    changeSelectedShapesOpacity(selectedShapesOpacity: number): void;
    changeShapesBlackBorders(blackBorders: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            sidebarCollapsed,
            appearanceCollapsed,
        },
        settings: {
            shapes: {
                colorBy,
                opacity,
                selectedOpacity,
                blackBorders,
            },
        },
    } = state;

    return {
        sidebarCollapsed,
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        blackBorders,
    };
}

function computeHeight(): number {
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

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        collapseSidebar(): void {
            dispatch(collapseSidebarAction());
        },
        collapseAppearance(): void {
            dispatch(collapseAppearanceAction());

            const [collapser] = window.document
                .getElementsByClassName('cvat-objects-appearance-collapse');

            if (collapser) {
                collapser.addEventListener('transitionend', () => {
                    dispatch(
                        updateTabContentHeightAction(
                            computeHeight(),
                        ),
                    );
                }, { once: true });
            }
        },
        updateTabContentHeight(): void {
            dispatch(
                updateTabContentHeightAction(
                    computeHeight(),
                ),
            );
        },
        changeShapesColorBy(colorBy: ColorBy): void {
            dispatch(changeShapesColorByAction(colorBy));
        },
        changeShapesOpacity(shapesOpacity: number): void {
            dispatch(changeShapesOpacityAction(shapesOpacity));
        },
        changeSelectedShapesOpacity(selectedShapesOpacity: number): void {
            dispatch(changeSelectedShapesOpacityAction(selectedShapesOpacity));
        },
        changeShapesBlackBorders(blackBorders: boolean): void {
            dispatch(changeShapesBlackBordersAction(blackBorders));
        },
    };
}

type Props = StateToProps & DispatchToProps;
class ObjectsSideBarContainer extends React.PureComponent<Props> {
    public componentDidMount(): void {
        window.addEventListener('resize', this.alignTabHeight);
        this.alignTabHeight();
    }

    public componentWillUnmount(): void {
        window.removeEventListener('resize', this.alignTabHeight);
    }

    private alignTabHeight = (): void => {
        const {
            sidebarCollapsed,
            updateTabContentHeight,
        } = this.props;

        if (!sidebarCollapsed) {
            updateTabContentHeight();
        }
    };

    private changeShapesColorBy = (event: RadioChangeEvent): void => {
        const { changeShapesColorBy } = this.props;
        changeShapesColorBy(event.target.value);
    };

    private changeShapesOpacity = (value: SliderValue): void => {
        const { changeShapesOpacity } = this.props;
        changeShapesOpacity(value as number);
    };

    private changeSelectedShapesOpacity = (value: SliderValue): void => {
        const { changeSelectedShapesOpacity } = this.props;
        changeSelectedShapesOpacity(value as number);
    };

    private changeShapesBlackBorders = (event: CheckboxChangeEvent): void => {
        const { changeShapesBlackBorders } = this.props;
        changeShapesBlackBorders(event.target.checked);
    };

    public render(): JSX.Element {
        const {
            sidebarCollapsed,
            appearanceCollapsed,
            colorBy,
            opacity,
            selectedOpacity,
            blackBorders,
            collapseSidebar,
            collapseAppearance,
        } = this.props;

        return (
            <ObjectsSidebarComponent
                sidebarCollapsed={sidebarCollapsed}
                appearanceCollapsed={appearanceCollapsed}
                colorBy={colorBy}
                opacity={opacity}
                selectedOpacity={selectedOpacity}
                blackBorders={blackBorders}
                collapseSidebar={collapseSidebar}
                collapseAppearance={collapseAppearance}
                changeShapesColorBy={this.changeShapesColorBy}
                changeShapesOpacity={this.changeShapesOpacity}
                changeSelectedShapesOpacity={this.changeSelectedShapesOpacity}
                changeShapesBlackBorders={this.changeShapesBlackBorders}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectsSideBarContainer);
