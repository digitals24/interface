import { createSelector, Selector } from '@reduxjs/toolkit'
import { unique } from 'utilities/src/primitives/array'
import { CurrencyIdToVisibility, NFTKeyToVisibility } from 'wallet/src/features/favorites/slice'
import { RootState } from 'wallet/src/state'

export const selectFavoriteTokens = (state: RootState): string[] => unique(state.favorites.tokens)

export const selectHasFavoriteTokens = createSelector(selectFavoriteTokens, (tokens) => Boolean(tokens?.length > 0))

export const makeSelectHasTokenFavorited = (): Selector<RootState, boolean, [string]> =>
  createSelector(
    selectFavoriteTokens,
    (_: RootState, currencyId: string) => currencyId,
    (tokens, currencyId) => tokens?.includes(currencyId.toLowerCase()),
  )

const selectWatchedAddresses = (state: RootState): string[] => state.favorites.watchedAddresses
export const selectWatchedAddressSet = createSelector(selectWatchedAddresses, (watched) => new Set(watched))

export const selectHasWatchedWallets = createSelector(selectWatchedAddresses, (watched) => Boolean(watched?.length > 0))

export const selectNftsVisibility = (state: RootState): NFTKeyToVisibility => state.favorites.nftsVisibility

export const selectTokensVisibility = (state: RootState): CurrencyIdToVisibility => state.favorites.tokensVisibility
