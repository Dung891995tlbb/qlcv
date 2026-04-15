/**
 * SyncBadge — Real-time sync status indicator.
 * Reusable across all views.
 */
import React from 'react';

const SyncBadge = ({ label = 'Online' }) => (
  <div className="sync-status">
    <div className="sync-badge">
      <span className="sync-dot" />
      Real-time
    </div>
    <div className="sync-label">{label}</div>
  </div>
);

export default React.memo(SyncBadge);
