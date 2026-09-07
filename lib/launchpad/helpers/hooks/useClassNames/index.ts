import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';

const useClassNames = (classNames: Parameters<typeof classnames>) => {
  return classnames(...classNames);
};

export default useClassNames;
