import { Div } from '@/primitives'
import { ToastProvider } from './ToastProvider'
import { WaitingParticipantNotification } from './WaitingParticipantNotification'

export const NotificationProvider = () => (
  <Div position="absolute" bottom={0} right={5} zIndex={1000}>
    <ToastProvider />
    <WaitingParticipantNotification />
  </Div>
)
