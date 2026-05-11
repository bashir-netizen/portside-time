import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  ip: string;
  deviceLabel: string;
  observedAt: string;
  approvalUrl: string;
  expiresAtFormatted: string;
};

export function IpApprovalEmail({
  ip,
  deviceLabel,
  observedAt,
  approvalUrl,
  expiresAtFormatted,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>New IP detected at the Portside time clock</Preview>
      <Body
        style={{
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#f5f5f5",
          padding: "24px 0",
          margin: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            backgroundColor: "#ffffff",
            margin: "0 auto",
            padding: "32px",
            borderRadius: "8px",
          }}
        >
          <Heading style={{ margin: "0 0 16px", fontSize: "20px" }}>
            New IP detected at the office
          </Heading>
          <Text style={{ margin: "0 0 16px", color: "#374151" }}>
            An approved device tried to access Portside Time from an IP address
            that isn't on the allowlist.
          </Text>
          <Section
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              padding: "16px",
              margin: "0 0 24px",
            }}
          >
            <Text style={{ margin: 0, color: "#111827" }}>
              <strong>IP:</strong> {ip}
            </Text>
            <Text style={{ margin: "8px 0 0", color: "#111827" }}>
              <strong>Device:</strong> {deviceLabel}
            </Text>
            <Text style={{ margin: "8px 0 0", color: "#111827" }}>
              <strong>First seen:</strong> {observedAt}
            </Text>
          </Section>
          <Section style={{ textAlign: "center", margin: "0 0 24px" }}>
            <Link
              href={approvalUrl}
              style={{
                display: "inline-block",
                backgroundColor: "#111827",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Review and approve
            </Link>
          </Section>
          <Text style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
            This link expires at {expiresAtFormatted}. You'll need to be signed
            in to confirm.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
