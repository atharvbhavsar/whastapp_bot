/**
 * SCIRP+ City/Municipality Registry
 *
 * Lists all onboarded city tenants with their metadata.
 * Used in the admin login, sidebar city switcher, and domain validation.
 *
 * Add new cities here when onboarding new municipalities.
 */

export interface City {
  slug: string;        // URL-safe unique identifier (matches tenant slug in DB)
  name: string;        // Full display name
  state: string;       // Indian state
  tier: "Tier-1" | "Tier-2" | "Tier-3";
  population?: string;
}

export const cities: City[] = [
  {
    slug: "pune",
    name: "Pune Municipal Corporation",
    state: "Maharashtra",
    tier: "Tier-1",
    population: "33 Lakh",
  },
  {
    slug: "mumbai",
    name: "Brihanmumbai Municipal Corporation",
    state: "Maharashtra",
    tier: "Tier-1",
    population: "1.2 Crore",
  },
  {
    slug: "nagpur",
    name: "Nagpur Municipal Corporation",
    state: "Maharashtra",
    tier: "Tier-1",
    population: "25 Lakh",
  },
  {
    slug: "nashik",
    name: "Nashik Municipal Corporation",
    state: "Maharashtra",
    tier: "Tier-2",
    population: "15 Lakh",
  },
  {
    slug: "delhi",
    name: "Municipal Corporation of Delhi",
    state: "Delhi",
    tier: "Tier-1",
    population: "3 Crore",
  },
  {
    slug: "bengaluru",
    name: "Bruhat Bengaluru Mahanagara Palike",
    state: "Karnataka",
    tier: "Tier-1",
    population: "1.3 Crore",
  },
  // Add more cities as they onboard
];

/**
 * Get city by slug
 */
export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

/**
 * Get city display name by slug
 */
export function getCityNameBySlug(slug: string): string {
  return getCityBySlug(slug)?.name || "Unknown Municipality";
}
