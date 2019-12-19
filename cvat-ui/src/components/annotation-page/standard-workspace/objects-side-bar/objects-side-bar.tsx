import React from 'react';

import {
    Icon,
    Layout,
} from 'antd';

interface State {
    collapsed: boolean;
}

export default class StandardWorkspaceComponent extends React.PureComponent<{}, State> {
    public constructor(props: any) {
        super(props);
        this.state = {
            collapsed: true,
        };
    }

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
                    onClick={
                        (): void => this.setState(
                            (prevState: State): State => ({
                                collapsed: !prevState.collapsed,
                            }),
                        )
                    }
                >
                    {collapsed ? <Icon type='menu-fold' title='Show' />
                        : <Icon type='menu-unfold' title='Hide' />}
                </span>

                Right sidebar
            </Layout.Sider>
        );
    }
}
