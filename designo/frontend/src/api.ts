import type {
  AppConfig, DiscoveryJob, Lead, OutreachEmail, Photo, Project, Video,
} from './types'

// '/designo/api' in prod and dev (vite proxy handles dev)
export const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch { /* not json */ }
    throw new Error(detail)
  }
  return res.json()
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const api = {
  config: () => request<AppConfig>('/config'),

  listProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (name: string, brief?: object) =>
    request<Project>('/projects', json('POST', { name, brief })),
  updateBrief: (id: string, brief: object) =>
    request<Project>(`/projects/${id}/brief`, json('PUT', { brief })),
  deleteProject: (id: string) => request<{ deleted: string }>(`/projects/${id}`, json('DELETE')),

  uploadPhoto: (projectId: string, file: File, tag: string, caption = '') => {
    const form = new FormData()
    form.append('file', file)
    form.append('tag', tag)
    form.append('caption', caption)
    return request<Photo>(`/projects/${projectId}/photos`, { method: 'POST', body: form })
  },
  updatePhoto: (projectId: string, photoId: string, fields: { tag?: string; caption?: string }) =>
    request<Photo>(`/projects/${projectId}/photos/${photoId}`, json('PATCH', fields)),
  deletePhoto: (projectId: string, photoId: string) =>
    request<{ deleted: string }>(`/projects/${projectId}/photos/${photoId}`, json('DELETE')),
  photoUrl: (projectId: string, photoId: string, version?: string) =>
    `${API_BASE}/projects/${projectId}/photos/${photoId}/file${version ? `?v=${version}` : ''}`,
  retouchPhoto: (projectId: string, photoId: string, instruction: string) =>
    request<Photo>(`/projects/${projectId}/photos/${photoId}/retouch`, json('POST', { instruction })),
  revertPhoto: (projectId: string, photoId: string) =>
    request<Photo>(`/projects/${projectId}/photos/${photoId}/revert`, json('POST')),
  splicePhotos: (projectId: string, photoIds: string[], instruction: string, touchUp: boolean) =>
    request<Photo>(`/projects/${projectId}/photos/splice`,
      json('POST', { photo_ids: photoIds, instruction, touch_up: touchUp })),

  generate: (projectId: string) =>
    request<Project>(`/projects/${projectId}/generate`, json('POST')),
  iterate: (projectId: string, instruction: string) =>
    request<Project>(`/projects/${projectId}/iterate`, json('POST', { instruction })),

  heroVideo: (projectId: string, photoId: string, tier: 'draft' | 'final', prompt: string, durationS: number) =>
    request<Video>(`/projects/${projectId}/hero-video`,
      json('POST', { photo_id: photoId, tier, prompt, duration_s: durationS })),
  videoUrl: (projectId: string, videoId: string) =>
    `${API_BASE}/projects/${projectId}/videos/${videoId}/file`,
  addVideoToSite: (projectId: string, videoId: string) =>
    request<Project>(`/projects/${projectId}/videos/${videoId}/add-to-site`, json('POST')),

  previewUrl: (projectId: string) => `${API_BASE}/preview/${projectId}/`,
  exportUrl: (projectId: string) => `${API_BASE}/projects/${projectId}/export`,

  // --- Lead generation ---
  listLeads: (status?: string) =>
    request<Lead[]>(`/leads${status ? `?status=${status}` : ''}`),
  getLead: (id: string) => request<Lead>(`/leads/${id}`),
  updateLead: (id: string, fields: { email?: string; phone?: string; status?: string }) =>
    request<Lead>(`/leads/${id}`, json('PATCH', fields)),
  deleteLead: (id: string) => request<{ deleted: string }>(`/leads/${id}`, json('DELETE')),
  runLead: (id: string) => request<Lead>(`/leads/${id}/run`, json('POST')),
  approveLead: (id: string) => request<Lead>(`/leads/${id}/approve`, json('POST')),
  updateLeadEmail: (id: string, fields: { subject?: string; body_text?: string }) =>
    request<OutreachEmail>(`/leads/${id}/email`, json('PATCH', fields)),

  discover: (body: { source: string; query?: string; sic_code?: string; days_back?: number; max_results?: number }) =>
    request<DiscoveryJob>('/leads/discover', json('POST', body)),
  discoveryStatus: (jobId: string) => request<DiscoveryJob>(`/leads/discovery/${jobId}`),
  importLeadsCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<DiscoveryJob>('/leads/import-csv', { method: 'POST', body: form })
  },

  leadSettings: () => request<Record<string, string>>('/leads/settings'),
  saveLeadSettings: (settings: Record<string, string>) =>
    request<Record<string, string>>('/leads/settings', json('PUT', { settings })),

  leadMediaUrl: (leadId: string, name: 'hero.png' | 'scroll.gif', v?: number) =>
    `${API_BASE}/leads/${leadId}/media/${name}${v ? `?v=${v}` : ''}`,
  leadEmailPreviewUrl: (leadId: string, v?: number) =>
    `${API_BASE}/leads/${leadId}/email-preview${v ? `?v=${v}` : ''}`,
}
