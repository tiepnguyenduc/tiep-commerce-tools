import { Category } from '@/lib/launchpad/shared/product/index';
import { getLocalizationInfo } from '@/lib/launchpad/project.config';
import { Category as EntityCategory } from '@/lib/launchpad/types/entity/category';

export const mapCategotry = (category: Category, { locale = 'en' }: { locale?: string } = {}): EntityCategory => {
  return {
    ...category,
    _urls: Object.fromEntries(
      Object.entries(category._url ?? {}).flatMap(([key, value]) => [
        [key.split('-')[0], value],
        [key.toLowerCase(), value],
      ]),
    ),
    _url: (category._url ?? {})[getLocalizationInfo(locale).locale],
    descendants: (category.descendants ?? []).map((subCategory) => mapCategotry(subCategory, { locale })),
  };
};
