import { PropsWithChildren, useMemo, useRef, useState } from 'react'
/* eslint-disable-next-line no-restricted-imports */
import { type View } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import {
  AnimatePresence,
  Flex,
  FlexProps,
  ImpactFeedbackStyle,
  Portal,
  TouchableArea,
  isWeb,
  styled,
  useDeviceInsets,
  useIsDarkMode,
} from 'ui/src'
import { useDeviceDimensions } from 'ui/src/hooks/useDeviceDimensions'
import { spacing, zIndices } from 'ui/src/theme'
import { BaseCard } from 'uniswap/src/components/BaseCard/BaseCard'
import { Scrollbar } from 'uniswap/src/components/misc/Scrollbar'
import { MenuItemProp } from 'uniswap/src/components/modals/ActionSheetModal'
import { isAndroid } from 'utilities/src/platform'

const DEFAULT_MIN_WIDTH = 225

type LayoutMeasurements = {
  x: number
  y: number
  width: number
  height: number
}

type DropdownState = {
  isOpen: boolean
  toggleMeasurements: LayoutMeasurements | null
}

type ActionSheetDropdownProps = PropsWithChildren<{
  options: MenuItemProp[]
  alignment?: 'left' | 'right'
  backdropOpacity?: number
  testID?: string
  onDismiss?: () => void
}>

export function ActionSheetDropdown({
  children,
  backdropOpacity,
  testID,
  onDismiss,
  ...contentProps
}: ActionSheetDropdownProps): JSX.Element {
  const insets = useDeviceInsets()
  const toggleRef = useRef<View>(null)
  const [{ isOpen, toggleMeasurements }, setState] = useState<DropdownState>({
    isOpen: false,
    toggleMeasurements: null,
  })

  const openDropdown = (): void => {
    onDismiss?.()

    const containerNode = toggleRef.current

    if (containerNode) {
      containerNode.measureInWindow((x, y, width, height) => {
        setState({
          isOpen: true,
          toggleMeasurements: {
            x,
            y: y + (isAndroid ? insets.top : 0),
            width,
            height,
          },
        })
      })
    }
  }

  const closeDropdown = (): void => {
    setState({ isOpen: false, toggleMeasurements: null })
  }

  return (
    <>
      <TouchableArea hapticFeedback hapticStyle={ImpactFeedbackStyle.Light} py="$spacing8" onPress={openDropdown}>
        {/* collapsable property prevents removing view on Android. Without this property we were
        getting undefined in measureInWindow callback. (https://reactnative.dev/docs/view.html#collapsable-android) */}
        <Flex ref={toggleRef} collapsable={false} testID={testID || 'dropdown-toggle'}>
          {children}
        </Flex>
      </TouchableArea>

      {/* This is the minimum zIndex to ensure that the dropdown is above the modal in the extension. */}
      <Portal zIndex={zIndices.overlay}>
        <AnimatePresence custom={{ isOpen }}>
          {isOpen && toggleMeasurements && (
            <>
              <Backdrop handleClose={closeDropdown} opacity={backdropOpacity} />
              <DropdownContent {...contentProps} handleClose={closeDropdown} toggleMeasurements={toggleMeasurements} />
            </>
          )}
        </AnimatePresence>
      </Portal>
    </>
  )
}

type DropdownContentProps = FlexProps & {
  options: MenuItemProp[]
  alignment?: 'left' | 'right'
  toggleMeasurements: LayoutMeasurements
  handleClose?: () => void
}

/**
 * AnimatePresence `custom` prop will update variants *as* the exit animation runs,
 * which otherwise is impossible. We want to make sure people can touch behind the dropdown
 * as its animating closed. With slow animations it can be especially annoying.
 */
const TouchableWhenOpen = styled(Flex, {
  variants: {
    isOpen: {
      true: {
        pointerEvents: 'auto',
      },
      false: {
        pointerEvents: 'none',
      },
    },
  },
})

function DropdownContent({
  options,
  alignment = 'left',
  toggleMeasurements,
  handleClose,
  ...rest
}: DropdownContentProps): JSX.Element {
  const insets = useDeviceInsets()
  const { fullWidth, fullHeight } = useDeviceDimensions()

  const scrollOffset = useSharedValue(0)
  const [contentHeight, setContentHight] = useState(0)

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollOffset.value = event.contentOffset.y
  })

  const containerProps = useMemo<FlexProps>(() => {
    if (alignment === 'left') {
      return {
        left: toggleMeasurements.x,
        maxWidth: fullWidth - toggleMeasurements.x - spacing.spacing12,
      }
    }
    return {
      right: fullWidth - (toggleMeasurements.x + toggleMeasurements.width),
      maxWidth: toggleMeasurements.x + toggleMeasurements.width - spacing.spacing12,
    }
  }, [alignment, fullWidth, toggleMeasurements])

  const bottomOffset = insets.bottom + spacing.spacing12
  const maxHeight = Math.max(fullHeight - toggleMeasurements.y - toggleMeasurements.height - bottomOffset, 0)
  const overflowsContainer = contentHeight > maxHeight

  return (
    <TouchableWhenOpen
      animation={[
        'quicker',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
      enterStyle={{
        opacity: 0,
        y: -5,
      }}
      exitStyle={{
        opacity: 0,
        y: 5,
      }}
      maxHeight={maxHeight}
      minWidth={DEFAULT_MIN_WIDTH}
      position="absolute"
      testID="dropdown-content"
      top={toggleMeasurements.y + toggleMeasurements.height}
      {...containerProps}
    >
      <BaseCard.Shadow backgroundColor="$surface2" overflow="hidden" p="$none" {...rest}>
        <Flex row>
          <Animated.ScrollView
            contentContainerStyle={{
              padding: spacing.spacing8,
            }}
            scrollEnabled={overflowsContainer}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={isWeb}
            onScroll={scrollHandler}
          >
            <Flex
              onLayout={({
                nativeEvent: {
                  layout: { height },
                },
              }) => {
                setContentHight(height)
              }}
            >
              {options.map(({ key, onPress, render }: MenuItemProp) => (
                <TouchableArea
                  key={key}
                  hapticFeedback
                  onPress={() => {
                    onPress()
                    handleClose?.()
                  }}
                >
                  <Flex testID={key}>{render()}</Flex>
                </TouchableArea>
              ))}
            </Flex>
          </Animated.ScrollView>

          {/* Custom scrollbar to ensure it is visible on iOS and Android even if not scrolling
        and to be able to customize its appearance */}
          {overflowsContainer && !isWeb && (
            <Scrollbar
              contentHeight={contentHeight}
              mr="$spacing4"
              py="$spacing12"
              scrollOffset={scrollOffset}
              visibleHeight={maxHeight}
            />
          )}
        </Flex>
      </BaseCard.Shadow>
    </TouchableWhenOpen>
  )
}

type BackdropProps = {
  opacity?: number
  handleClose?: () => void
}

function Backdrop({ handleClose, opacity: opacityProp }: BackdropProps): JSX.Element {
  const isDarkMode = useIsDarkMode()

  const opacity = opacityProp ?? (isDarkMode ? 0.4 : 0.2)

  return (
    <TouchableWhenOpen
      animation="100ms"
      backgroundColor="$sporeBlack"
      enterStyle={{
        opacity: 0,
      }}
      exitStyle={{
        opacity: 0,
      }}
      flex={1}
      inset={0}
      opacity={opacity}
      position="absolute"
      testID="dropdown-backdrop"
      onPress={handleClose}
    />
  )
}
