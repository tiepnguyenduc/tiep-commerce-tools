import type { ReactNode } from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import Spacings from '@commercetools-uikit/spacings';
import Reviews from './components/reviews';

type ApplicationRoutesProps = {
  children?: ReactNode;
};
const ApplicationRoutes = (_props: ApplicationRoutesProps) => {
  const match = useRouteMatch();

  /**
   * The Custom Application implicitly checks for the "View" permission,
   * otherwise it won't render. Editing, moderating and deleting reviews
   * additionally demand the "Manage" permission inside the components.
   */
  return (
    <Spacings.Inset scale="l">
      <Switch>
        <Route path={match.path}>
          <Reviews />
        </Route>
      </Switch>
    </Spacings.Inset>
  );
};
ApplicationRoutes.displayName = 'ApplicationRoutes';

export default ApplicationRoutes;
