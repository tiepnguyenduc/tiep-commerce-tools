"use client";
import React from 'react';
import ContactUs from '@/components/commercetools-ui/organisms/account/sections/customer-support/contact-us';
import FAQuestions from '@/components/commercetools-ui/organisms/account/sections/customer-support/faq';
import { FAQ } from '@/components/commercetools-ui/organisms/account/index';

interface Props {
  phoneNumber: string;
  workingHoursWeekdays: string;
  workingHoursWeekends: string;
  email: string;
  addressLine: string;
  cityAndPostalCode: string;
  country: string;
  faqs: FAQ[];
}

const CustomerSupport: React.FC<Props> = ({
  phoneNumber,
  workingHoursWeekdays,
  workingHoursWeekends,
  email,
  addressLine,
  cityAndPostalCode,
  country,
  faqs,
}) => {
  return (
    <div>
      <ContactUs
        phoneNumber={phoneNumber}
        workingHoursWeekdays={workingHoursWeekdays}
        workingHoursWeekends={workingHoursWeekends}
        email={email}
        addressLine={addressLine}
        cityAndPostalCode={cityAndPostalCode}
        country={country}
      />

      <FAQuestions faqs={faqs} />
    </div>
  );
};

export default CustomerSupport;
