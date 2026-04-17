/**
 * Allowed Domains Configuration for SCIRP+ Embeddable Widget
 *
 * Defines which municipal/government website domains are permitted
 * to embed the citizen complaint portal widget.
 *
 * Add new domains here as cities/municipalities are onboarded.
 */

export interface AllowedDomain {
  domain: string;
  tenantIds: string[];   // Which city tenant IDs are allowed for this domain
  description?: string;
}

export const ALLOWED_DOMAINS: AllowedDomain[] = [
  {
    domain: "localhost",
    tenantIds: ["*"], // Allow all tenants in development
    description: "Local development",
  },
  {
    domain: "127.0.0.1",
    tenantIds: ["*"],
    description: "Local development",
  },
  // Production domains — Add municipal websites here as cities are onboarded
  // Example:
  // {
  //   domain: "pmc.gov.in",
  //   tenantIds: ["pune-tenant-uuid"],
  //   description: "Pune Municipal Corporation",
  // },
  // {
  //   domain: "mcgm.gov.in",
  //   tenantIds: ["mumbai-tenant-uuid"],
  //   description: "Mumbai Municipal Corporation",
  // },
];

/**
 * Check if a domain is allowed to embed the SCIRP+ widget
 * @param referrer - The referring URL
 * @param tenantId - The city tenant UUID being initialized
 */
export function isDomainAllowed(
  referrer: string | null,
  tenantId: string
): { allowed: boolean; reason?: string } {
  // In development (no referrer), allow all
  if (!referrer) {
    console.warn("[SCIRP+] No referrer detected — allowing in development mode");
    return { allowed: true };
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
          return { allowed: true };
        } else {
          return {
            allowed: false,
            reason: `Tenant '${tenantId}' is not authorized for domain '${hostname}'`,
          };
        }
      }
    }

    return {
      allowed: false,
      reason: `Domain '${hostname}' is not authorized to embed the SCIRP+ widget`,
    };
  } catch (error) {
    console.error("[SCIRP+] Error parsing referrer:", error);
    return { allowed: false, reason: "Invalid referrer URL" };
  }
}

/**
 * Get all allowed origins for CORS headers
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  for (const allowedDomain of ALLOWED_DOMAINS) {
    origins.push(`https://${allowedDomain.domain}`);
    origins.push(`http://${allowedDomain.domain}`);
    if (!allowedDomain.domain.includes("localhost")) {
      origins.push(`https://*.${allowedDomain.domain}`);
      origins.push(`http://*.${allowedDomain.domain}`);
    }
  }

  return origins;
}
