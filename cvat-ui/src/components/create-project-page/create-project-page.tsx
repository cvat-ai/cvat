// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {createContext, Dispatch, SetStateAction, useState} from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import CreateProjectContent from './create-project-content';
import {connect} from "react-redux";
import {CombinedState} from "../../reducers/interfaces";

interface IState<T> {
    value: T;
    set?: Dispatch<SetStateAction<T>>;
}
function getDefaultState<T>(value: T) {
    return {
        value,
    }
}

interface ICreateProjectContext {
    projectClass: IState<string>;
    trainingEnabled: IState<boolean>;
    isTrainingActive: IState<boolean>;
}

const defaultState: ICreateProjectContext = {
    projectClass: getDefaultState<string>(''),
    trainingEnabled: getDefaultState<boolean>(false),
    isTrainingActive: getDefaultState<boolean>(false),
}

export const CreateProjectContext = createContext<ICreateProjectContext>(defaultState);

function CreateProjectPageComponent(props: StateToProps): JSX.Element {
    const [projectClass , setProjectClass] = useState('');
    const [trainingEnabled, setTrainingEnabled] = useState(false);
    const [isTrainingActive, _] = useState(props.isTrainingActive);

    const defaultContext:ICreateProjectContext = {
        projectClass: {
            value: projectClass,
            set: setProjectClass,
        },
        trainingEnabled: {
            value: trainingEnabled,
            set: setTrainingEnabled,
        },
        isTrainingActive: {
            value: isTrainingActive,
        }
    };
    console.log(props.isTrainingActive)

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
    console.log(state.plugins.list)
    return {
        isTrainingActive: state.plugins.list.PREDICT,
    }
}

export default connect(mapStateToProps)(CreateProjectPageComponent);
