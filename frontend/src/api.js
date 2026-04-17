/**
 * Centralized API client for the CivicPulse AI backend.
 * All components should import from here instead of hardcoding URLs.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'pune-slug';

/** Default headers for every request */
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Tenant-ID': TENANT_ID,
};

// ─── Complaints ────────────────────────────────────────────────────────────

/**
 * Fetch all complaints, optionally filtered by status or category.
 * Returns the array (empty if backend offline).
 */
export async function fetchComplaints({ status, category } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);

  const url = `${API_BASE}/api/complaints${params.toString() ? '?' + params : ''}`;
  const res = await fetch(url, { headers: defaultHeaders });
  if (!res.ok) throw new Error(`Complaints fetch failed: ${res.status}`);
  const data = await res.json();
  return data.complaints || (Array.isArray(data) ? data : []);
}

/**
 * Fetch a single complaint by its public ID (UUID).
 */
export async function fetchComplaint(publicId) {
  const res = await fetch(`${API_BASE}/api/complaints/${publicId}`, { headers: defaultHeaders });
  if (!res.ok) throw new Error(`Complaint ${publicId} not found`);
  const data = await res.json();
  return data.complaint || data;        // backend returns { complaint: {...} }
}

/**
 * Submit a new civic complaint.
 * Backend expects: { transcript_or_text, latitude, longitude, media_type, ... }
 */
export async function submitComplaint({ title, description, latitude, longitude, category = 'General' }) {
  const res = await fetch(`${API_BASE}/api/complaints`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      transcript_or_text: description || title,  // backend key
      title,
      description,
      latitude,
      longitude,
      category,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Submission failed');
  // Backend returns { success, data: { report_id, master_id, ai_explanation, message } }
  return data.data || data;
}

// ─── Chat ──────────────────────────────────────────────────────────────────

/**
 * Send a chat message array and return the text reply.
 * The backend streams a UI message stream; we consume it as plain text.
 */
export async function sendChatMessage(messages) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ messages, tenantId: TENANT_ID }),
  });

  if (!res.ok) throw new Error(`Chat error: ${res.status}`);

  // The backend pipes a stream. Read it as text and return last non-empty chunk.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  // Extract plain text from the Vercel AI SDK UIMessageStream format
  const segments = fullText.split('data:');
  const textLines = segments
    .filter(seg => seg.trim().length > 0)
    .map(seg => {
      try {
        const payload = JSON.parse(seg.trim());
        if (payload.type === 'text-delta') {
          return payload.delta || payload.textDelta || '';
        }
        return '';
      } catch {
        return '';
      }
    })
    .join('');

  return textLines || fullText.trim() || "I'm processing your request. Please try again.";
}

// ─── Analytics ─────────────────────────────────────────────────────────────

/**
 * Fetch live governance stats for the public bulletin board.
 */
export async function fetchPublicStats() {
  const res = await fetch(
    `${API_BASE}/api/analytics/public-dashboard?tenant=${TENANT_ID}`,
    { headers: { 'X-Tenant-ID': TENANT_ID } }
  );
  if (!res.ok) throw new Error('Stats fetch failed');
  return res.json();
}
