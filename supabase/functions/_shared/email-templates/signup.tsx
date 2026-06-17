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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="cs" dir="ltr">
    <Head />
    <Preview>Potvrď svůj e-mail pro {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Potvrď svůj e-mail</Heading>
        <Text style={text}>
          Děkujeme za registraci do{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Prosím, potvrď svou e-mailovou adresu (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) kliknutím na tlačítko níže:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Potvrdit e-mail
        </Button>
        <Text style={footer}>
          Pokud jsi si účet nevytvořil/a, tento e-mail klidně ignoruj.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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