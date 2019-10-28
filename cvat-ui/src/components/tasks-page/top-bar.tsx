import React from 'react';
import {
    Col,
    Row,
    Button,
    Input,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface VisibleTopBarProps {
    onSearch: (value: string) => void;
    searchValue: string;
}

export default class TopBarComponent extends React.PureComponent<VisibleTopBarProps> {
    public render() {
        return (
            <>
                <Row type='flex' justify='center' align='middle'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <Text strong> Default project </Text>
                    </Col>
                </Row>
                <Row type='flex' justify='center' align='middle'>
                    <Col md={11} lg={9} xl={8} xxl={7}>
                        <Text className='cvat-title'> Tasks </Text>
                        <Input.Search
                            defaultValue={this.props.searchValue}
                            onSearch={this.props.onSearch}
                            size='large' placeholder='Search'
                        />
                    </Col>
                    <Col
                        md={{span: 11}}
                        lg={{span: 9}}
                        xl={{span: 8}}
                        xxl={{span: 7}}>
                        <Button size='large' id='cvat-create-task-button' type='primary' onClick={
                            () => window.open('/tasks/create', '_blank')
                        }> Create new task </Button>
                    </Col>
                </Row>
            </>
        )
    }
}