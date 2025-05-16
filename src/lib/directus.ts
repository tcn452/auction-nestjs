import { createDirectus, rest } from '@directus/sdk';
import { CustomDirectusTypes } from './types';

export const directus = createDirectus<CustomDirectusTypes>(
  process.env.NEXT_PUBLIC_DIRECTUS_URL as string,
).with(rest());

export const getAssetUrl = (assetID: string) => {
  return `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${assetID}`;
};
