"use client";
import React from 'react';
import RegisterForm, { RegisterFormProps } from '@/components/commercetools-ui/organisms/authentication/register/register-form';
import AlterForm from '@/components/commercetools-ui/organisms/account/account-atoms/alter-form';

const Register: React.FC<RegisterFormProps> = ({ termsOfUseLink, register, loggedIn }) => {
  return (
    <>
      <div className="m-auto grid max-w-screen-sm px-16">
        <RegisterForm termsOfUseLink={termsOfUseLink} register={register} loggedIn={loggedIn} />
      </div>
      <AlterForm page="login" />
    </>
  );
};

export default Register;
