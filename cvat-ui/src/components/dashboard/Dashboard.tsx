import React, { Component } from 'react';

import './Dashboard.css';

declare const window: any;

class Dashboard extends Component {
  constructor(props: any) {
    super(props);
  }
  componentWillMount() {
    window.cvat.server.login('admin', 'admin').then(
      (response: any) => {
        console.log(response);
      },
      (error: any) => {
        console.log(error);
      }
    );

    window.cvat.tasks.get().then(
      (response: any) => {
        console.log(response);
      },
      (error: any) => {
        console.log(error);
      }
    );
  }

  render() {
    return(
      <div className="Dashboard">

      </div>
    );
  }
}

export default Dashboard;
