import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import Drawer from '@/components/commercetools-ui/atoms/drawer/index';
import DrawerContent from '@/components/commercetools-ui/atoms/drawer/storybook/drawer-content';

export default {
  title: 'Organisms/Drawer',
  component: Drawer,
} as Meta<typeof Drawer>;

const Template: StoryFn<typeof Drawer> = () => <DrawerContent />;
export const Default = Template.bind({});
