import React from 'react';
import ReactDOM from 'react-dom';

import DashboardContent from './dashboard-content';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<DashboardContent />, div);
  ReactDOM.unmountComponentAtNode(div);
});
