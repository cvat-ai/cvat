import React from 'react';

import {
    Row,
    Col,
    Form,
    Input,
    Button,
    Modal,
} from 'antd';

import { FormComponentProps } from 'antd/lib/form/Form';
import Text from 'antd/lib/typography/Text';
import AttributeForm from './attribute-form';

import patterns from '../../utils/validation-patterns';

interface ConstructorCreatorProps {
    onCreate: (label: any) => void;
}

interface ConstructorCreaterState {
    name: string;
    attributes: any[];
}

type Props = ConstructorCreatorProps & FormComponentProps;
type State = ConstructorCreaterState;

class ConstructorCreator extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);

        this.state = {
            name: '',
            attributes: [],
        };
    }

    private handleSubmitLabel = (e: React.FormEvent) => {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.onCreate({
                    name: values.name,
                    attributes: this.state.attributes,
                })
            }
        });
    };

    private handleNewAttribute = (values: any) => {
        if (this.state.attributes.length === values.id) {
            this.state.attributes.push({
                id: values.id,
            });
        }

        const attr = this.state.attributes[values.id];
        attr.name = values.name;
        attr.type = values.type.toLowerCase();
        attr.mutable = values.mutable;
        attr.values = values.values;

        this.setState({
            attributes: [...this.state.attributes],
        });
    }

    private handleDeleteAttribute = (id: number) => {
        if (id < this.state.attributes.length) {
            this.state.attributes[id].deleted = true;

            this.setState({
                attributes: [...this.state.attributes],
            });
        }

        // else hasn't been saved yet
    }

    private validateLabelName = () => {
        const value = this.state.name;
        if (!value) {
            Modal.error({
                title: 'Could not add label',
                content: 'Specify a name',
            });

            return false;
        }

        if (!patterns.validateLabelName.pattern.test(value)) {
            Modal.error({
                title: 'Could not add label',
                content: patterns.validateLabelName.message,
            });

            return false;
        }

        return true;
    }

    public render() {
        const forms = this.state.attributes.filter((attr) => !attr.deleted)
            .map((attr: any) => (
                <Row type='flex' justify='space-between' align='middle' key={attr.id}>
                    <Col span={24}>
                        <AttributeForm
                            id={attr.id}
                            onSubmit={this.handleNewAttribute}
                            onDelete={this.handleDeleteAttribute}
                            instance={attr}
                        />
                    </Col>
                </Row>
            ));

        forms.push(
            <Row type='flex' justify='space-between' align='middle' key={this.state.attributes.length}>
                <Col span={24}>
                    <AttributeForm
                        onSubmit={this.handleNewAttribute}
                        onDelete={this.handleDeleteAttribute}
                        id={this.state.attributes.length}
                        instance={null}
                    />
                </Col>
            </Row>
        );

        return (
            <>
                <Row type='flex' justify='space-between' align='middle' style={{marginTop: '10px'}}>
                    <Col span={9}>
                        <Input
                            placeholder='Label name'
                            onChange={(e) => {
                                this.setState({
                                    name: e.target.value,
                                });
                            }}
                        />
                    </Col>
                </Row>
                <Row type='flex' justify='start' align='middle'>
                    <Col span={24}>
                        <Text> Attributes </Text>
                    </Col>
                </Row>
                { forms.reverse() }
                <Row type='flex' justify='space-between' align='middle'>
                    <Col>
                        <Button
                            style={{width: '150px'}}
                            type='primary'
                            onClick={() => {
                                if (this.validateLabelName()) {
                                    this.props.onCreate({
                                        name: this.state.name,
                                        attributes: this.state.attributes,
                                    });
                                }
                            }

                            }
                        > Add Label </Button>
                    </Col>
                    <Col>
                        <Button
                            style={{width: '150px'}}
                            type='danger'
                            onClick={() => {
                                this.props.onCreate(null);
                            }}
                        > Cancel </Button>
                    </Col>
                </Row>
            </>
        );
    }
}

export default Form.create<Props>()(ConstructorCreator);
