"use client";
import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';

export interface DrawerProps {
  className?: string;
  isOpen: boolean;
  direction?: 'left' | 'top' | 'right' | 'bottom';
  blockScrolling?: boolean;
  onClose?: () => void;
  'aria-label'?: string;
}

/** Accessible Launchpad drawer: focus containment, Escape, backdrop and focus return. */
const Drawer = ({ className = '', isOpen, direction = 'right', onClose,
  children, 'aria-label': label = 'Drawer' }: React.PropsWithChildren<DrawerProps>) => {
  const positions = {
    left: 'left-0 top-0 h-full', right: 'right-0 top-0 h-full',
    top: 'left-0 top-0 w-full', bottom: 'left-0 bottom-0 w-full',
  };
  return <Dialog open={isOpen} onClose={() => onClose?.()} aria-label={label} className="launchpad-drawer-root">
    <DialogBackdrop className="launchpad-drawer-backdrop" />
    <DialogPanel className={`launchpad-drawer-panel ${positions[direction]} ${className}`}>
      {children}
    </DialogPanel>
  </Dialog>;
};
export default Drawer;
