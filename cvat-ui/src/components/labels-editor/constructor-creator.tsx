import React from 'react';
import LabelForm from './label-form';

import { Label, Attribute } from './common';

interface Props {
    onCreate: (label: Label | null) => void;
}

interface State {
    attributes: Attribute[];
}

export default class ConstructorCreator extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
    }

    public render() {
        return (
            <div className='cvat-label-constructor-creator'>
                <LabelForm label={null} onSubmit={this.props.onCreate}/>
            </div>
        );
    }
}
