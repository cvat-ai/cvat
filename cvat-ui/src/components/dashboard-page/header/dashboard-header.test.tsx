import React from 'react';
import ReactDOM from 'react-dom';

import DashboardHeader from './dashboard-header';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<DashboardHeader />, div);
  ReactDOM.unmountComponentAtNode(div);
});
