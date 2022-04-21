// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import { connect } from 'react-redux';
import CreateProjectContent from './create-project-content';
import { CombinedState } from '../../reducers/interfaces';
import CreateProjectContext, { ICreateProjectContext } from './create-project.context';

function CreateProjectPageComponent(props: StateToProps): JSX.Element {
    const { isTrainingActive } = props;
    const [projectClass, setProjectClass] = useState('');
    const [trainingEnabled, setTrainingEnabled] = useState(false);
    const [isTrainingActiveState] = useState(isTrainingActive);

    const defaultContext: ICreateProjectContext = {
        projectClass: {
            value: projectClass,
            set: setProjectClass,
        },
        trainingEnabled: {
            value: trainingEnabled,
            set: setTrainingEnabled,
        },
        isTrainingActive: {
            value: isTrainingActiveState,
        },
    };
    return (
        <CreateProjectContext.Provider value={defaultContext}>
            <Row justify='center' align='top' className='cvat-create-task-form-wrapper'>
                <Col md={20} lg={16} xl={14} xxl={9}>
                    <Text className='cvat-title'>Create a new project</Text>
                    <CreateProjectContent />
                </Col>
            </Row>
        </CreateProjectContext.Provider>
    );
}

interface StateToProps {
    isTrainingActive: boolean;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        isTrainingActive: state.plugins.list.PREDICT,
    };
}

export default connect(mapStateToProps)(CreateProjectPageComponent);
