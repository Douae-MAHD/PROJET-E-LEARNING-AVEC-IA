const API_BASE_URL = 'http://localhost:5000/api';
const SESSION_EXPIRED_MESSAGE = 'Session expirée, veuillez vous reconnecter';

const handleUnauthorized = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.setItem('authMessage', SESSION_EXPIRED_MESSAGE);
  alert(SESSION_EXPIRED_MESSAGE);
  window.location.href = '/login';
};

const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  return response;
};

// Fonction utilitaire pour les requêtes
const request = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData;

  const config = {
    headers: {
      ...options.headers
    },
    ...options
  };

  if (!isFormData) {
    config.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}${endpoint}`, config);
    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }
    
    if (!response.ok) {
      // Handle error response
      let errorMessage = 'Erreur serveur';
      
      if (data.error) {
        // Backend sends { error: { message: '...', type: '...' } }
        if (typeof data.error === 'object' && data.error.message) {
          errorMessage = data.error.message;
        } else if (typeof data.error === 'string') {
          errorMessage = data.error;
        }
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      throw new Error(errorMessage);
    }
    
    // Backend returns { success: true, data: {...}, message: '...' }
    // Client expects just the data, so return data property if it exists
    return data.data !== undefined ? data.data : data;
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
};

// Authentification
export const authAPI = {
  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: userData
  }),
  
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: { email, password }
  }),
  
  verify: () => request('/auth/verify')
};

// Modules
export const modulesAPI = {
  getAll: () => request('/modules'),
  
  getById: (id) => request(`/modules/${id}`),
  
  create: (moduleData) => request('/modules', {
    method: 'POST',
    body: moduleData
  }),
  
  createSubModule: (moduleId, subModuleData) => request(`/modules/${moduleId}/submodules`, {
    method: 'POST',
    body: subModuleData
  }),
  
  getSubModule: (id) => request(`/modules/submodules/${id}`)
};

// PDFs
export const pdfsAPI = {
  upload: (subModuleId, file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('sub_module_id', subModuleId);

    return apiFetch(`${API_BASE_URL}/pdfs/upload`, {
      method: 'POST',
      headers: {},
      body: formData
    }).then(res => res.json());
  },
  
  getById: (id) => request(`/pdfs/${id}`),
  
  download: async (id) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/pdfs/${id}/download`, {
        method: 'GET',
        headers: {}
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du PDF');
      }
      
      // Récupérer le nom du fichier depuis les headers ou utiliser un nom par défaut
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'document.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Créer un blob et télécharger
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du PDF: ' + error.message);
    }
  },
  
  delete: (id) => request(`/pdfs/${id}`, {
    method: 'DELETE'
  })
};

// Quiz
export const quizAPI = {
  checkModuleExisting: (moduleId) => request(`/quiz/check/module/${moduleId}`),

  generate: (pdfId) => request(`/quiz/generate/${pdfId}`, {
    method: 'POST'
  }),
  
  generateForCourse: (subModuleId) => request(`/quiz/generate/cours/${subModuleId}`, {
    method: 'POST'
  }),
  
  generateGlobal: (moduleId) => request(`/quiz/generate/module/${moduleId}`, {
    method: 'POST'
  }),
  
  submit: (quizId, reponses) => request(`/quiz/${quizId}/submit`, {
    method: 'POST',
    body: { reponsesEtudiant: reponses }
  }),
  
  getById: (quizId) => request(`/quiz/${quizId}`),
  
  getAll: () => request('/quiz/student/all')
};

// Exercices
export const exercisesAPI = {
  checkModuleExisting: (moduleId) => request(`/exercises/check/module/${moduleId}`),

  generate: (pdfId) => request(`/exercises/generate/${pdfId}`, {
    method: 'POST'
  }),
  
  generateForCourse: (subModuleId) => request(`/exercises/generate/cours/${subModuleId}`, {
    method: 'POST'
  }),
  
  generateGlobal: (moduleId) => request(`/exercises/generate/module/${moduleId}`, {
    method: 'POST'
  }),
  
  submit: (exerciseId, reponse) => request(`/exercises/${exerciseId}/submit`, {
    method: 'POST',
    body: { reponse }
  }),
  
  getById: (exerciseId) => request(`/exercises/${exerciseId}`),
  
  getAll: () => request('/exercises/student/all')
};

// Feedback
export const feedbackAPI = {
  getStudentFeedbacks: () => request('/feedback/student'),
  
  getModuleFeedback: (moduleId) => request(`/feedback/module/${moduleId}/student`),

  getTeacherModuleFeedback: (moduleId) => request(`/feedback/teacher/module/${moduleId}`),
  
  getTeacherResults: () => request('/feedback/teacher/results'),
  
  generateGlobalFeedback: () => request('/feedback/teacher/global', {
    method: 'POST'
  }),
  
  getGlobalFeedback: () => request('/feedback/teacher/global')
};

// Enrollments (Inscriptions)
export const enrollmentsAPI = {
  // Obtenir les étudiants inscrits à un module
  getModuleStudents: (moduleId) => request(`/enrollments/module/${moduleId}/students`),
  
  // Obtenir les étudiants disponibles (non inscrits)
  getAvailableStudents: (moduleId) => request(`/enrollments/module/${moduleId}/available-students`),
  
  // Inscrire un étudiant
  enrollStudent: (moduleId, studentId) => request(`/enrollments/module/${moduleId}/student/${studentId}`, {
    method: 'POST'
  }),
  
  // Désinscrire un étudiant
  unenrollStudent: (moduleId, studentId) => request(`/enrollments/module/${moduleId}/student/${studentId}`, {
    method: 'DELETE'
  }),
  
  // Inscrire plusieurs étudiants
  enrollMultipleStudents: (moduleId, studentIds) => request(`/enrollments/module/${moduleId}/students`, {
    method: 'POST',
    body: { studentIds }
  })
};

