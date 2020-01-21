import React from 'react';

import {
    Row,
    Col,
    Icon,
    Input,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import ObjectItem from './object-item';

interface HeaderProps {
    statesHidden: boolean;
    statesLocked: boolean;
    statesExpanded: boolean;
    onStatesCollapse(value: boolean): void;
}

const Header = React.memo((props: HeaderProps): JSX.Element => {
    const {
        statesHidden,
        statesLocked,
        statesExpanded,
        onStatesCollapse,
    } = props;

    return (
        <div className='cvat-objects-sidebar-states-header'>
            <Row>
                <Col>
                    <Input
                        placeholder='Filter e.g. car[attr/model="mazda"]'
                        prefix={<Icon type='filter' />}
                    />
                </Col>
            </Row>
            <Row type='flex' justify='space-between' align='middle'>
                <Col span={2}>
                    { statesLocked
                        ? <Icon type='lock' />
                        : <Icon type='unlock' />
                    }
                </Col>
                <Col span={2}>
                    { statesHidden
                        ? <Icon type='eye-invisible' />
                        : <Icon type='eye' />
                    }
                </Col>
                <Col span={2}>
                    { statesExpanded
                        ? <Icon type='caret-up' onClick={(): void => onStatesCollapse(true)} />
                        : <Icon type='caret-down' onClick={(): void => onStatesCollapse(false)} />
                    }
                </Col>
                <Col span={16}>
                    <Text strong>Sort by</Text>
                    <Select defaultValue='id'>
                        <Select.Option key='id'> ID </Select.Option>
                        <Select.Option key='updated'> Updated </Select.Option>
                    </Select>
                </Col>
            </Row>
        </div>
    );
});

interface Props {
    annotations: any[];
    labels: any[];
    listHeight: number;
    onAnnotationsUpdated(annotations: any[]): void;
}

interface State {
    itemCollapseStatuses: Record<number, boolean>;
}

export default class ObjectsList extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            itemCollapseStatuses: {},
        };
    }

    private onStatesCollapse = (value: boolean): void => {
        const { itemCollapseStatuses } = this.state;
        const updatedItemCollapseStatuses = {
            ...itemCollapseStatuses,
        };

        for (const key of Object.keys(updatedItemCollapseStatuses)) {
            updatedItemCollapseStatuses[+key] = value;
        }

        this.setState({
            itemCollapseStatuses: updatedItemCollapseStatuses,
        });
    };

    private onStateCollapse = (clientID: number, key: string | string[]): void => {
        const { itemCollapseStatuses } = this.state;
        const collapsedItem = key !== 'details' && !key.includes('details');

        const updatedItemCollapseStatuses = {
            ...itemCollapseStatuses,
        };
        updatedItemCollapseStatuses[clientID] = collapsedItem;

        this.setState({
            itemCollapseStatuses: updatedItemCollapseStatuses,
        });
    };

    private onStateUpdate = (state: any): void => {
        const {
            annotations,
            onAnnotationsUpdated,
        } = this.props;

        state.save().then((updatedState: any) => {
            const indexOf = annotations.indexOf(state);
            if (indexOf !== -1) {
                const updatedAnnotations = [...annotations];
                updatedAnnotations[indexOf] = updatedState;
                onAnnotationsUpdated(updatedAnnotations);
            }
        });
    };

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        const updateditemCollapseStatuses = { ...state.itemCollapseStatuses };

        const clientIdxs = [];
        for (const objectState of props.annotations) {
            clientIdxs.push(objectState.clientID);
            if (!(objectState.clientID in updateditemCollapseStatuses)) {
                updateditemCollapseStatuses[objectState.clientID] = true;
            }
        }

        for (const key of Object.keys(updateditemCollapseStatuses)) {
            if (!clientIdxs.includes(+key)) {
                delete updateditemCollapseStatuses[+key];
            }
        }

        return {
            ...state,
            itemCollapseStatuses: updateditemCollapseStatuses,
        };
    }

    public render(): JSX.Element {
        const {
            annotations,
            labels,
            listHeight,
        } = this.props;

        const { itemCollapseStatuses } = this.state;

        const statesHidden = annotations
            .reduce((acc: boolean, state: any) => acc && !state.visible, true);
        const statesLocked = annotations
            .reduce((acc: boolean, state: any) => acc && state.lock, true);
        const statesExpanded = Object.keys(itemCollapseStatuses)
            .reduce((acc: boolean, key: string) => acc && !itemCollapseStatuses[+key], true);

        return (
            <div style={{ height: listHeight }}>
                <Header
                    statesHidden={statesHidden}
                    statesLocked={statesLocked}
                    statesExpanded={statesExpanded}
                    onStatesCollapse={this.onStatesCollapse}
                />
                <div className='cvat-objects-sidebar-states-list'>
                    { annotations.map((objectState: any): JSX.Element => (
                        <ObjectItem
                            key={objectState.clientID}
                            objectState={objectState}
                            labels={labels}
                            collapsed={itemCollapseStatuses[objectState.clientID]}
                            onCollapse={this.onStateCollapse}
                            onUpdate={this.onStateUpdate}
                        />
                    ))}
                </div>
            </div>
        );
    }
}
