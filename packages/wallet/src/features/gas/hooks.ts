import { BigNumber, providers } from 'ethers'
import { useMemo } from 'react'
import { PollingInterval } from 'uniswap/src/constants/misc'
import { WalletChainId } from 'uniswap/src/types/chains'
import { logger } from 'utilities/src/logger/logger'
import { TRANSACTION_CANCELLATION_GAS_FACTOR } from 'wallet/src/constants/transactions'
import { FeeDetails, getAdjustedGasFeeDetails } from 'wallet/src/features/gas/adjustGasFee'
import { useGasFeeQuery } from 'wallet/src/features/gas/api'
import { FeeType, GasFeeResult, GasSpeed } from 'wallet/src/features/gas/types'
import { NativeCurrency } from 'wallet/src/features/tokens/NativeCurrency'
import { useUSDCValue } from 'wallet/src/features/transactions/swap/trade/hooks/useUSDCPrice'
import { isUniswapX } from 'wallet/src/features/transactions/swap/trade/utils'
import { TransactionDetails } from 'wallet/src/features/transactions/types'
import { ValueType, getCurrencyAmount } from 'wallet/src/utils/getCurrencyAmount'

type CancelationGasFeeDetails = {
  cancelRequest: providers.TransactionRequest
  cancelationGasFee: string
}

export function useTransactionGasFee(
  tx: Maybe<providers.TransactionRequest>,
  speed: GasSpeed = GasSpeed.Urgent,
  skip?: boolean,
  pollingInterval?: PollingInterval,
): GasFeeResult {
  const { data, error, loading } = useGasFeeQuery(tx, skip, pollingInterval)

  return useMemo(() => {
    if (!data) {
      return { error, loading }
    }

    const params =
      data.type === FeeType.Eip1559
        ? {
            maxPriorityFeePerGas: data.maxPriorityFeePerGas[speed],
            maxFeePerGas: data.maxFeePerGas[speed],
            gasLimit: data.gasLimit,
          }
        : {
            gasPrice: data.gasPrice[speed],
            gasLimit: data.gasLimit,
          }
    return {
      value: data.gasFee[speed],
      loading,
      error,
      params,
    }
  }, [data, error, loading, speed])
}

export function useUSDValue(chainId?: WalletChainId, ethValueInWei?: string): string | undefined {
  const currencyAmount = getCurrencyAmount({
    value: ethValueInWei,
    valueType: ValueType.Raw,
    currency: chainId ? NativeCurrency.onChain(chainId) : undefined,
  })

  return useUSDCValue(currencyAmount)?.toExact()
}

/**
 * Construct cancelation transaction with increased gas (based on current network conditions),
 * then use it to compute new gas info.
 */
export function useCancelationGasFeeInfo(transaction: TransactionDetails): CancelationGasFeeDetails | undefined {
  const cancelationRequest = useMemo(() => {
    return {
      chainId: transaction.chainId,
      from: transaction.from,
      to: transaction.from,
      value: '0x0',
    }
  }, [transaction])

  const baseTxGasFee = useTransactionGasFee(cancelationRequest, GasSpeed.Urgent)
  return useMemo(() => {
    if (!baseTxGasFee.params) {
      return
    }

    // TODO(WEB-4295): handle uniswapx cancels
    if (isUniswapX(transaction)) {
      return
    }

    let adjustedFeeDetails: FeeDetails | undefined
    try {
      adjustedFeeDetails = getAdjustedGasFeeDetails(
        transaction.options.request,
        baseTxGasFee.params,
        TRANSACTION_CANCELLATION_GAS_FACTOR,
      )
    } catch (error) {
      logger.error(error, {
        tags: { file: 'features/gas/hooks.ts', function: 'getAdjustedGasFeeDetails' },
        extra: { request: transaction.options.request, currentGasFeeParams: baseTxGasFee.params },
      })
      return
    }

    const cancelRequest = {
      ...cancelationRequest,
      ...adjustedFeeDetails.params,
      gasLimit: baseTxGasFee.params.gasLimit,
    }

    return {
      cancelRequest,
      cancelationGasFee: getCancelationGasFee(adjustedFeeDetails, baseTxGasFee.params.gasLimit),
    }
  }, [baseTxGasFee.params, cancelationRequest, transaction])
}

function getCancelationGasFee(adjustedFeeDetails: FeeDetails, gasLimit: string): string {
  // doing object destructuring here loses ts checks based on FeeDetails.type >:(
  if (adjustedFeeDetails.type === FeeType.Legacy) {
    return BigNumber.from(gasLimit).mul(adjustedFeeDetails.params.gasPrice).toString()
  }

  return BigNumber.from(adjustedFeeDetails.params.maxFeePerGas).mul(gasLimit).toString()
}
