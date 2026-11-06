import type { JSX, ReactElement } from 'react';
import { useFormik, type FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import MultilineTextField from '@commercetools-uikit/multiline-text-field';
import SelectField from '@commercetools-uikit/select-field';
import Spacings from '@commercetools-uikit/spacings';
import TextField from '@commercetools-uikit/text-field';
import { RATINGS } from '../../constants';
import type { TFormValues } from '../../types';
import messages from './messages';
import validate from './validate';

type Formik = ReturnType<typeof useFormik<TFormValues>>;
type FormProps = {
  formElements: ReactElement;
  values: Formik['values'];
  isDirty: Formik['dirty'];
  isSubmitting: Formik['isSubmitting'];
  submitForm: Formik['handleSubmit'];
  handleReset: Formik['handleReset'];
};
type TReviewDetailsFormProps = {
  onSubmit: (
    values: TFormValues,
    formikHelpers: FormikHelpers<TFormValues>
  ) => void | Promise<unknown>;
  initialValues: TFormValues;
  isReadOnly: boolean;
  children: (formProps: FormProps) => JSX.Element;
};

const ReviewDetailsForm = (props: TReviewDetailsFormProps) => {
  const intl = useIntl();
  const formik = useFormik<TFormValues>({
    initialValues: props.initialValues,
    onSubmit: props.onSubmit,
    validate,
    enableReinitialize: true,
  });

  const ratingOptions = [...RATINGS].reverse().map((rating) => ({
    value: String(rating),
    label: intl.formatMessage(messages.ratingOption, { rating }),
  }));

  const formElements = (
    <Spacings.Stack scale="l">
      <SelectField
        name="rating"
        title={intl.formatMessage(messages.ratingLabel)}
        value={formik.values.rating}
        errors={SelectField.toFieldErrors<TFormValues>(formik.errors).rating}
        touched={formik.touched.rating}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        options={ratingOptions}
        isReadOnly={props.isReadOnly}
        isRequired
        horizontalConstraint={6}
        renderError={(errorKey) =>
          errorKey === 'missing'
            ? intl.formatMessage(messages.ratingMissing)
            : null
        }
      />
      <TextField
        name="title"
        title={intl.formatMessage(messages.titleLabel)}
        value={formik.values.title}
        touched={formik.touched.title}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        isReadOnly={props.isReadOnly}
        horizontalConstraint={13}
      />
      <MultilineTextField
        name="text"
        title={intl.formatMessage(messages.textLabel)}
        value={formik.values.text}
        touched={formik.touched.text}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        isReadOnly={props.isReadOnly}
        defaultExpandMultilineText
        horizontalConstraint={13}
      />
      <TextField
        name="authorName"
        title={intl.formatMessage(messages.authorNameLabel)}
        value={formik.values.authorName}
        touched={formik.touched.authorName}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        isReadOnly={props.isReadOnly}
        horizontalConstraint={13}
      />
    </Spacings.Stack>
  );

  return props.children({
    formElements,
    values: formik.values,
    isDirty: formik.dirty,
    isSubmitting: formik.isSubmitting,
    submitForm: formik.handleSubmit,
    handleReset: formik.handleReset,
  });
};
ReviewDetailsForm.displayName = 'ReviewDetailsForm';

export default ReviewDetailsForm;
