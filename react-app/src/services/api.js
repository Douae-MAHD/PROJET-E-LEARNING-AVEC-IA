const API_BASE_URL = 'http://localhost:5000/api';

// Fonction utilitaire pour les requêtes
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erreur serveur');
    }
    
    return data;
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
    
    const token = localStorage.getItem('token');
    
    return fetch(`${API_BASE_URL}/pdfs/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }).then(res => res.json());
  },
  
  getById: (id) => request(`/pdfs/${id}`),
  
  download: async (id) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/pdfs/${id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    body: { reponses }
  }),
  
  getById: (quizId) => request(`/quiz/${quizId}`),
  
  getAll: () => request('/quiz/student/all')
};

// Exercices
export const exercisesAPI = {
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

