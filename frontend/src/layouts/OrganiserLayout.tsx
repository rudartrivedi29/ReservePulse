import React from 'react';
import { AppLayoutShell } from './AppLayoutShell';

export const OrganiserLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <AppLayoutShell role="organiser">{children}</AppLayoutShell>;
};
