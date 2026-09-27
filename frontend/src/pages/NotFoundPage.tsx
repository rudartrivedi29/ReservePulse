import React from 'react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <h1 className="not-found-code">404</h1>
      <h2 className="not-found-title">Page Not Found</h2>
      <p className="not-found-desc">
        The requested resource is not part of the active route registry.
      </p>
      <a href="/" className="action-button primary">
        Return Home
      </a>
    </div>
  );
};
