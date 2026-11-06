import type { FormikErrors } from 'formik';
import omitEmpty from 'omit-empty-es';
import { RATINGS } from '../../constants';
import type { TFormValues } from '../../types';

type TErrors = {
  rating: { missing?: boolean };
};

const validate = (formikValues: TFormValues): FormikErrors<TFormValues> => {
  const errors: TErrors = {
    rating: {},
  };

  if (!RATINGS.some((rating) => String(rating) === formikValues.rating)) {
    errors.rating.missing = true;
  }
  return omitEmpty(errors);
};

export default validate;
