import React, { PureComponent } from 'react';

import { Empty, Button } from 'antd';

import './not-found.scss';

class NotFound extends PureComponent<any, any> {
  render() {
    return(
      <Empty className="not-found" description="Page not found...">
        <Button type="primary" href="/dashboard">
          Go back to dashboard
        </Button>
      </Empty>
    );
  }
}

export default NotFound;
