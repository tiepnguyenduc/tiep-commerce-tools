import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import Dropdown, { DropdownProps } from '@/components/commercetools-ui/atoms/dropdown/index';
import DropdownContent from '@/components/commercetools-ui/atoms/dropdown/storybook/dropdown-content';

export default {
  title: 'Atoms/Dropdown',
  component: Dropdown,
} as Meta;

const Template: StoryFn<DropdownProps> = () => <DropdownContent />;

export const Primary = Template.bind({});
