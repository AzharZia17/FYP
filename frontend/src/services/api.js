// Dynamically pull Base URL falling back to typical local dev environment
// Note: Supports Vite (import.meta.env), Next.js (process.env), and static configurations.
export const BASE_URL = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 
                 (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 
                 'http://127.0.0.1:8000/api';

/**
 * Core centralized wrapper for executing managed fetch calls
 */
async function fetchHandler(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const maxRetries = options.method === 'POST' ? 3 : 1; 
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.detail || errorData?.message || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      console.warn(`[API] Attempt ${attempt + 1} failed for ${endpoint}: ${error.message}`);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// ----------------------------------------------------
// Endpoints Layer Mapping
// ----------------------------------------------------

export const authAPI = {
  login: async (email, password) => {
    return fetchHandler('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  
  register: async (userData) => {
    return fetchHandler('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
};

export const studentsAPI = {
  getAll: async () => {
    return fetchHandler('/students');
  },

  getById: async (id) => {
    return fetchHandler(`/students/${id}`);
  },

  create: async (studentData) => {
    return fetchHandler('/students/', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  },

  update: async (id, studentData) => {
    return fetchHandler(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  },

  delete: async (id) => {
    return fetchHandler(`/students/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * For multipart file forms (i.e. capturing face datasets), 
   * we skip the fetchHandler to let the browser natively define the boundary headers.
   */
  uploadDataset: async (studentName, formData) => {
    const response = await fetch(`${BASE_URL}/dataset/upload?name=${encodeURIComponent(studentName)}`, {
      method: 'POST',
      body: formData // Automatically applies multipart/form-data boundary
    });
    return response.json();
  }
};

export const attendanceAPI = {
  markAttendance: async (student_id, confidence) => {
    return fetchHandler('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ student_id, confidence })
    });
  },
  
  getTodaysLogs: async () => {
    return fetchHandler('/attendance/today');
  },

  getLogs: async ({ date, student_id } = {}) => {
    let params = new URLSearchParams();
    if (date) params.append('date', date);
    if (student_id) params.append('student_id', student_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchHandler(`/attendance/logs${query}`);
  },
  
  generateReport: async (startDate, endDate) => {
    return fetchHandler(`/attendance/report?startDate=${startDate}&endDate=${endDate}`);
  }
};

export const datasetAPI = {
  uploadFrame: async (studentId, imageData, frameNumber) => {
    return fetchHandler('/dataset/upload-frame', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        image_data: imageData,
        frame_number: frameNumber
      })
    });
  }
};

export const recognitionAPI = {
  identify: async (imageData) => {
    return fetchHandler('/recognition/identify', {
      method: 'POST',
      body: JSON.stringify({ image_data: imageData })
    });
  }
};

export const dashboardAPI = {
  getSummary: async () => {
    return fetchHandler('/dashboard/stats');
  }
};

// Default unified export
export default {
  auth: authAPI,
  students: studentsAPI,
  attendance: attendanceAPI,
  dataset: datasetAPI,
  recognition: recognitionAPI,
  dashboard: dashboardAPI
};
