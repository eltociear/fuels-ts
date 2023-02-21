import type { AccountAddress } from '@fuel-ts/interfaces';
import type { BN } from '@fuel-ts/math';

import { GqlCoinStatus as CoinStatus } from './__generated__/operations';

/**
 * A Fuel coin
 */
export type Coin = {
  id: string;
  assetId: string;
  amount: BN;
  owner: AccountAddress;
  status: CoinStatus;
  maturity: number;
  blockCreated: BN;
};

export { CoinStatus };
