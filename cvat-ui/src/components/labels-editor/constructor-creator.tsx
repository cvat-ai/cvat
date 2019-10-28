import React from 'react';

import {
    Row,
    Col,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import AttributeForm from './attribute-form';
import LabelForm from './label-form';

import idGenerator, { Label, Attribute } from './common';

interface Props {
    onCreate: (label: Label | null) => void;
}

interface State {
    attributes: Attribute[];
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

    private handleSubmitAttribute = (values: any) => {
        const attributes = this.state.attributes
            .filter((attr: Attribute) => attr.id !== values.id);

        const attr: Attribute = {
            id: values.id,
            name: values.name,
            type: values.type.toLowerCase(),
            mutable: values.mutable,
            values: values.values,
        };

        this.setState({
            attributes: [...attributes, attr],
        });
    }

    private handleDeleteAttribute = (id: number) => {
        if (id < this.state.attributes.length) {
            const attributes = this.state.attributes
                .filter((attr: Attribute) => attr.id !== id);

            this.setState({
                attributes: [...attributes],
            });
        }
    }

    private renderAttrForm(attribute: Attribute | null) {
        const id = attribute === null ?
            idGenerator() : attribute.id;

        return (
            <Row type='flex' justify='space-between' align='middle' key={id}>
                <Col span={24}>
                    <AttributeForm
                        wrappedComponentRef={(el: any) => el ? this.formRefs.push(el) : null}
                        id={id}
                        onSubmit={this.handleSubmitAttribute}
                        onDelete={this.handleDeleteAttribute}
                        instance={attribute}
                    />
                </Col>
            </Row>
        )
    }

    public render() {
        this.formRefs = [];
        // Render all forms with entered attributes and a form for a new attribute
        const forms = this.state.attributes.concat([null as any as Attribute])
            .map((attr: Attribute) => this.renderAttrForm(attr));

        return (
            <div className='cvat-label-constructor-creator'>
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={9}>
                        <LabelForm id='labelForm' onSubmit={async (name): Promise<boolean> => {
                            let readyForSubmit = true;
                            for (const ref of this.formRefs) {
                                try {
                                    await ref.submitOutside();
                                } catch (error) {
                                    readyForSubmit = false;
                                }
                            }

                            if (readyForSubmit) {
                                this.props.onCreate({
                                    name,
                                    id: 0,  // will be redefined in onCreate to a right id
                                    attributes: this.state.attributes,
                                });

                                this.setState({
                                    attributes: [],
                                });
                            }

                            return readyForSubmit;
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
                        > Save & Continue </Button>
                    </Col>
                    <Col>
                        <Button
                            style={{width: '150px'}}
                            type='danger'
                            onClick={() => {
                                this.props.onCreate(null);
                            }}
                        > Cancel & Exit </Button>
                    </Col>
                </Row>
            </div>
        );
    }
}
