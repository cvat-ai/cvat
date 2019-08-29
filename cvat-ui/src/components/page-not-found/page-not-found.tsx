import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';

import { Empty } from 'antd';

import './page-not-found.scss';


class PageNotFound extends PureComponent<any, any> {
  render() {
    return(
      <Empty className="not-found" description="Page not found...">
        <Link to="/tasks">Go back to tasks</Link>
      </Empty>
    );
  }
}

export default PageNotFound;
