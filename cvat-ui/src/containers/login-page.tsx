import React from 'react';
import { Button, Icon, Input, Form, Col, Row } from 'antd';
import Title from 'antd/lib/typography/Title';

export default class LoginPage extends React.PureComponent {
    constructor(props: any) {
        super(props);
    }

    public render() {
        return (
            <div>
                <Row type="flex" justify="center" align="middle">
                    <Col xs={{span: 14}} sm={{span: 12}} md={{span: 10}} lg={{span: 8}} xl={{span: 6}}>
                        <Form>
                            <Title>Login</Title>
                        </Form>
                    </Col>
                </Row>
            </div>
        );
    }
}
