/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="cs" dir="ltr">
    <Head />
    <Preview>Potvrď změnu e-mailu pro {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Potvrď změnu e-mailu</Heading>
        <Text style={text}>
          Požádal/a jsi o změnu e-mailové adresy pro {siteName} z{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          na{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Kliknutím na tlačítko níže změnu potvrdíš:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Potvrdit změnu e-mailu
        </Button>
        <Text style={footer}>
          Pokud jsi o změnu nežádal/a, okamžitě si zabezpeč účet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Courier New', Courier, monospace" }
const container = { padding: '24px 28px', backgroundColor: '#faf8f3', border: '1px solid #e7dccd' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#2e2118',
  margin: '0 0 20px',
  fontFamily: "Georgia, 'Times New Roman', serif",
}
const text = {
  fontSize: '14px',
  color: '#55514a',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: '#6b4423', textDecoration: 'underline' }
const button = {
  backgroundColor: '#6b4423',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '2px',
  padding: '12px 24px',
  textDecoration: 'none',
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 'bold' as const,
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#8a7a66', margin: '28px 0 0' }