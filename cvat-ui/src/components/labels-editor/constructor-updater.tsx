import React from 'react';

import LabelForm from './label-form';
import { Label, Attribute } from './common';

interface Props {
    label: Label;
    onUpdate: (label: Label | null) => void;
}

interface State {
    savedAttributes: Attribute[];
    unsavedAttributes: Attribute[];
}

export default class ConstructorUpdater extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return (
            <div className='cvat-label-constructor-updater'>
                <LabelForm label={this.props.label} onSubmit={this.props.onUpdate}/>
            </div>
        );
    }
}
