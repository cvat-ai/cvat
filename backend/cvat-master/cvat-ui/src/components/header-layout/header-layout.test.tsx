import React from 'react';
import ReactDOM from 'react-dom';

import HeaderLayout from './header-layout';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<HeaderLayout />, div);
  ReactDOM.unmountComponentAtNode(div);
});
