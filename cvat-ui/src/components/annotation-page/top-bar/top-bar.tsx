import React from 'react';

import {
    Icon,
    Layout,
    Button,
} from 'antd';

import {
    MainMenuIcon,
    SaveIcon,
    UndoIcon,
    RedoIcon,
} from '../../../icons';

export default function AnnotationPageComponent(): JSX.Element {
    return (
        <Layout.Header className='cvat-annotation-page-header'>
            <div className='annotation-header-left-group'>
                <div>
                    <Icon component={MainMenuIcon} />
                    <span>Menu</span>
                </div>

                <div>
                    <Icon component={SaveIcon} />
                    <span>Save</span>
                </div>

                <div>
                    <Icon component={UndoIcon} />
                    <span>Undo</span>
                </div>

                <div>
                    <Icon component={RedoIcon} />
                    <span>Redo</span>
                </div>
            </div>
        </Layout.Header>
    );
}
