/**
 * Vercel Serverless Function — Widget Domain Security Check
 * Endpoint: POST /api/validate-domain
 *
 * Validates if a government/municipal website domain is authorized
 * to embed the SCIRP+ citizen complaint widget for a given city tenant.
 *
 * Used by scirp-widget.js before loading the iframe.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Allowed domains per tenant (city)
// This mirrors src/lib/allowed-domains.ts
// Keep both in sync when onboarding new cities
const ALLOWED_DOMAINS = [
  {
    domain: "localhost",
    tenantIds: ["*"],
  },
  {
    domain: "127.0.0.1",
    tenantIds: ["*"],
  },
  // Production municipal websites — add here when onboarding cities:
  // {
  //   domain: "pmc.gov.in",
  //   tenantIds: ["pune-tenant-uuid"],
  // },
  // {
  //   domain: "mcgm.gov.in",
  //   tenantIds: ["mumbai-tenant-uuid"],
  // },
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { referrer, tenantId } = req.body;

  if (!referrer || !tenantId) {
    return res.status(400).json({ error: "Missing referrer or tenantId" });
  }

  try {
    const url = new URL(referrer);
    const hostname = url.hostname;

    for (const allowedDomain of ALLOWED_DOMAINS) {
      if (
        hostname === allowedDomain.domain ||
        hostname.endsWith(`.${allowedDomain.domain}`)
      ) {
        if (
          allowedDomain.tenantIds.includes("*") ||
          allowedDomain.tenantIds.includes(tenantId)
        ) {
          return res.status(200).json({
            allowed: true,
            message: "Domain authorized for SCIRP+ widget",
          });
        } else {
          return res.status(403).json({
            allowed: false,
            reason: `Tenant '${tenantId}' not authorized for domain '${hostname}'`,
          });
        }
      }
    }

    return res.status(403).json({
      allowed: false,
      reason: `Domain '${hostname}' is not authorized to embed the SCIRP+ widget`,
    });
  } catch (error) {
    return res.status(400).json({
      allowed: false,
      reason: "Invalid referrer URL",
    });
  }
}
