/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="cs" dir="ltr">
    <Head />
    <Preview>Tvůj ověřovací kód</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Potvrď identitu</Heading>
        <Text style={text}>Použij kód níže k potvrzení své identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Tento kód brzy vyprší. Pokud jsi o něj nežádal/a, tento e-mail klidně
          ignoruj.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#2e2118',
  margin: '0 0 28px',
  padding: '12px 16px',
  backgroundColor: '#f0ece0',
  border: '1px solid #e7dccd',
  display: 'inline-block',
  borderRadius: '2px',
  letterSpacing: '0.1em',
}
const footer = { fontSize: '12px', color: '#8a7a66', margin: '28px 0 0' }