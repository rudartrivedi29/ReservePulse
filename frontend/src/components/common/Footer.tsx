import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} ReservePulse. Decoupled Frontend / Backend / Database Architecture.
        </p>
        <div className="footer-links">
          <span>TypeScript</span>
          <span className="dot-sep">&bull;</span>
          <span>React + Vite</span>
          <span className="dot-sep">&bull;</span>
          <span>Express</span>
          <span className="dot-sep">&bull;</span>
          <span>PostgreSQL</span>
        </div>
      </div>
    </footer>
  );
};
