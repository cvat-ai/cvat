import React from 'react';

import {
    Row,
    Col,
    Icon,
    Slider,
    Layout,
    Input,
    Tooltip,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

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
    InfoIcon,
    FullscreenIcon,
} from '../../../icons';

export default function AnnotationPageComponent(): JSX.Element {
    return (
        <Layout.Header className='cvat-annotation-page-header'>
            <Row type='flex' justify='space-between'>
                <Col className='cvat-annotation-header-left-group'>
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
                <Col className='cvat-annotation-header-player-group'>
                    <Row type='flex'>
                        <Col className='cvat-annotation-header-player-buttons'>
                            <Icon component={PlaycontrolFirstIcon} />
                            <Icon component={PlaycontrolBackJumpIcon} />
                            <Icon component={PlaycontrolPreviousIcon} />
                            <Icon component={PlaycontrolPlayIcon} />
                            <Icon component={PlaycontrolNextIcon} />
                            <Icon component={PlaycontrolForwardJumpIcon} />
                            <Icon component={PlaycontrolLastIcon} />
                        </Col>
                        <Col className='cvat-annotation-header-player-controls'>
                            <Row type='flex'>
                                <Col>
                                    <Slider className='cvat-annotation-header-player-slider' tipFormatter={null} />
                                </Col>
                            </Row>
                            <Row type='flex' justify='space-between'>
                                <Col className='cvat-annotation-header-filename-wrapper'>
                                    <Tooltip overlay='filename.png'>
                                        <Text type='secondary'>filename.png</Text>
                                    </Tooltip>
                                </Col>
                                <Col>
                                    <Input className='cvat-annotation-header-frame-selector' type='number' size='small' />
                                    <Text type='secondary'>of 200</Text>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
                <Col className='cvat-annotation-header-right-group'>
                    <div>
                        <Icon component={FullscreenIcon} />
                        <span>Fullscreen</span>
                    </div>
                    <div>
                        <Icon component={InfoIcon} />
                        <span>Info</span>
                    </div>
                    <div>
                        <Select className='cvat-annotation-header-workspace-selector' defaultValue='standard'>
                            <Select.Option key='standard' value='standard'>Standard</Select.Option>
                            <Select.Option key='aam' value='aam'>Attribute annotation</Select.Option>
                        </Select>
                    </div>
                </Col>
            </Row>
        </Layout.Header>
    );
}
