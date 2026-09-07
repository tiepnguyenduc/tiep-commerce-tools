export const revalidateOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
};

export * from '@/lib/launchpad/frontastic/lib/utils/api-hub';
export * from '@/lib/launchpad/frontastic/lib/types';
export * from '@/lib/launchpad/frontastic/lib/notifier';
export * from '@/lib/launchpad/frontastic/provider/index';
export * from '@/lib/launchpad/frontastic/hooks/index';
