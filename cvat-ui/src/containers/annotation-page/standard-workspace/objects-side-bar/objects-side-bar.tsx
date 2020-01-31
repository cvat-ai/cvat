
import React from 'react';
import { connect } from 'react-redux';

import ObjectsSidebarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import { CombinedState } from 'reducers/interfaces';
import {
    collapseSidebar as collapseSidebarAction,
    collapseAppearance as collapseAppearanceAction,
    updateTabContentHeight as updateTabContentHeightAction,
} from 'actions/annotation-actions';

interface StateToProps {
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
}

interface DispatchToProps {
    collapseSidebar(): void;
    collapseAppearance(): void;
    updateTabContentHeight(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            sidebarCollapsed,
            appearanceCollapsed,
        },
    } = state;

    return {
        sidebarCollapsed,
        appearanceCollapsed,
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
    };
}

type Props = StateToProps & DispatchToProps;
class ObjectsSideBarContainer extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const { updateTabContentHeight } = this.props;
        updateTabContentHeight();
    }

    public render(): JSX.Element {
        return (
            <ObjectsSidebarComponent {...this.props} />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectsSideBarContainer);
