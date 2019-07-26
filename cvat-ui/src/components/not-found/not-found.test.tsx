import React from 'react';
import ReactDOM from 'react-dom';
import NotFound from './not-found';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<NotFound />, div);
  ReactDOM.unmountComponentAtNode(div);
});
