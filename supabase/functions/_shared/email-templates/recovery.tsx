/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Wachtwoord resetten — De 12e Man</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://ebxpdscmebdmyqjwmpun.supabase.co/storage/v1/object/public/email-assets/logo.png"
          alt="De 12e Man"
          width="140"
          height="auto"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Wachtwoord resetten</Heading>
        <Text style={text}>
          Hey! We ontvingen een verzoek om je wachtwoord voor De 12e Man te resetten.
          Klik op de knop hieronder om een nieuw wachtwoord in te stellen.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Nieuw wachtwoord instellen
        </Button>
        <Text style={footerText}>
          Heb je dit niet aangevraagd? Dan kun je deze e-mail veilig negeren.
          Je wachtwoord wordt niet gewijzigd.
        </Text>
        <Text style={brand}>
          ⚽ De 12e Man — Het platform voor vrijwilligers in de sport
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#faf8f5', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', marginTop: '40px', marginBottom: '40px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1f2b', margin: '0 0 16px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 28px' }
const button = { backgroundColor: 'hsl(24, 85%, 55%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footerText = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
const brand = { fontSize: '12px', color: '#c4c4c4', margin: '24px 0 0', textAlign: 'center' as const }
