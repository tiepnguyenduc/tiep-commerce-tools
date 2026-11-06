import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import {
  useShowApiErrorNotification,
  useShowNotification,
  type TApiErrorNotificationOptions,
} from '@commercetools-frontend/actions-global';
import {
  ConfirmationDialog,
  FormModalPage,
  PageNotFound,
} from '@commercetools-frontend/application-components';
import { ApplicationPageTitle } from '@commercetools-frontend/application-shell';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { DOMAINS, NO_VALUE_FALLBACK } from '@commercetools-frontend/constants';
import { formatLocalizedString } from '@commercetools-frontend/l10n';
import { useIsAuthorized } from '@commercetools-frontend/permissions';
import {
  BinLinearIcon,
  EyeCrossedIcon,
  EyeIcon,
} from '@commercetools-uikit/icons';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { ContentNotification } from '@commercetools-uikit/notifications';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import { PERMISSIONS, type TModerationDecision } from '../../constants';
import { getTargetProductName } from '../../helpers';
import { useModerationStates } from '../../hooks/use-moderation-states';
import {
  useReviewDeleter,
  useReviewDetailsFetcher,
  useReviewUpdater,
} from '../../hooks/use-reviews-connector';
import type { TFormValues } from '../../types';
import ReviewStatus, { getReviewStatus } from '../review-status';
import { docToFormValues } from './conversions';
import messages from './messages';
import ReviewDetailsForm from './review-details-form';

type TReviewDetailsProps = {
  onClose: () => void;
};

const toErrorList = (errors: unknown) =>
  (Array.isArray(errors)
    ? errors
    : [errors]) as TApiErrorNotificationOptions['errors'];

const ReviewDetails = (props: TReviewDetailsProps) => {
  const intl = useIntl();
  const params = useParams<{ id: string }>();
  const { loading, error, review } = useReviewDetailsFetcher(params.id);
  const { dataLocale, projectLanguages } = useApplicationContext((context) => ({
    dataLocale: context.dataLocale ?? '',
    projectLanguages: context.project?.languages ?? [],
  }));
  const canManage = useIsAuthorized({
    demandedPermissions: [PERMISSIONS.Manage],
  });
  const moderationStates = useModerationStates();
  const reviewUpdater = useReviewUpdater();
  const reviewDeleter = useReviewDeleter();
  const showNotification = useShowNotification();
  const showApiErrorNotification = useShowApiErrorNotification();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const notifySuccess = (text: string) =>
    showNotification({ kind: 'success', domain: DOMAINS.SIDE, text });

  const handleSubmit = async (values: TFormValues) => {
    if (!review) return;
    try {
      await reviewUpdater.save(review, values);
      notifySuccess(intl.formatMessage(messages.saved));
    } catch (errors) {
      showApiErrorNotification({ errors: toErrorList(errors) });
    }
  };

  const handleModerate = async (decision: TModerationDecision) => {
    if (!review) return;
    try {
      await reviewUpdater.moderate(review, decision);
      notifySuccess(intl.formatMessage(messages[decision]));
    } catch (errors) {
      showApiErrorNotification({ errors: toErrorList(errors) });
    }
  };

  const handleDelete = async () => {
    if (!review) return;
    try {
      await reviewDeleter.execute(review);
      setIsDeleteDialogOpen(false);
      notifySuccess(intl.formatMessage(messages.deleted));
      props.onClose();
    } catch (errors) {
      setIsDeleteDialogOpen(false);
      showApiErrorNotification({ errors: toErrorList(errors) });
    }
  };

  const productName = review
    ? formatLocalizedString(
        { name: getTargetProductName(review.target) ?? undefined },
        {
          key: 'name',
          locale: dataLocale,
          fallbackOrder: projectLanguages,
          fallback: review.target?.id ?? NO_VALUE_FALLBACK,
        }
      )
    : NO_VALUE_FALLBACK;
  const status = review ? getReviewStatus(review) : null;
  const isBusy =
    reviewUpdater.loading ||
    reviewDeleter.loading ||
    moderationStates.isSettingUp;

  return (
    <ReviewDetailsForm
      initialValues={docToFormValues(review)}
      onSubmit={handleSubmit}
      isReadOnly={!canManage}
    >
      {(formProps) => {
        const title = review?.title || intl.formatMessage(messages.untitled);
        const canModerate =
          canManage &&
          moderationStates.isReady &&
          !formProps.isDirty &&
          !isBusy;
        return (
          <FormModalPage
            title={title}
            subtitle={
              review
                ? intl.formatMessage(messages.subtitle, {
                    product: productName,
                    createdAt: intl.formatDate(review.createdAt, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })
                : undefined
            }
            topBarPreviousPathLabel={messages.backToList}
            isOpen
            onClose={props.onClose}
            isPrimaryButtonDisabled={
              formProps.isSubmitting || !formProps.isDirty || !canManage
            }
            isSecondaryButtonDisabled={!formProps.isDirty}
            onSecondaryButtonClick={formProps.handleReset}
            onPrimaryButtonClick={() => formProps.submitForm()}
            labelPrimaryButton={FormModalPage.Intl.save}
            labelSecondaryButton={FormModalPage.Intl.revert}
          >
            {loading && (
              <Spacings.Stack alignItems="center">
                <LoadingSpinner />
              </Spacings.Stack>
            )}
            {error && (
              <ContentNotification type="error">
                <Text.Body intlMessage={messages.loadError} />
              </ContentNotification>
            )}
            {review && (
              <Spacings.Stack scale="xl">
                <Spacings.Stack scale="s">
                  <Spacings.Inline scale="m" alignItems="center">
                    <Text.Subheadline
                      as="h4"
                      intlMessage={messages.moderationTitle}
                    />
                    <ReviewStatus review={review} />
                  </Spacings.Inline>
                  <Text.Detail tone="secondary">
                    {moderationStates.isReady || moderationStates.loading
                      ? intl.formatMessage(messages.moderationHint)
                      : intl.formatMessage(messages.moderationUnavailable)}
                  </Text.Detail>
                  <Text.Detail tone="secondary">
                    {review.customerRef
                      ? intl.formatMessage(messages.customer, {
                          id: review.customerRef.id,
                        })
                      : intl.formatMessage(messages.guest)}
                  </Text.Detail>
                  <Spacings.Inline scale="m">
                    <SecondaryButton
                      iconLeft={<EyeIcon />}
                      label={intl.formatMessage(messages.approve)}
                      onClick={() => handleModerate('approved')}
                      isDisabled={!canModerate || status === 'approved'}
                    />
                    <SecondaryButton
                      iconLeft={<EyeCrossedIcon />}
                      label={intl.formatMessage(messages.reject)}
                      onClick={() => handleModerate('rejected')}
                      isDisabled={!canModerate || status === 'hidden'}
                    />
                    <SecondaryButton
                      iconLeft={<BinLinearIcon />}
                      label={intl.formatMessage(messages.delete)}
                      onClick={() => setIsDeleteDialogOpen(true)}
                      isDisabled={!canManage || isBusy}
                    />
                  </Spacings.Inline>
                </Spacings.Stack>
                {formProps.formElements}
                <ApplicationPageTitle additionalParts={[title]} />
              </Spacings.Stack>
            )}
            {review === null && <PageNotFound />}
            <ConfirmationDialog
              title={intl.formatMessage(messages.deleteConfirmTitle)}
              isOpen={isDeleteDialogOpen}
              onClose={() => setIsDeleteDialogOpen(false)}
              onCancel={() => setIsDeleteDialogOpen(false)}
              onConfirm={handleDelete}
              isPrimaryButtonDisabled={reviewDeleter.loading}
              labelPrimary={ConfirmationDialog.Intl.delete}
            >
              <Text.Body intlMessage={messages.deleteConfirmBody} />
            </ConfirmationDialog>
          </FormModalPage>
        );
      }}
    </ReviewDetailsForm>
  );
};
ReviewDetails.displayName = 'ReviewDetails';

export default ReviewDetails;
