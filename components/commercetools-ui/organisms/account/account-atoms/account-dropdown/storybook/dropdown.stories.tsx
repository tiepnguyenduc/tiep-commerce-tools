import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import AccountDropdownContent from '@/components/commercetools-ui/organisms/account/account-atoms/account-dropdown/storybook/index';
import AccountDropdown from '@/components/commercetools-ui/organisms/account/account-atoms/account-dropdown/index';

export default {
  title: 'Organisms/Account Popover',
  component: AccountDropdown,
} as Meta<typeof AccountDropdown>;

const Template: StoryFn<typeof AccountDropdown> = () => <AccountDropdownContent />;
export const Default = Template.bind({});
