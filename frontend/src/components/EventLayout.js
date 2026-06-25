import React from 'react';
import './Events.css';
import PortalHeader from './PortalHeader';
import PortalFooter from './PortalFooter';

const EventLayout = ({ active = 'events', children, shellClassName = '' }) => {
  return (
    <div className="events-page events-page-layout">
      <PortalHeader active={active} />
      <main className={`events-shell ${shellClassName}`.trim()}>{children}</main>
      <PortalFooter />
    </div>
  );
};

export default EventLayout;
