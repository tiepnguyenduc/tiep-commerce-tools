"use client";
import React from 'react';
import LoggedIn from '@/components/commercetools-ui/organisms/account/account-atoms/account-dropdown/loggedin';
import LoggedOut from '@/components/commercetools-ui/organisms/account/account-atoms/account-dropdown/loggedout';

interface Props {
  loggedIn: boolean;
}

const AccountDropdown: React.FC<Props> = ({ loggedIn }) => {
  return loggedIn ? <LoggedIn /> : <LoggedOut />;
};

export default AccountDropdown;
