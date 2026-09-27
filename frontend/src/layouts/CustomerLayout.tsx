import React from 'react';
import { AppLayoutShell } from './AppLayoutShell';

export const CustomerLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <AppLayoutShell role="customer">{children}</AppLayoutShell>;
};
