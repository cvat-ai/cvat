import './styles.scss';
import React from 'react';

import {
    Icon,
    Layout,
} from 'antd';

import ObjectsBlockContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-block';
import AppearanceSettingsComponent from './appearance-settings';

interface Props {
    onSidebarFoldUnfold(): void;
}

interface State {
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
    listHeight: number;
}

export default class StandardWorkspaceComponent extends React.PureComponent<Props, State> {
    public constructor(props: any) {
        super(props);
        this.state = {
            sidebarCollapsed: false,
            appearanceCollapsed: false,
            listHeight: 0,
        };
    }

    public componentDidMount(): void {
        this.computeListHeight();
    }

    private onAppearanceCollapse = (key: string | string[]): void => {
        const [collapser] = window.document
            .getElementsByClassName('cvat-objects-appearance-collapse');

        if (collapser) {
            this.setState({
                appearanceCollapsed: key !== 'appearance' && !key.includes('appearance'),
            });

            collapser.addEventListener('transitionend', () => {
                this.computeListHeight();
            }, { once: true });
        }
    };

    private onSideCollapserClick = (): void => {
        const { onSidebarFoldUnfold } = this.props;

        this.setState(
            (prevState: State): State => ({
                ...prevState,
                sidebarCollapsed: !prevState.sidebarCollapsed,
            }),
        );

        const [sidebar] = window.document
            .getElementsByClassName('cvat-objects-sidebar');
        sidebar.addEventListener('transitionend', () => {
            onSidebarFoldUnfold();
        }, { once: true });
    };

    private computeListHeight(): void {
        const [sidebar] = window.document.getElementsByClassName('cvat-objects-sidebar');
        const [appearance] = window.document.getElementsByClassName('cvat-objects-appearance-collapse');
        const [tabs] = Array.from(
            window.document.querySelectorAll('.cvat-objects-sidebar-tabs > .ant-tabs-card-bar'),
        );

        const maxHeight = sidebar ? sidebar.clientHeight : 0;
        const appearanceHeight = appearance ? appearance.clientHeight : 0;
        const tabsHeight = tabs ? tabs.clientHeight : 0;
        const listHeight = maxHeight - appearanceHeight - tabsHeight;
        this.setState({
            listHeight,
        });
    }

    public render(): JSX.Element {
        const {
            sidebarCollapsed,
            appearanceCollapsed,
            listHeight,
        } = this.state;

        return (
            <Layout.Sider
                className='cvat-objects-sidebar'
                theme='light'
                width={300}
                collapsedWidth={0}
                reverseArrow
                collapsible
                trigger={null}
                collapsed={sidebarCollapsed}
            >
                {/* eslint-disable-next-line */}
                <span
                    className={`cvat-objects-sidebar-sider
                        ant-layout-sider-zero-width-trigger
                        ant-layout-sider-zero-width-trigger-left`}
                    onClick={this.onSideCollapserClick}
                >
                    {sidebarCollapsed ? <Icon type='menu-fold' title='Show' />
                        : <Icon type='menu-unfold' title='Hide' />}
                </span>

                <ObjectsBlockContainer listHeight={listHeight} />
                <AppearanceSettingsComponent
                    collapsed={appearanceCollapsed}
                    onCollapse={this.onAppearanceCollapse}
                />
            </Layout.Sider>
        );
    }
}
