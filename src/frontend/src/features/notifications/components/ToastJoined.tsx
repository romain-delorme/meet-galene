import { useToast } from '@react-aria/toast'
import { useRef } from 'react'

import { StyledToastContainer, ToastProps } from './Toast'
import { HStack } from '@/styled-system/jsx'
import { Div } from '@/primitives'
import { useTranslation } from 'react-i18next'

export function ToastJoined({ state, ...props }: Readonly<ToastProps>) {
  const { t } = useTranslation('notifications')
  const ref = useRef(null)
  const { toastProps, contentProps, titleProps } = useToast(props, state, ref)
  const participant = props.toast.content.participant

  if (!participant) return null

  return (
    <StyledToastContainer {...toastProps} ref={ref}>
      <HStack justify="center" alignItems="center" {...contentProps}>
        <Div padding={20} {...titleProps}>
          {t('joined.description', {
            name: participant.name || t('defaultName'),
          })}
        </Div>
      </HStack>
    </StyledToastContainer>
  )
}
