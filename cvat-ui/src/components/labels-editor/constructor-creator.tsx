import React from 'react';

import {
    Row,
    Col,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import AttributeForm from './attribute-form';
import LabelForm from './label-form';

interface Props {
    onCreate: (label: any) => void;
}

interface State {
    attributes: any[];
}


export default class ConstructorCreator extends React.PureComponent<Props, State> {
    private formRefs: any[];

    public constructor(props: Props) {
        super(props);

        this.formRefs = [];
        this.state = {
            attributes: [],
        };
    }

    private handleNewAttribute = (values: any) => {
        if (this.state.attributes.length === values.id) {
            // Hasn't been added yet, we have to add it
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

    private renderAttrForm(attribute: any) {
        const id = attribute === null ?
            this.state.attributes.length : attribute.id;

        return (
            <Row type='flex' justify='space-between' align='middle' key={id}>
                <Col span={24}>
                    <AttributeForm
                        ref={(el) => el ? this.formRefs.push(el) : null}
                        id={id}
                        onSubmit={this.handleNewAttribute}
                        onDelete={this.handleDeleteAttribute}
                        instance={attribute}
                    />
                </Col>
            </Row>
        )
    }

    public render() {
        this.formRefs = [];
        // Render all forms with entered attributes
        const forms = this.state.attributes.filter((attr) => !attr.deleted)
            .map((attr: any) => this.renderAttrForm(attr));

        // Render a form for a new attribute
        forms.push(this.renderAttrForm(null));

        return (
            <div className='cvat-label-constructor-creator'>
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={9}>
                        <LabelForm id='labelForm' onSubmit={(name) => {
                            this.props.onCreate({
                                name,
                                attributes: this.state.attributes,
                            });

                            this.setState({
                                attributes: [],
                            });

                            this.formRefs.forEach((ref) => ref.resetFields());
                        }}/>
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
                            form='labelForm'
                            htmlType='submit'
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
            </div>
        );
    }
}
