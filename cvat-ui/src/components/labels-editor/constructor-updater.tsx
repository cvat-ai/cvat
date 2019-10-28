import React from 'react';

// props is attributes and label name
// state is saved attributes and new attributes
// so, we draw and lock all existing attributes
// and we write the same like in a creator

// next id for attributes (just generate temporary negative ids)

import {
    Row,
    Col,
    Input,
    Button,
    Modal,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import AttributeForm from './attribute-form';
import idGenerator, { Label, Attribute } from './common';

interface Props {
    label: Label;
    onUpdate: (label: Label) => void;
}

interface State {
    savedAttributes: Attribute[];
    unsavedAttributes: Attribute[];
}

export default class ConstructorUpdater extends React.PureComponent<Props, State> {
    private formRefs: any[];

    constructor(props: Props) {
        super(props);

        this.formRefs = [];
        this.state = {
            savedAttributes: this.props.label.attributes
                .filter((attr: Attribute) => attr.id >= 0),
            unsavedAttributes: this.props.label.attributes
                .filter((attr: Attribute) => attr.id < 0),
        }
    }

    private handleSubmitAttribute = (values: any) => {
        if (values.id >= 0) {
            Modal.error({
                title: 'Could not update the attribute',
                content: 'It has been already saved on the server',
            });
        } else {
            const unsavedAttributes = this.state.unsavedAttributes
                .filter((attr: Attribute) => attr.id !== values.id);
            const attr: Attribute = {
                id: values.id,
                name: values.name,
                type: values.type.toLowerCase(),
                mutable: values.mutable,
                values: values.values,
            };
            unsavedAttributes.push(attr);
            this.setState({ unsavedAttributes });
        }
    }

    private handleDeleteAttribute = (id: number) => {
        if (id >= 0) {
            Modal.error({
                title: 'Could not delete the attribute',
                content: 'It has been already saved on the server',
            });
        } else {
            const unsavedAttributes = this.state.unsavedAttributes
                .filter((attr: Attribute) => attr.id !== id);
            this.setState({ unsavedAttributes });
        }
    }

    private renderAttrForm = (attribute: Attribute | null) => {
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

        const forms = this.state.savedAttributes
            .concat(this.state.unsavedAttributes).concat([null as any as Attribute])
            .map(this.renderAttrForm);

        return (
            <div className='cvat-label-constructor-updater'>
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={9}>
                        <Input disabled value={this.props.label.name}/>
                    </Col>
                </Row>
                <Row type='flex' justify='start' align='middle'>
                    <Col span={24}>
                        <Text> Attributes </Text>
                    </Col>
                </Row>

                { forms.reverse() }

                <Row type='flex' justify='start' align='middle'>
                    <Col>
                        <Button
                            style={{width: '150px'}}
                            type='primary'
                            onClick={async () => {
                                let readyForUpdate = true;
                                for (const ref of this.formRefs) {
                                    try {
                                        await ref.submitOutside();
                                    } catch (error) {
                                        readyForUpdate = false;
                                    }
                                }

                                if (readyForUpdate) {
                                    const label = this.props.label;
                                    label.attributes = this.state.savedAttributes
                                        .concat(this.state.unsavedAttributes);

                                    this.props.onUpdate(label);
                                }

                                return readyForUpdate;
                            }}
                        > Update </Button>
                    </Col>
                </Row>
            </div>
        );
    }
}
