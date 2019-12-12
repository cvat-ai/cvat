import React from 'react';

import {
    Icon,
    Layout,
} from 'antd';

interface State {
    collapsed: boolean;
}

export default class StandardWorkspaceComponent extends React.PureComponent<{}, State> {
    public constructor() {
        super(arguments);

        this.state = {
            collapsed: false,
        }
    }

    public render() {
        return (
            <Layout.Sider
                className='cvat-annotation-page-objects-sidebar'
                theme='light'
                width={300}
                collapsedWidth={0}
                reverseArrow={true}
                collapsible={true}
                trigger={null}
                collapsed={this.state.collapsed}
            >
                <span className={`cvat-annotation-page-objects-sidebar
                        ant-layout-sider-zero-width-trigger ant-layout-sider-zero-width-trigger-left`}
                    onClick={
                        () => this.setState({collapsed: !this.state.collapsed})
                    }
                >
                    {this.state.collapsed && <Icon type='menu-fold' title='Show'/>}
                    {!this.state.collapsed && <Icon type='menu-unfold' title='Hide'/>}
                </span>

                Right sidebar</Layout.Sider>
        );
    }
}

