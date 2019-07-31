import React from 'react';
import ReactDOM from 'react-dom';

import DashboardFooter from './dashboard-footer';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<DashboardFooter />, div);
  ReactDOM.unmountComponentAtNode(div);
});
