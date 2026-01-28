// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Text from 'antd/lib/typography/Text';

import { ObjectState } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { activateObject } from 'actions/annotation-actions';
import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ItemDetailsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { getObjectStateColor } from './shared';

interface OwnProps {
    parentID: number;
    clientID: number;
    readonly: boolean;
    onMouseLeave?: () => void;
}

function ObjectItemElementComponent(props: OwnProps): JSX.Element {
    const {
        clientID, parentID, readonly, onMouseLeave,
    } = props;

    const dispatch = useDispatch();
    const {
        states,
        activatedElementId,
        colorBy,
    } = useSelector((state: CombinedState) => ({
        states: state.annotation.annotations.states,
        activatedElementId: state.annotation.annotations.activatedElementID,
        colorBy: state.settings.shapes.colorBy,
    }), shallowEqual);

    const activate = useCallback(() => {
        dispatch(activateObject(parentID, clientID, null));
    }, [parentID, clientID]);

    const state = states.find((_state: ObjectState) => _state.clientID === parentID);
    const element = state.elements.find((_element: ObjectState) => _element.clientID === clientID);
    const elementColor = getObjectStateColor(element, colorBy).rgbComponents();
    const elementClassName = element.clientID === activatedElementId ?
        'cvat-objects-sidebar-state-item-elements cvat-objects-sidebar-state-active-element' :
        'cvat-objects-sidebar-state-item-elements';

    return (
        <div
            id={`cvat-objects-sidebar-state-item-element-${element.clientID}`}
            onMouseEnter={activate}
            onMouseLeave={onMouseLeave}
            key={clientID}
            className={elementClassName}
            style={{ '--state-item-background': `${elementColor}` } as React.CSSProperties}
        >
            <Text
                type='secondary'
                style={{ fontSize: 10 }}
                className='cvat-objects-sidebar-state-item-object-type-text'
            >
                {`${element.label.name} [${element.shapeType.toUpperCase()}]`}
            </Text>
            <ObjectButtonsContainer readonly={readonly} clientID={element.clientID} />
            {!!element.label.attributes.length && (
                <ItemDetailsContainer
                    readonly={readonly || element.lock}
                    parentID={parentID}
                    clientID={clientID}
                />
            )}
        </div>
    );
}

export default React.memo(ObjectItemElementComponent);
