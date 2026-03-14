/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Bevestig je e-mailwijziging — De 12e Man</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://ebxpdscmebdmyqjwmpun.supabase.co/storage/v1/object/public/email-assets/logo.png"
          alt="De 12e Man"
          width="140"
          height="auto"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>E-mailadres wijzigen</Heading>
        <Text style={text}>
          Je hebt gevraagd om je e-mailadres te wijzigen van{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          naar{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          <Link href={confirmationUrl} style={link}>Klik hier om de wijziging te bevestigen</Link>
        </Text>
        <Text style={footerText}>
          Heb je dit niet aangevraagd? Beveilig dan onmiddellijk je account.
        </Text>
        <Text style={brand}>
          ⚽ De 12e Man — Het platform voor vrijwilligers in de sport
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#faf8f5', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', marginTop: '40px', marginBottom: '40px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1f2b', margin: '0 0 16px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 28px' }
const link = { color: 'hsl(24, 85%, 55%)', textDecoration: 'underline' }
const footerText = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
const brand = { fontSize: '12px', color: '#c4c4c4', margin: '24px 0 0', textAlign: 'center' as const }
