import { useIntl } from 'react-intl';
import {
  useShowApiErrorNotification,
  useShowNotification,
  type TApiErrorNotificationOptions,
} from '@commercetools-frontend/actions-global';
import { DOMAINS } from '@commercetools-frontend/constants';
import { useIsAuthorized } from '@commercetools-frontend/permissions';
import Constraints from '@commercetools-uikit/constraints';
import { ContentNotification } from '@commercetools-uikit/notifications';
import PrimaryButton from '@commercetools-uikit/primary-button';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import { MODERATION_STATE_KEYS, PERMISSIONS } from '../../constants';
import { useModerationStates } from '../../hooks/use-moderation-states';
import messages from './messages';

/** Offers to create the moderation States when the project has none yet. */
const ModerationSetup = () => {
  const intl = useIntl();
  const { isReady, loading, error, isSettingUp, setUp } = useModerationStates();
  const canManage = useIsAuthorized({
    demandedPermissions: [PERMISSIONS.Manage],
  });
  const showNotification = useShowNotification();
  const showApiErrorNotification = useShowApiErrorNotification();

  // Failing to read States must not hide the reviews; the details page
  // disables moderation on its own when the States are unavailable.
  if (isReady || loading || error) return null;

  const handleSetUp = async () => {
    try {
      await setUp();
      showNotification({
        kind: 'success',
        domain: DOMAINS.SIDE,
        text: intl.formatMessage(messages.setupDone),
      });
    } catch (errors) {
      showApiErrorNotification({
        errors: (Array.isArray(errors)
          ? errors
          : [errors]) as TApiErrorNotificationOptions['errors'],
      });
    }
  };

  return (
    <Constraints.Horizontal max={16}>
      <ContentNotification type="warning">
        <Spacings.Stack scale="s">
          <Text.Body>
            {intl.formatMessage(messages.setupTitle, MODERATION_STATE_KEYS)}
          </Text.Body>
          {canManage ? (
            <Spacings.Inline>
              <PrimaryButton
                label={intl.formatMessage(messages.setupButton)}
                onClick={handleSetUp}
                isDisabled={isSettingUp}
              />
            </Spacings.Inline>
          ) : (
            <Text.Detail intlMessage={messages.setupHint} />
          )}
        </Spacings.Stack>
      </ContentNotification>
    </Constraints.Horizontal>
  );
};
ModerationSetup.displayName = 'ModerationSetup';

export default ModerationSetup;
