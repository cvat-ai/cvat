import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Text from 'antd/lib/typography/Text';

import { ObjectState } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { activateObject } from 'actions/annotation-actions';
import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ItemDetailsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { getColor } from './shared';

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
    const states = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const activatedElementID = useSelector((state: CombinedState) => state.annotation.annotations.activatedElementID);
    const colorBy = useSelector((state: CombinedState) => state.settings.shapes.colorBy);
    const activate = useCallback(() => {
        dispatch(activateObject(parentID, clientID, null));
    }, [parentID, clientID]);
    const state = states.find((_state: ObjectState) => _state.clientID === parentID);
    const element = state.elements.find((_element: ObjectState) => _element.clientID === clientID);

    const elementColor = getColor(element, colorBy);
    const elementClassName = element.clientID === activatedElementID ?
        'cvat-objects-sidebar-state-item-elements cvat-objects-sidebar-state-active-element' :
        'cvat-objects-sidebar-state-item-elements';

    return (
        <div
            id={`cvat-objects-sidebar-state-item-element-${element.clientID}`}
            onMouseEnter={activate}
            onMouseLeave={onMouseLeave}
            key={clientID}
            className={elementClassName}
            style={{ background: `${elementColor}` }}
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
                    readonly={readonly}
                    parentID={parentID}
                    clientID={clientID}
                />
            )}
        </div>
    );
}

export default React.memo(ObjectItemElementComponent);
