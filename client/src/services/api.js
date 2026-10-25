const API_BASE = '/api';

/**
 * Helper to handle fetch responses and extract meaningful error messages.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new Error('Network error: Unable to connect to SignalDesk API server.');
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.message || data?.errors?.join(', ') || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Health
  checkHealth() {
    return request('/health');
  },

  // Feedback CRUD
  getFeedback(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'All') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    return request(`/feedback${queryString ? `?${queryString}` : ''}`);
  },

  getFeedbackById(id) {
    return request(`/feedback/${encodeURIComponent(id)}`);
  },

  createFeedback(feedbackData) {
    return request('/feedback', {
      method: 'POST',
      body: feedbackData,
    });
  },

  updateFeedback(id, feedbackData) {
    return request(`/feedback/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: feedbackData,
    });
  },

  deleteFeedback(id) {
    return request(`/feedback/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  classifyFeedback(id, options = {}) {
    return request(`/feedback/${encodeURIComponent(id)}/classify`, {
      method: 'POST',
      body: options,
    });
  },

  // Insights
  getInsights() {
    return request('/insights');
  },

  getInsightById(id) {
    return request(`/insights/${encodeURIComponent(id)}`);
  },

  generateInsights() {
    return request('/insights/generate', {
      method: 'POST',
    });
  },

  deleteInsight(id) {
    return request(`/insights/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
