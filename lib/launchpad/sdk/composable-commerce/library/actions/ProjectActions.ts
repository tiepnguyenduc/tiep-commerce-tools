import { ProjectSettings } from '@/lib/launchpad/shared/ProjectSettings';
import { Event, SDK, ServerOptions } from '@commercetools/frontend-sdk';
import { GetProjectSettingsAction } from '@/lib/launchpad/sdk/composable-commerce/types/actions/ProjectActions';
import { ComposableCommerceEvents } from '@/lib/launchpad/sdk/composable-commerce/types/events/ComposableCommerceEvents';

export type ProjectActions = {
  getSettings: GetProjectSettingsAction;
};

export const getProjectActions = (sdk: SDK<ComposableCommerceEvents>): ProjectActions => {
  return {
    getSettings: async (
      options: {
        parallel?: boolean;
        customHeaderValue?: string;
        serverOptions?: ServerOptions;
      } = {},
    ) => {
      const response = await sdk.callAction<ProjectSettings>({
        actionName: 'project/getProjectSettings',
        parallel: options.parallel,
        customHeaderValue: options.customHeaderValue,
        serverOptions: options.serverOptions,
      });

      if (!response.isError) {
        sdk.trigger(
          new Event({
            eventName: 'projectSettingsFetched',
            data: {
              projectSettings: response.data,
            },
          }),
        );
      }
      return response;
    },
  };
};
