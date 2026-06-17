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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="cs" dir="ltr">
    <Head />
    <Preview>Pozvánka do {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Byl/a jsi pozván/a</Heading>
        <Text style={text}>
          Dostal/a jsi pozvánku do{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Kliknutím na tlačítko níže pozvánku přijmeš a vytvoříš si účet.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Přijmout pozvánku
        </Button>
        <Text style={footer}>
          Pokud jsi pozvánku nečekal/a, tento e-mail klidně ignoruj.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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