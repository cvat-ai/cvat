import React from 'react';

import {
    Icon,
    Layout,
} from 'antd';

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
            collapsed: true,
        };
    }

    public render(): JSX.Element {
        const { collapsed } = this.state;
        const { onSidebarFoldUnfold } = this.props;

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
                    onClick={(): void => {
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
                    }}
                >
                    {collapsed ? <Icon type='menu-fold' title='Show' />
                        : <Icon type='menu-unfold' title='Hide' />}
                </span>

                Right sidebar
            </Layout.Sider>
        );
    }
}
