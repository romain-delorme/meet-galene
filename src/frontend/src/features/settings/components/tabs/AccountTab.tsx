import { A, Badge, Button, DialogProps, Field, H, P } from '@/primitives'
import { Trans, useTranslation } from 'react-i18next'
import { useUser } from '@/features/auth'
import { css } from '@/styled-system/css'
import { TabPanel, TabPanelProps } from '@/primitives/Tabs'
import { HStack } from '@/styled-system/jsx'
import { useContext, useState } from 'react'
import { LoginButton } from '@/components/LoginButton'
import { usePersistentUserChoices } from '@/features/rooms/galene/hooks/usePersistentUserChoices'
import { GaleneContext } from '@/features/rooms/galene/GaleneContext'

export type AccountTabProps = Pick<DialogProps, 'onOpenChange'> &
  Pick<TabPanelProps, 'id'>

export const AccountTab = ({ id, onOpenChange }: AccountTabProps) => {
  const { t } = useTranslation('settings')
  const { saveUsername } = usePersistentUserChoices()
  const { connection, renameParticipant } = useContext(GaleneContext)
  const room = connection?.group
  const { user, isLoggedIn, logout } = useUser()
  const [name, setName] = useState(connection?.username ?? '')
  const userDisplay =
    user?.full_name && user?.email
      ? `${user.full_name} (${user.email})`
      : user?.email

  const handleOnSubmit = async () => {
    if (name === connection?.username) {
      onOpenChange?.(false)
    }
    try {
      if (room) await renameParticipant(name)
      saveUsername(name)
      onOpenChange?.(false) // only close on success
    } catch (error) {
      console.error(
        `Failed to rename participant: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  const handleOnCancel = () => {
    if (onOpenChange) onOpenChange(false)
  }

  return (
    <TabPanel padding={'md'} flex id={id}>
      <H lvl={2}>{t('account.heading')}</H>
      <Field
        type="text"
        label={t('account.nameLabel')}
        value={name}
        onChange={setName}
        validate={(value) => {
          return !value ? <p>{t('account.nameError')}</p> : null
        }}
      />
      <H lvl={2}>{t('account.authentication')}</H>
      {isLoggedIn ? (
        <>
          <P>
            <Trans
              i18nKey="settings:account.currentlyLoggedAs"
              values={{ user: userDisplay }}
              components={[<Badge />]}
            />
          </P>
          <P>
            <A onPress={logout}>{t('logout', { ns: 'global' })}</A>
          </P>
        </>
      ) : (
        <>
          <P>{t('account.youAreNotLoggedIn')}</P>
          <LoginButton />
        </>
      )}
      <HStack
        className={css({
          marginTop: 'auto',
          marginLeft: 'auto',
        })}
      >
        <Button variant="secondary" onPress={handleOnCancel}>
          {t('cancel', { ns: 'global' })}
        </Button>
        <Button variant={'primary'} onPress={handleOnSubmit}>
          {t('submit', { ns: 'global' })}
        </Button>
      </HStack>
    </TabPanel>
  )
}
