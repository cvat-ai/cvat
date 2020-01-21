import React from 'react';

import {
    Row,
    Col,
    Icon,
    Input,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import {
    ExpandObjectsIcon,
} from 'icons';

import ObjectItem from './object-item';

interface Props {
    annotations: any[];
    labels: any[];
    onAnnotationsUpdated(annotations: any[]): void;
}

interface State {
    collapsedStates: Record<number, boolean>;
}

const Header = React.memo((): JSX.Element => (
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
                <Icon type='lock' />
            </Col>
            <Col span={2}>
                <Icon type='eye-invisible' />
            </Col>
            <Col span={2}>
                <Icon component={ExpandObjectsIcon} />
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
));


export default class ObjectsList extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            collapsedStates: {},
        };
    }

    private onStateCollapse = (state: any, key: string | string[]): void => {
        const { collapsedStates } = this.state;
        const collapsedItem = key === 'appearance' || key.includes('appearance');

        const updatedcollapsedStates = {
            ...collapsedStates,
        };
        updatedcollapsedStates[state.clientID] = collapsedItem;

        this.setState({
            collapsedStates: updatedcollapsedStates,
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
        const updatedCollapsedStates = { ...state.collapsedStates };

        const clientIdxs = [];
        for (const objectState of props.annotations) {
            clientIdxs.push(objectState.clientID);
            if (!(objectState.clientID in updatedCollapsedStates)) {
                updatedCollapsedStates[objectState.clientID] = true;
            }
        }

        for (const key of Object.keys(updatedCollapsedStates)) {
            if (!clientIdxs.includes(+key)) {
                delete updatedCollapsedStates[+key];
            }
        }

        return {
            ...state,
            collapsedStates: updatedCollapsedStates,
        };
    }

    public render(): JSX.Element {
        const {
            annotations,
            labels,
        } = this.props;
        const { collapsedStates } = this.state;

        return (
            <>
                <Header />
                <div className='cvat-objects-sidebar-states-list'>
                    { annotations.map((objectState: any): JSX.Element => (
                        <ObjectItem
                            key={objectState.clientID}
                            objectState={objectState}
                            labels={labels}
                            collapsed={collapsedStates[objectState.clientID]}
                            onCollapse={this.onStateCollapse}
                            onUpdate={this.onStateUpdate}
                        />
                    ))}
                </div>
            </>
        );
    }
}
