/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
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
  <Html lang="cs" dir="ltr">
    <Head />
    <Preview>Obnovení hesla pro {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Obnovit heslo</Heading>
        <Text style={text}>
          Obdrželi jsme žádost o obnovení hesla pro {siteName}. Kliknutím na
          tlačítko níže si nastavíš nové heslo.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Obnovit heslo
        </Button>
        <Text style={footer}>
          Pokud jsi o obnovení hesla nežádal/a, tento e-mail klidně ignoruj.
          Tvé heslo se nezmění.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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