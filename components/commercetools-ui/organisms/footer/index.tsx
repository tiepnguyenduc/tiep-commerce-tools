"use client";
import React from 'react';
import Accordion from '@/components/commercetools-ui/atoms/accordion/index';
import { ImageProps } from '@/components/commercetools-ui/atoms/image/index';
import { Reference } from '@/lib/launchpad/types/reference';
import Column, { FooterLink } from '@/components/commercetools-ui/organisms/footer/atoms/column';
import FooterBottom from '@/components/commercetools-ui/organisms/footer/footer-bottom';

export interface FooterColumn {
  header?: string;
  links?: FooterLink[];
}
export interface Props {
  columns: FooterColumn[];
  className?: string;
  as?: 'footer' | 'nav';
  showBottom?: boolean;
  logo?: ImageProps;
  socialMedia?: SocialMedia[];
}

export interface SocialMedia {
  title: string;
  logo: ImageProps;
  reference: Reference;
}

const Footer: React.FC<Props> = ({ columns, logo, socialMedia, className = '', as: Element = 'footer', showBottom = true }) => {
  return (
    <Element aria-label="Footer navigation" className={`w-full bg-primary ${className}`}>
      <div data-footer-desktop className="hidden w-full justify-between px-24 py-58 md:flex lg:px-20 xl:px-48">
        <div className="grid w-full grid-cols-4">
          {columns?.map((column, index) => (
            <div key={index}>
              <Column
                header={column.header}
                links={column.links ?? []}
                className="flex flex-col items-center lg:items-start"
              />
            </div>
          ))}
        </div>
      </div>

      <ul data-footer-mobile className="flex flex-col md:hidden">
        {columns?.map((column, index) => (
          <li key={index} className="border-b border-neutral-300">
            <Accordion
              variant="arrow"
              closedSectionTitle={column.header ?? ''}
              openSectionTitle={column.header}
              buttonClassName="h-48 text-14 font-medium text-white px-12 text-neutral-150"
              iconClassName="text-neutral"
            >
              <div className="mb-16 ml-20 flex flex-row text-14 md:ml-24" key={index}>
                <Column links={column.links ?? []} className="px-0" />
              </div>
            </Accordion>
          </li>
        ))}
      </ul>
      {showBottom && <>
        <div className="w-full sm:border-t-accent" />
        <FooterBottom socialMedia={socialMedia} logo={logo} />
      </>}
    </Element>
  );
};

export default Footer;
