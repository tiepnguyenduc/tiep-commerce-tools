import { Variant } from '@/lib/launchpad/shared/product/Variant';
import { Category } from '@/lib/launchpad/shared/product/Category';

export interface Product {
  productId?: string;
  productKey?: string;
  productRef?: string;
  productTypeId?: string;
  changed?: Date;
  version?: string;
  name?: string;
  slug?: string;
  description?: string;
  categories?: Category[];
  variants: Variant[];
  _url?: string;
  metaKeywords?: string;
  metaDescription?: string;
  metaTitle?: string;
}
