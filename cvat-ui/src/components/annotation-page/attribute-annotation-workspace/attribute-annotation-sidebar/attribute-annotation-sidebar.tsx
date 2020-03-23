// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';
import { connect } from 'react-redux';
import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import Layout, { SiderProps } from 'antd/lib/layout';
import { SelectValue } from 'antd/lib/select';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import { LogType } from 'cvat-logger';
import {
    activateObject as activateObjectAction,
    updateAnnotationsAsync,
} from 'actions/annotation-actions';
import { CombinedState } from 'reducers/interfaces';
import AnnotationsFiltersInput from 'components/annotation-page/annotations-filters-input';
import ObjectSwitcher from './object-switcher';
import AttributeSwitcher from './attribute-switcher';
import ObjectBasicsEditor from './object-basics-edtior';
import AttributeEditor from './attribute-editor';


interface StateToProps {
    activatedStateID: number | null;
    activatedAttributeID: number | null;
    states: any[];
    labels: any[];
    jobInstance: any;
}

interface DispatchToProps {
    activateObject(clientID: number | null, attrID: number | null): void;
    updateAnnotations(statesToUpdate: any[]): void;
}

interface LabelAttrMap {
    [index: number]: any;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                activatedStateID,
                activatedAttributeID,
                states,
            },
            job: {
                instance: jobInstance,
                labels,
            },
        },
    } = state;

    return {
        jobInstance,
        labels,
        activatedStateID,
        activatedAttributeID,
        states,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<CombinedState, {}, Action>): DispatchToProps {
    return {
        activateObject(clientID: number, attrID: number): void {
            dispatch(activateObjectAction(clientID, attrID));
        },
        updateAnnotations(states): void {
            dispatch(updateAnnotationsAsync(states));
        },
    };
}

function AttributeAnnotationSidebar(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        labels,
        states,
        activatedStateID,
        activatedAttributeID,
        jobInstance,
        updateAnnotations,
        activateObject,
    } = props;

    const [labelAttrMap, setLabelAttrMap] = useState(
        labels.reduce((acc, label): LabelAttrMap => {
            acc[label.id] = label.attributes.length ? label.attributes[0] : null;
            return acc;
        }, {}),
    );

    const [activeObjectState] = activatedStateID === null
        ? [null] : states.filter((objectState: any): boolean => (
            objectState.clientID === activatedStateID
        ));
    const activeAttribute = activeObjectState
        ? labelAttrMap[activeObjectState.label.id]
        : null;

    if (activeObjectState) {
        const attribute = labelAttrMap[activeObjectState.label.id];
        if (attribute && attribute.id !== activatedAttributeID) {
            activateObject(activatedStateID, attribute ? attribute.id : null);
        }
    } else if (states.length) {
        const attribute = labelAttrMap[states[0].label.id];
        activateObject(states[0].clientID, attribute ? attribute.id : null);
    }

    const nextObject = (step: number): void => {
        if (states.length) {
            const index = states.indexOf(activeObjectState);
            let nextIndex = index + step;
            if (nextIndex > states.length - 1) {
                nextIndex = 0;
            } else if (nextIndex < 0) {
                nextIndex = states.length - 1;
            }
            if (nextIndex !== index) {
                const attribute = labelAttrMap[states[nextIndex].label.id];
                activateObject(states[nextIndex].clientID, attribute ? attribute.id : null);
            }
        }
    };

    const nextAttribute = (step: number): void => {
        if (activeObjectState) {
            const { label } = activeObjectState;
            const { attributes } = label;
            if (attributes.length) {
                const index = attributes.indexOf(activeAttribute);
                let nextIndex = index + step;
                if (nextIndex > attributes.length - 1) {
                    nextIndex = 0;
                } else if (nextIndex < 0) {
                    nextIndex = attributes.length - 1;
                }
                if (index !== nextIndex) {
                    const updatedLabelAttrMap = { ...labelAttrMap };
                    updatedLabelAttrMap[label.id] = attributes[nextIndex];
                    setLabelAttrMap(updatedLabelAttrMap);
                }
            }
        }
    };

    useEffect(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, []);

    const siderProps: SiderProps = {
        className: 'attribute-annotation-sidebar',
        theme: 'light',
        width: 300,
        collapsedWidth: 0,
        reverseArrow: true,
        collapsible: true,
        trigger: null,
    };

    const keyMap = {
        NEXT_ATTRIBUTE: {
            name: 'Next attribute',
            description: 'Go to the next attribute',
            sequence: 'ArrowDown',
            action: 'keydown',
        },
        PREVIOUS_ATTRIBUTE: {
            name: 'Previous attribute',
            description: 'Go to the previous attribute',
            sequence: 'ArrowUp',
            action: 'keydown',
        },
        NEXT_OBJECT: {
            name: 'Next object',
            description: 'Go to the next object',
            sequence: 'Tab',
            action: 'keydown',
        },
        PREVIOUS_OBJECT: {
            name: 'Previous object',
            description: 'Go to the previous object',
            sequence: 'Shift+Tab',
            action: 'keydown',
        },
    };

    const handlers = {
        NEXT_ATTRIBUTE: (event: KeyboardEvent | undefined) => {
            if (event) {
                event.preventDefault();
            }

            nextAttribute(1);
        },
        PREVIOUS_ATTRIBUTE: (event: KeyboardEvent | undefined) => {
            if (event) {
                event.preventDefault();
            }

            nextAttribute(-1);
        },
        NEXT_OBJECT: (event: KeyboardEvent | undefined) => {
            if (event) {
                event.preventDefault();
            }

            nextObject(1);
        },
        PREVIOUS_OBJECT: (event: KeyboardEvent | undefined) => {
            if (event) {
                event.preventDefault();
            }

            nextObject(-1);
        },
    };

    if (activeObjectState) {
        return (
            <Layout.Sider {...siderProps}>
                <GlobalHotKeys keyMap={keyMap as any as KeyMap} handlers={handlers} allowChanges />
                <Row>
                    <Col>
                        <AnnotationsFiltersInput />
                    </Col>
                </Row>
                <ObjectSwitcher
                    currentLabel={activeObjectState.label.name}
                    clientID={activeObjectState.clientID}
                    occluded={activeObjectState.occluded}
                    objectsCount={states.length}
                    currentIndex={states.indexOf(activeObjectState)}
                    nextObject={nextObject}
                />
                <ObjectBasicsEditor
                    currentLabel={activeObjectState.label.name}
                    labels={labels}
                    occluded={activeObjectState.occluded}
                    changeLabel={(value: SelectValue): void => {
                        const labelName = value as string;
                        const [newLabel] = labels
                            .filter((_label): boolean => _label.name === labelName);
                        activeObjectState.label = newLabel;
                        updateAnnotations([activeObjectState]);
                    }}
                    setOccluded={(event: CheckboxChangeEvent): void => {
                        activeObjectState.occluded = event.target.checked;
                        updateAnnotations([activeObjectState]);
                    }}
                />
                {
                    activeAttribute
                        ? (
                            <>
                                <AttributeSwitcher
                                    currentAttribute={activeAttribute.name}
                                    currentIndex={activeObjectState.label.attributes
                                        .indexOf(activeAttribute)}
                                    attributesCount={activeObjectState.label.attributes.length}
                                    nextAttribute={nextAttribute}
                                />
                                <AttributeEditor
                                    attribute={activeAttribute}
                                    currentValue={activeObjectState.attributes[activeAttribute.id]}
                                    onChange={(value: string) => {
                                        const { attributes } = activeObjectState;
                                        jobInstance.logger.log(
                                            LogType.changeAttribute, {
                                                id: activeAttribute.id,
                                                object_id: activeObjectState.clientID,
                                                value,
                                            },
                                        );
                                        attributes[activeAttribute.id] = value;
                                        activeObjectState.attributes = attributes;
                                        updateAnnotations([activeObjectState]);
                                    }}
                                />

                            </>
                        ) : (
                            <div className='attribute-annotations-sidebar-not-found-wrapper'>
                                <Text strong>No attributes found</Text>
                            </div>
                        )
                }
            </Layout.Sider>
        );
    }

    return (
        <Layout.Sider {...siderProps}>
            <div className='attribute-annotations-sidebar-not-found-wrapper'>
                <Text strong>No objects found</Text>
            </div>
        </Layout.Sider>
    );
}


export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AttributeAnnotationSidebar);
