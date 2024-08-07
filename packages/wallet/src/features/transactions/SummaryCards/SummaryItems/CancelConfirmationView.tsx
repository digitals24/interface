import { providers } from 'ethers'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator } from 'react-native'
import { Button, Flex, HapticFeedback, Text, useSporeColors } from 'ui/src'
import SlashCircleIcon from 'ui/src/assets/icons/slash-circle.svg'
import { ElementName } from 'uniswap/src/features/telemetry/constants'
import { shortenAddress } from 'uniswap/src/utils/addresses'
import { NumberType } from 'utilities/src/format/types'
import { AddressDisplay } from 'wallet/src/components/accounts/AddressDisplay'
import { AuthTrigger } from 'wallet/src/features/auth/types'
import { useCancelationGasFeeInfo, useUSDValue } from 'wallet/src/features/gas/hooks'
import { useLocalizationContext } from 'wallet/src/features/language/LocalizationContext'
import { TransactionDetails, TransactionStatus } from 'wallet/src/features/transactions/types'
import { useActiveAccount } from 'wallet/src/features/wallet/hooks'

export function CancelConfirmationView({
  authTrigger,
  onBack,
  onCancel,
  transactionDetails,
}: {
  authTrigger?: AuthTrigger
  onBack: () => void
  onCancel: (txRequest: providers.TransactionRequest) => void
  transactionDetails: TransactionDetails
}): JSX.Element {
  const colors = useSporeColors()
  const { t } = useTranslation()
  const { convertFiatAmountFormatted } = useLocalizationContext()
  const accountAddress = useActiveAccount()?.address

  const cancelationGasFeeInfo = useCancelationGasFeeInfo(transactionDetails)
  const gasFeeUSD = useUSDValue(transactionDetails.chainId, cancelationGasFeeInfo?.cancelationGasFee)
  const gasFee = convertFiatAmountFormatted(gasFeeUSD, NumberType.FiatGasPrice)

  const onCancelConfirm = useCallback(() => {
    if (!cancelationGasFeeInfo?.cancelRequest) {
      return
    }

    onCancel(cancelationGasFeeInfo.cancelRequest)
  }, [cancelationGasFeeInfo, onCancel])

  const onPressCancel = useCallback(async () => {
    await HapticFeedback.success()
    if (authTrigger) {
      await authTrigger({ successCallback: onCancelConfirm, failureCallback: () => {} })
    } else {
      onCancelConfirm()
    }
  }, [onCancelConfirm, authTrigger])

  const disableConfirmationButton =
    !cancelationGasFeeInfo?.cancelRequest || transactionDetails.status !== TransactionStatus.Pending

  return (
    <Flex centered grow backgroundColor="$surface1" borderRadius="$rounded20" gap="$spacing12" p="$spacing12">
      <Flex centered backgroundColor="$surface3" borderRadius="$rounded12" p="$spacing12">
        <SlashCircleIcon color={colors.neutral2.get()} strokeWidth="1" />
      </Flex>
      <Flex centered gap="$spacing8">
        <Text variant="buttonLabel2">{t('transaction.action.cancel.title')}</Text>
        <Text color="$neutral2" textAlign="center" variant="body2">
          {t('transaction.action.cancel.description')}
        </Text>
      </Flex>
      <Flex backgroundColor="$surface2" borderRadius="$rounded16" width="100%">
        <Flex grow row justifyContent="space-between" p="$spacing12">
          <Text variant="subheading2">{t('transaction.networkCost.label')}</Text>
          {!gasFeeUSD ? <ActivityIndicator /> : <Text variant="subheading2">{gasFee}</Text>}
        </Flex>
        {accountAddress && (
          <Flex grow row justifyContent="space-between" p="$spacing12">
            <AddressDisplay
              hideAddressInSubtitle
              address={transactionDetails.from}
              horizontalGap="$spacing8"
              variant="subheading2"
            />
            <Text color="$neutral2" variant="subheading2">
              {shortenAddress(transactionDetails.from)}
            </Text>
          </Flex>
        )}
      </Flex>
      <Flex row gap="$spacing8" px="$spacing4" width="100%">
        <Button fill theme="tertiary" width="50%" onPress={onBack}>
          {t('common.button.back')}
        </Button>
        <Button
          fill
          disabled={disableConfirmationButton}
          testID={ElementName.Cancel}
          theme="detrimental"
          width="50%"
          onPress={onPressCancel}
        >
          {t('common.button.confirm')}
        </Button>
      </Flex>
    </Flex>
  )
}
