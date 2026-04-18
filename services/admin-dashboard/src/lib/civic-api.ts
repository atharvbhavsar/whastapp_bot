/**
 * Centralized API client for CivicPulse - Next.js compatible version.
 * Migrated from frontend/src/api.js (Vite → Next.js).
 * Uses process.env.NEXT_PUBLIC_* instead of import.meta.env.VITE_*
 */

export const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AI_SERVICE_URL) ||
  'http://localhost:3000';

export const TENANT_ID =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TENANT_ID) ||
  'pune-slug';

export const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Tenant-ID': TENANT_ID,
};

// ─── Complaints ────────────────────────────────────────────────────────────

export async function fetchComplaints({ status, category }: { status?: string; category?: string } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);

  const url = `${API_BASE}/api/complaints${params.toString() ? '?' + params : ''}`;
  const res = await fetch(url, { headers: defaultHeaders });
  if (!res.ok) throw new Error(`Complaints fetch failed: ${res.status}`);
  const data = await res.json();
  return data.complaints || (Array.isArray(data) ? data : []);
}

export async function fetchComplaint(publicId: string) {
  const res = await fetch(`${API_BASE}/api/complaints/${publicId}`, { headers: defaultHeaders });
  if (!res.ok) throw new Error(`Complaint ${publicId} not found`);
  const data = await res.json();
  return data.complaint || data;
}

export async function submitComplaint({
  title,
  description,
  latitude,
  longitude,
  category = 'General',
}: {
  title?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
}) {
  const res = await fetch(`${API_BASE}/api/complaints`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      transcript_or_text: description || title,
      title,
      description,
      latitude,
      longitude,
      category,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Submission failed');
  return data.data || data;
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export async function sendChatMessage(messages: Array<{ role: string; content: string }>) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ messages, tenantId: TENANT_ID }),
  });

  if (!res.ok) throw new Error(`Chat error: ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  const segments = fullText.split('data:');
  const textLines = segments
    .filter((seg) => seg.trim().length > 0)
    .map((seg) => {
      try {
        const payload = JSON.parse(seg.trim());
        if (payload.type === 'text-delta') return payload.delta || payload.textDelta || '';
        return '';
      } catch {
        return '';
      }
    })
    .join('');

  return textLines || fullText.trim() || "I'm processing your request. Please try again.";
}

// ─── Analytics ─────────────────────────────────────────────────────────────

export async function fetchPublicStats() {
  const res = await fetch(
    `${API_BASE}/api/analytics/public-dashboard?tenant=${TENANT_ID}`,
    { headers: { 'X-Tenant-ID': TENANT_ID } }
  );
  if (!res.ok) throw new Error('Stats fetch failed');
  return res.json();
}
