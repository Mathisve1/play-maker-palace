/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je verificatiecode — De 12e Man</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://ebxpdscmebdmyqjwmpun.supabase.co/storage/v1/object/public/email-assets/logo.png"
          alt="De 12e Man"
          width="140"
          height="auto"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Verificatiecode</Heading>
        <Text style={text}>Gebruik de onderstaande code om je identiteit te bevestigen:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footerText}>
          Deze code verloopt binnenkort. Heb je dit niet aangevraagd? Dan kun je deze e-mail veilig negeren.
        </Text>
        <Text style={brand}>
          ⚽ De 12e Man — Het platform voor vrijwilligers in de sport
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#faf8f5', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', marginTop: '40px', marginBottom: '40px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1f2b', margin: '0 0 16px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 28px' }
const codeStyle = { fontFamily: "'Space Grotesk', Courier, monospace", fontSize: '32px', fontWeight: 'bold' as const, color: 'hsl(24, 85%, 55%)', margin: '0 0 30px', letterSpacing: '4px', textAlign: 'center' as const }
const footerText = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
const brand = { fontSize: '12px', color: '#c4c4c4', margin: '24px 0 0', textAlign: 'center' as const }
