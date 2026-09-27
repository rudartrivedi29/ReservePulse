import React from 'react';
import { AppLayoutShell } from './AppLayoutShell';

export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <AppLayoutShell role="admin">{children}</AppLayoutShell>;
};
