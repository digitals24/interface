import { getAbiFetchersForChainId, Parser } from 'no-yolo-signatures'
import { useMemo } from 'react'
import { config } from 'uniswap/src/config'
import { UniverseChainId, WalletChainId } from 'uniswap/src/types/chains'

export function useNoYoloParser(chainId: WalletChainId): Parser {
  const parser = useMemo(() => {
    // TODO: [MOB-1] use better ABI Fetchers and/or our own Infura nodes for all chains.
    const abiFetchers = getAbiFetchersForChainId(chainId, {
      rpcUrls: {
        [UniverseChainId.Mainnet]: `https://mainnet.infura.io/v3/${config.infuraProjectId}`,
      },
    })
    return new Parser({ abiFetchers })
  }, [chainId])

  return parser
}
