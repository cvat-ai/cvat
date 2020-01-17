import React from 'react';

import {
    Icon,
    Layout,
} from 'antd';

import AppearanceSettingsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/appearance-settings';
import ObjectsBlockContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-block';

interface Props {
    onSidebarFoldUnfold(): void;
}

interface State {
    collapsed: boolean;
}

export default class StandardWorkspaceComponent extends React.PureComponent<Props, State> {
    public constructor(props: any) {
        super(props);
        this.state = {
            collapsed: false,
        };
    }

    private onSideCollapserClick = (): void => {
        const { onSidebarFoldUnfold } = this.props;

        this.setState(
            (prevState: State): State => ({
                collapsed: !prevState.collapsed,
            }),
        );

        const [sidebar] = window.document
            .getElementsByClassName('cvat-annotation-page-objects-sidebar');
        sidebar.addEventListener('transitionend', () => {
            onSidebarFoldUnfold();
        }, { once: true });
    };

    public render(): JSX.Element {
        const { collapsed } = this.state;
        return (
            <Layout.Sider
                className='cvat-annotation-page-objects-sidebar'
                theme='light'
                width={300}
                collapsedWidth={0}
                reverseArrow
                collapsible
                trigger={null}
                collapsed={collapsed}
            >
                {/* eslint-disable-next-line */}
                <span
                    className={`cvat-annotation-page-objects-sidebar
                        ant-layout-sider-zero-width-trigger
                        ant-layout-sider-zero-width-trigger-left`}
                    onClick={this.onSideCollapserClick}
                >
                    {collapsed ? <Icon type='menu-fold' title='Show' />
                        : <Icon type='menu-unfold' title='Hide' />}
                </span>

                <ObjectsBlockContainer />
                <AppearanceSettingsContainer />
            </Layout.Sider>
        );
    }
}
