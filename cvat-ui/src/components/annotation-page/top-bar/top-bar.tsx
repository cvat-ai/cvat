import React from 'react';

import {
    Row,
    Col,
    Icon,
    Layout,
} from 'antd';

import {
    MainMenuIcon,
    SaveIcon,
    UndoIcon,
    RedoIcon,
    PlaycontrolFirstIcon,
    PlaycontrolBackJumpIcon,
    PlaycontrolPreviousIcon,
    PlaycontrolPlayIcon,
    PlaycontrolNextIcon,
    PlaycontrolForwardJumpIcon,
    PlaycontrolLastIcon,
} from '../../../icons';

export default function AnnotationPageComponent(): JSX.Element {
    return (
        <Layout.Header className='cvat-annotation-page-header'>
            <Row type='flex' justify='space-between'>
                <Col className='annotation-header-left-group'>
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
                </Col>
                <Col className='annotation-header-player-group'>
                    <Icon component={PlaycontrolFirstIcon} />
                    <Icon component={PlaycontrolBackJumpIcon} />
                    <Icon component={PlaycontrolPreviousIcon} />
                    <Icon component={PlaycontrolPlayIcon} />
                    <Icon component={PlaycontrolNextIcon} />
                    <Icon component={PlaycontrolForwardJumpIcon} />
                    <Icon component={PlaycontrolLastIcon} />
                </Col>
                <Col className='annotation-header-right-group'>

                </Col>
            </Row>
        </Layout.Header>
    );
}
