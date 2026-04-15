/**
 * AppHeader — Shared page header with icon, title, navigation, and sync status.
 * Supports variant prop for different icon backgrounds per view.
 */
import React from 'react';
import SyncBadge from './SyncBadge';

const AppHeader = ({ icon, title, syncLabel, variant, children }) => (
  <header className="app-header">
    <div className="header-left">
      <div className={`header-icon ${variant ? `header-icon--${variant}` : ''}`}>
        {icon}
      </div>
      <div>
        <h1 className="header-title">{title}</h1>
        {children && <nav className="nav-links">{children}</nav>}
      </div>
    </div>
    <SyncBadge label={syncLabel} />
  </header>
);

export default React.memo(AppHeader);
