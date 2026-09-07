"use client";
import React from 'react';
import {
  InstantSearch as ReactInstantSearch,
  InstantSearchProps as ReactInstantSearchProps,
} from 'react-instantsearch';
import { searchClient } from '@/lib/launchpad/algolia/searchClient';
import InsightsMiddleware from '@/lib/launchpad/components/HOC/InstantSearch/middlewares/InsightsMiddleware';
//eslint-disable-next-line
import GoogleAnalyticsMiddleware from '@/lib/launchpad/components/HOC/InstantSearch/middlewares/GoogleAnalyticsMiddleware';

const InstantSearch: React.FC<Partial<ReactInstantSearchProps>> = ({ indexName, children, ...props }) => (
  <ReactInstantSearch
    searchClient={searchClient}
    indexName={indexName as string}
    future={{ preserveSharedStateOnUnmount: true }}
    {...props}
  >
    {/* <GoogleAnalyticsMiddleware /> */}
    <InsightsMiddleware />
    {children}
  </ReactInstantSearch>
);

export default InstantSearch;
