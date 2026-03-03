# 📝 QUIZ GENERATION SYSTEM - FILE ANALYSIS

Complete breakdown of all files involved in the quiz generation feature with detailed role explanations.

---

## 🎯 **OVERVIEW**

The quiz generation system allows students to generate AI-powered quizzes from:
1. **Single PDF** - Quiz from one PDF document
2. **SubModule (Course)** - Quiz covering all PDFs in a course
3. **Module (Global)** - Quiz covering all courses in a module

**Technology Stack:**
- **AI Engine:** Google Gemini 2.5 Flash API
- **PDF Processing:** pdf-parse library
- **Database:** MongoDB with Mongoose ODM
- **Architecture:** 3-layer pattern (Routes → Controllers → Services → Repositories)

---

## 🗂️ **BACKEND FILES (8 Core Files)**

### **1. Model Layer**

#### 📄 `backend/src/models/Quiz.js`
**Role:** Database schema definition

**Responsibilities:**
- Defines MongoDB collection structure for quizzes
- Stores generated questions and student answers
- Tracks quiz submission status and scoring
- Manages relationships (pdfId, moduleId, subModuleId, etudiantId)

**Key Fields:**
```javascript
{
  pdfId: ObjectId,              // Reference to PDF (if single PDF quiz)
  moduleId: ObjectId,            // Reference to Module (if global quiz)
  subModuleId: ObjectId,         // Reference to SubModule (if course quiz)
  etudiantId: ObjectId,          // Student who owns this quiz
  questions: [{                  // AI-generated questions
    id: ObjectId,
    question: String,
    options: [String],           // Multiple choice options
    correctAnswer: String,
    explanation: String
  }],
  reponsesEtudiant: [{           // Student's submitted answers
    questionId: ObjectId,
    reponse: String
  }],
  note: Number,                  // Score out of 20
  scoringDetails: [{             // Detailed correction
    questionId: ObjectId,
    correct: Boolean,
    explanation: String
  }],
  feedback: {                    // AI-generated feedback
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },
  isSubmitted: Boolean,          // Prevent resubmission
  submittedAt: Date
}
```

**Database Indexes:**
- `etudiantId` - Fast student quiz lookup
- `moduleId`, `subModuleId`, `pdfId` - Content-based queries
- `etudiantId + submittedAt` - Composite for history queries

---

### **2. Route Layer**

#### 📄 `backend/src/routes/quiz.routes.js`
**Role:** HTTP endpoint definitions

**Responsibilities:**
- Maps HTTP methods to endpoints
- Applies authentication middleware
- Enforces role-based access (students only)
- Routes requests to controllers

**Endpoints:**
```javascript
POST   /quiz/generate/:pdfId              // Generate from single PDF
POST   /quiz/generate/cours/:subModuleId  // Generate from course
POST   /quiz/generate/module/:moduleId    // Generate from module
GET    /quiz/:quizId                      // Retrieve quiz
POST   /quiz/:quizId/submit               // Submit answers
GET    /quiz/student/all                  // Get all student quizzes
GET    /quiz/teacher/results              // Teacher view results
```

**Middleware Applied:**
- `authenticateToken` - Requires JWT authentication
- `requireRole(['etudiant'])` - Students only for generation/submission
- `requireRole(['professeur'])` - Teachers only for results

---

### **3. Controller Layer**

#### 📄 `backend/src/controllers/quizController.js`
**Role:** HTTP request/response handling

**Responsibilities:**
- Extract parameters from requests (params, body, user)
- Call validators to check input
- Invoke service methods
- Format HTTP responses
- Handle errors and status codes

**Key Methods:**
```javascript
generateFromPDF(req, res)
  - Extracts: pdfId (params), etudiantId (JWT token)
  - Validates: pdfId format
  - Calls: quizService.generateQuizFromPDF()
  - Returns: 201 with { _id, questions, isExisting }

generateFromModule(req, res)
  - Extracts: moduleId (params), etudiantId (JWT)
  - Validates: moduleId format
  - Calls: quizService.generateQuizFromModule()
  - Returns: 201 with quiz data

generateFromSubModule(req, res)
  - Extracts: subModuleId (params), etudiantId (JWT)
  - Validates: subModuleId format
  - Calls: quizService.generateQuizFromSubModule()
  - Returns: 201 with quiz data

getQuiz(req, res)
  - Extracts: quizId (params), etudiantId (JWT)
  - Calls: quizService.getQuiz()
  - Returns: 200 with full quiz data

submitQuiz(req, res)
  - Extracts: quizId (params), reponsesEtudiant (body)
  - Validates: answer format
  - Calls: quizService.submitQuiz()
  - Returns: 200 with { note, scoringDetails, feedback }
```

**Does NOT:**
- Contain business logic (delegated to services)
- Access database directly (uses services/repositories)
- Make AI calls (uses services)

---

### **4. Service Layer - Core Logic**

#### 📄 `backend/src/services/quiz/quizService.js` ⭐ **MAIN FILE**
**Role:** Quiz generation business logic

**Responsibilities:**
- Check for existing quizzes (prevent duplicates)
- Extract text from PDFs
- Call Gemini AI to generate questions
- Save quizzes to database
- Score student submissions
- Generate feedback

**Key Methods:**

**1. generateFromPDF(pdfId, etudiantId)**
```javascript
Flow:
1. Check if quiz already exists (pdfId + etudiantId)
   → If exists: Return existing quiz ID
2. Find PDF in database
3. Extract text from PDF file (via pdfService)
4. Call Gemini API to generate questions (via geminiService)
5. Create new Quiz document
6. Save to database
7. Return { _id, questions, isExisting: false }
```

**2. generateQuizFromModule(moduleId, etudiantId)**
```javascript
Flow:
1. Check if module quiz exists (moduleId + etudiantId)
2. Find all SubModules for this module
3. Find all PDFs in those SubModules
4. Extract text from ALL PDFs
5. Combine text: "--- Document: filename.pdf ---\n[text]"
6. Call Gemini API with combined text
7. Save quiz with moduleId reference
8. Return quiz data
```

**3. generateQuizFromSubModule(subModuleId, etudiantId)**
```javascript
Flow:
1. Check if submodule quiz exists
2. Find all PDFs in this SubModule
3. Extract text from all PDFs
4. Combine text from multiple documents
5. Generate quiz via Gemini
6. Save quiz with subModuleId reference
7. Return quiz data
```

**4. submitQuiz(quizId, etudiantId, reponsesEtudiant)**
```javascript
Flow:
1. Find quiz by ID
2. Check if already submitted (prevent resubmission)
3. Match student answers to questions
4. Compare answers with correct answers
5. Calculate score: (correct / total) * 20
6. Generate detailed corrections
7. Update quiz with:
   - reponsesEtudiant
   - note
   - scoringDetails
   - isSubmitted: true
   - submittedAt: Date
8. Return { note, correct, total, scoringDetails, feedback }
```

**Answer Matching Logic:**
```javascript
compareAnswers(studentAnswer, correctAnswer) {
  const normalize = (str) => str.trim().toLowerCase();
  return normalize(studentAnswer) === normalize(correctAnswer);
}
```

**Error Handling:**
- `NotFoundError` - Quiz/PDF/Module not found
- `ServiceError` - AI generation failed, PDF extraction failed
- `ValidationError` - Already submitted, invalid input

---

#### 📄 `backend/src/services/quiz/quizValidator.js`
**Role:** Input validation

**Responsibilities:**
- Validate MongoDB ObjectId format
- Check required fields
- Validate answer structure

**Methods:**
```javascript
validateGeneratePDFRequest(pdfId)
  - Checks: pdfId exists and is valid ObjectId

validateGenerateModuleRequest(moduleId)
  - Checks: moduleId exists and is valid ObjectId

validateGetQuizRequest(quizId)
  - Checks: quizId exists and is valid ObjectId

validateSubmitRequest(quizId, reponsesEtudiant)
  - Checks: quizId valid
  - Checks: reponsesEtudiant is array
  - Checks: each answer has questionId and reponse
```

---

### **5. AI Integration Layer**

#### 📄 `backend/src/services/ai/geminiService.js` ⭐ **AI ENGINE**
**Role:** Google Gemini API integration

**Responsibilities:**
- Initialize Gemini API client
- Generate quiz questions from text
- Handle AI retries and rate limiting
- Parse AI responses into structured format

**Key Method:**

**generateQuizQuestions(pdfText)**
```javascript
Flow:
1. Build prompt with system instructions:
   "You are an expert educator. Generate 10 multiple-choice questions 
    from this content. Return JSON format: 
    { questions: [{ question, options: [A,B,C,D], correctAnswer, explanation }] }"

2. Call Gemini API with retry logic (3 attempts):
   - Attempt 1: Immediate
   - Attempt 2: Wait 2 seconds
   - Attempt 3: Wait 4 seconds (exponential backoff)

3. Parse JSON response
4. Validate structure:
   - Must have 'questions' array
   - Each question needs: question, options, correctAnswer

5. Return: { questions: [...] }
```

**Retry Logic:**
- Rate limiting (429): Retry with backoff
- Server errors (500, 503): Retry
- Other errors: Fail immediately

**Prompt Engineering:**
```javascript
systemPrompt = `
You are an expert educational quiz generator.
Generate exactly 10 multiple-choice questions based on the provided content.

Requirements:
- Questions should test comprehension and key concepts
- Each question must have 4 options (A, B, C, D)
- Only one option is correct
- Include brief explanations for correct answers

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": 1,
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Because..."
    }
  ]
}
`;
```

---

#### 📄 `backend/src/services/pdf/pdfService.js`
**Role:** PDF text extraction

**Responsibilities:**
- Read PDF files from filesystem
- Extract text content using pdf-parse
- Handle extraction errors

**Method:**
```javascript
extractText(filePath)
  - Reads: PDF file from disk
  - Uses: pdf-parse library
  - Returns: String of extracted text
  - Errors: ServiceError if file not found or corrupted
```

---

### **6. Repository Layer**

#### 📄 `backend/src/repositories/quizRepository.js`
**Role:** Database operations

**Responsibilities:**
- CRUD operations on Quiz collection
- Complex queries with population
- Error handling for database operations

**Methods:**
```javascript
findById(quizId)
  - Finds quiz by ID
  - Populates: pdfId, moduleId, subModuleId, etudiantId
  - Returns: Quiz document with populated references

findByPdfAndStudent(pdfId, etudiantId)
  - Checks for existing quiz
  - Returns: Quiz or null

findByModuleAndStudent(moduleId, etudiantId)
  - Checks for existing module quiz
  - Returns: Quiz or null

findByStudent(etudiantId)
  - Gets all quizzes for a student
  - Sorts by submittedAt descending
  - Returns: Array of quizzes

update(quizId, data)
  - Updates quiz document
  - Returns: Updated quiz

create(quizData)
  - Creates new Quiz
  - Returns: Saved document
```

---

### **7. Validation Layer**

#### 📄 `backend/src/validators/quiz.validator.js`
**Role:** Express-validator middleware

**Responsibilities:**
- Validate HTTP request parameters
- Provide user-friendly error messages

**Validators:**
```javascript
validateMongoId
  - Checks: param('id').isMongoId()
  - Error: 'Invalid ID format'

validateQuizGeneration
  - Checks: body('pdfId').isMongoId()
  - Error: 'Invalid PDF ID'

validateQuizSubmission
  - Checks: body('answers').isArray({ min: 1 })
  - Checks: body('answers.*.questionIndex').isInt()
  - Checks: body('answers.*.selectedAnswer').notEmpty()
```

---

## 🌐 **FRONTEND FILES (3 Core Files)**

### **1. Component Layer**

#### 📄 `react-app/src/components/QuizView.jsx` ⭐ **MAIN UI**
**Role:** Quiz taking interface

**Responsibilities:**
- Display quiz questions
- Handle student answer selection
- Submit answers to backend
- Display results and corrections
- Show AI feedback

**State Management:**
```javascript
const [quiz, setQuiz] = useState(null)           // Quiz data from backend
const [answers, setAnswers] = useState({})       // Student's answers (indexed by question)
const [submitted, setSubmitted] = useState(false) // Submission status
const [result, setResult] = useState(null)       // Scoring results
const [loading, setLoading] = useState(true)     // Loading state
const [submitting, setSubmitting] = useState(false) // Submit in progress
const [error, setError] = useState('')           // Error messages
const [showDetails, setShowDetails] = useState(false) // Toggle corrections
```

**Key Functions:**

**1. loadQuiz()**
```javascript
Flow:
1. Call API: quizAPI.getById(quizId)
2. Set quiz data
3. If already submitted:
   - Load previous answers
   - Load scoring results
   - Show corrections
4. Handle errors
```

**2. handleAnswerChange(questionIndex, answer)**
```javascript
Updates answers object:
answers[questionIndex] = answer

Example:
{
  0: "Option B",
  1: "Option A",
  2: "Option C"
}
```

**3. handleSubmit()**
```javascript
Flow:
1. Validate all questions answered
2. Format answers for backend:
   [
     { questionId: "abc123", reponse: "Option B" },
     { questionId: "def456", reponse: "Option A" }
   ]
3. Call API: quizAPI.submit(quizId, formattedAnswers)
4. Receive results:
   {
     note: 15.5,
     correct: 8,
     total: 10,
     scoringDetails: [...],
     feedback: { strengths, weaknesses, recommendations }
   }
5. Display results
6. Mark as submitted (prevent resubmission)
```

**UI Sections:**
1. **Header** - Title and score (if submitted)
2. **Questions List** - Radio buttons for each question
3. **Submit Button** - Disabled if already submitted
4. **Results Panel** - Note, correct/total, progress bar
5. **Corrections** - Question-by-question breakdown
6. **Feedback** - AI-generated strengths/weaknesses/recommendations

**Visual Feedback:**
- ✅ Green for correct answers
- ❌ Red for incorrect answers
- Progress bar showing score percentage
- Color-coded sections

---

#### 📄 `react-app/src/components/ModuleView.jsx`
**Role:** Quiz generation triggers

**Responsibilities:**
- Display module/course structure
- Provide "Generate Quiz" buttons
- Navigate to quiz after generation

**Quiz Generation Functions:**

**1. handleGenerateQuiz(pdfId)** - Single PDF Quiz
```javascript
Flow:
1. Call API: quizAPI.generate(pdfId)
2. Extract quiz._id from response
3. Show success alert
4. Navigate to: /quiz/${quizId}
```

**2. handleGenerateQuizForCourse(subModuleId)** - Course Quiz
```javascript
Flow:
1. Call API: quizAPI.generateForCourse(subModuleId)
2. Check if isExisting:
   - If true: "Quiz déjà généré"
   - If false: "Quiz généré avec succès"
3. Navigate to quiz page
```

**3. handleGenerateGlobalQuiz(moduleId)** - Module Quiz
```javascript
Flow:
1. Call API: quizAPI.generateGlobal(moduleId)
2. Show success message
3. Navigate to quiz page
```

**UI Elements:**
- **PDF Level**: "📝 Générer Quiz" button per PDF
- **Course Level**: "📝 Générer Quiz du Cours" (covers all PDFs in course)
- **Module Level**: "📝 Générer Quiz Global" (covers all courses)

---

### **2. API Service Layer**

#### 📄 `react-app/src/services/api.js`
**Role:** Backend API communication

**Responsibilities:**
- HTTP requests to backend
- JWT token handling
- Error handling and formatting

**Quiz API Methods:**
```javascript
export const quizAPI = {
  // Generate quiz from single PDF
  generate: (pdfId) => 
    request(`/quiz/generate/${pdfId}`, { method: 'POST' }),
  
  // Generate quiz from course (submodule)
  generateForCourse: (subModuleId) => 
    request(`/quiz/generate/cours/${subModuleId}`, { method: 'POST' }),
  
  // Generate quiz from module (global)
  generateGlobal: (moduleId) => 
    request(`/quiz/generate/module/${moduleId}`, { method: 'POST' }),
  
  // Submit quiz answers
  submit: (quizId, reponses) => 
    request(`/quiz/${quizId}/submit`, { 
      method: 'POST', 
      body: { reponses } 
    }),
  
  // Get quiz by ID
  getById: (quizId) => 
    request(`/quiz/${quizId}`),
  
  // Get all quizzes for student
  getAll: () => 
    request('/quiz/student/all')
};
```

**Request Helper:**
```javascript
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    ...options
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  
  return data;
};
```

---

## 🔄 **COMPLETE QUIZ GENERATION FLOW**

### **SCENARIO: Student Generates Quiz from PDF**

**Frontend (User Action) →**
```
1. Student clicks "Générer Quiz" button on PDF
2. ModuleView.jsx → handleGenerateQuiz(pdfId)
3. api.js → quizAPI.generate(pdfId)
4. HTTP POST → /api/quiz/generate/:pdfId
```

**Backend (Processing) →**
```
5. quiz.routes.js → Receives POST request
6. auth middleware → Validates JWT token
7. quizController.js → generateFromPDF()
   - Extracts pdfId, etudiantId
8. quizValidator.js → Validates pdfId format
9. quizService.js → generateFromPDF(pdfId, etudiantId)
   
   a. Check Database:
      quizRepository.findByPdfAndStudent(pdfId, etudiantId)
      → If exists: Return existing quiz
      
   b. Extract PDF:
      - Find PDF in database (models/PDF.js)
      - pdfService.extractText(filePath)
      - Returns: "Chapter 1: Introduction to React..."
   
   c. Generate Questions:
      - geminiService.generateQuizQuestions(pdfText)
      - Gemini API Call with prompt
      - Returns: { questions: [...] }
   
   d. Save Quiz:
      - Create new Quiz(model)
      - quizRepository.create(quizData)
      - Returns: Saved quiz with _id
      
10. Response → { _id: "abc123", questions: [...], isExisting: false }
```

**Frontend (Display) →**
```
11. api.js → Returns quiz data
12. ModuleView.jsx → Receives response
13. navigate(`/quiz/${quiz._id}`)
14. QuizView.jsx → Loads and displays quiz
```

---

### **SCENARIO: Student Submits Quiz**

**Frontend →**
```
1. Student selects answers (QuizView.jsx)
2. Student clicks "Soumettre le quiz"
3. handleSubmit()
   - Formats answers: [{ questionId, reponse }, ...]
4. quizAPI.submit(quizId, formattedAnswers)
5. HTTP POST → /api/quiz/:quizId/submit
```

**Backend →**
```
6. quiz.routes.js → POST /:quizId/submit
7. quizController.js → submitQuiz()
8. quizValidator.js → Validates submission format
9. quizService.js → submitQuiz(quizId, etudiantId, reponses)
   
   a. Find Quiz:
      quizRepository.findById(quizId)
      
   b. Check Submission Status:
      if (quiz.isSubmitted) → throw ValidationError
      
   c. Score Answers:
      - For each answer:
        - Match questionId to quiz.questions
        - Compare student answer with correctAnswer
        - Track correct/incorrect
      
   d. Calculate Score:
      note = (correct / total) * 20
      
   e. Build Corrections:
      scoringDetails = [{
        questionId,
        correct: true/false,
        studentAnswer,
        correctAnswer,
        explanation
      }]
      
   f. Update Quiz:
      - Set reponsesEtudiant
      - Set note
      - Set scoringDetails
      - Set isSubmitted = true
      - Set submittedAt = new Date()
      
10. Response → { 
    note: 15.5, 
    correct: 8, 
    total: 10,
    scoringDetails: [...],
    feedback: {...}
}
```

**Frontend →**
```
11. QuizView.jsx → Receives results
12. setResult(data)
13. setSubmitted(true)
14. Displays:
    - Score: 15.5/20
    - Correct: 8/10
    - Progress bar
    - Corrections per question
    - Feedback (strengths/weaknesses)
```

---

## 📊 **DATA FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│                        USER ACTIONS                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (React Components)                                  │
│  ┌────────────────┐         ┌─────────────────┐             │
│  │ ModuleView.jsx │────────▶│  QuizView.jsx   │             │
│  │ (Generate)     │         │  (Take/Submit)  │             │
│  └────────┬───────┘         └────────┬────────┘             │
│           │                          │                       │
│           ▼                          ▼                       │
│  ┌────────────────────────────────────────┐                 │
│  │     api.js (quizAPI)                   │                 │
│  │  - generate(pdfId)                     │                 │
│  │  - generateForCourse(subModuleId)      │                 │
│  │  - generateGlobal(moduleId)            │                 │
│  │  - submit(quizId, reponses)            │                 │
│  │  - getById(quizId)                     │                 │
│  └────────────────┬───────────────────────┘                 │
└───────────────────┼─────────────────────────────────────────┘
                    │ HTTP Requests
                    ▼
┌──────────────────────────────────────────────────────────────┐
│  BACKEND (Express Server)                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ROUTES (quiz.routes.js)                               │  │
│  │  POST /quiz/generate/:pdfId                            │  │
│  │  POST /quiz/generate/cours/:subModuleId                │  │
│  │  POST /quiz/generate/module/:moduleId                  │  │
│  │  GET  /quiz/:quizId                                    │  │
│  │  POST /quiz/:quizId/submit                             │  │
│  └────────┬───────────────────────────────────────────────┘  │
│           │                                                   │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CONTROLLERS (quizController.js)                       │  │
│  │  - Extract params, validate, call services            │  │
│  └────────┬───────────────────────────────────────────────┘  │
│           │                                                   │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  VALIDATORS (quizValidator.js)                         │  │
│  │  - Validate MongoDB IDs, answer format                │  │
│  └────────┬───────────────────────────────────────────────┘  │
│           │                                                   │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SERVICES (quizService.js) ⭐ BUSINESS LOGIC           │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │ generateFromPDF()                                │ │  │
│  │  │ generateQuizFromModule()                         │ │  │
│  │  │ generateQuizFromSubModule()                      │ │  │
│  │  │ submitQuiz()                                     │ │  │
│  │  │ compareAnswers()                                 │ │  │
│  │  └──┬─────────────────────┬─────────────────────────┘ │  │
│  └─────┼─────────────────────┼───────────────────────────┘  │
│        │                     │                               │
│        │                     ▼                               │
│        │            ┌──────────────────────┐                 │
│        │            │  pdfService.js       │                 │
│        │            │  extractText()       │                 │
│        │            └──────────────────────┘                 │
│        │                                                     │
│        ▼                                                     │
│  ┌──────────────────────────────────────┐                   │
│  │  geminiService.js ⭐ AI ENGINE       │                   │
│  │  - generateQuizQuestions(text)       │                   │
│  │  - callGemini() with retries         │                   │
│  │  - Parse JSON responses              │                   │
│  └──────────────┬───────────────────────┘                   │
│                 │ API Call                                   │
│                 ▼                                            │
│  ┌──────────────────────────────────────┐                   │
│  │  Google Gemini 2.5 Flash API         │                   │
│  │  (External AI Service)               │                   │
│  └──────────────┬───────────────────────┘                   │
│                 │ Returns JSON                               │
│                 ▼                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REPOSITORIES (quizRepository.js)                    │   │
│  │  - findById(), findByPdfAndStudent()                 │   │
│  │  - create(), update()                                │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MODELS (Quiz.js)                                    │   │
│  │  MongoDB Schema Definition                           │   │
│  └────────┬─────────────────────────────────────────────┘   │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │  MongoDB Database   │
   │  Collection: quiz   │
   └─────────────────────┘
```

---

## 🎯 **KEY DESIGN PATTERNS**

### **1. Separation of Concerns**
- **Routes**: Only define endpoints
- **Controllers**: Only handle HTTP
- **Services**: Only business logic
- **Repositories**: Only database access
- **Models**: Only data structure

### **2. Single Responsibility**
- Each file has ONE clear purpose
- `geminiService.js` ONLY does AI calls
- `pdfService.js` ONLY extracts PDFs
- `quizService.js` orchestrates but doesn't duplicate

### **3. Dependency Injection**
```javascript
// Service depends on other services
import geminiService from '../ai/geminiService.js';
import pdfService from '../pdf/pdfService.js';

// Uses them without knowing implementation
const text = await pdfService.extractText(path);
const quiz = await geminiService.generateQuizQuestions(text);
```

### **4. Error Propagation**
```javascript
try {
  const quiz = await quizService.generateFromPDF(pdfId, etudiantId);
  res.json(quiz);
} catch (error) {
  // Custom errors bubble up from service → controller → error middleware
  next(error); // Handled by generalErrorHandler
}
```

---

## 📝 **SUMMARY**

### **Backend Files (8)**
1. **Quiz.js** - Data model
2. **quiz.routes.js** - HTTP endpoints
3. **quizController.js** - Request handling
4. **quizService.js** - Business logic ⭐
5. **quizValidator.js** - Input validation
6. **geminiService.js** - AI generation ⭐
7. **pdfService.js** - Text extraction
8. **quizRepository.js** - Database operations

### **Frontend Files (3)**
1. **QuizView.jsx** - Quiz UI ⭐
2. **ModuleView.jsx** - Generation triggers
3. **api.js** - HTTP client

### **Total: 11 Core Files**

Each file has a **single, clear responsibility** following clean architecture principles. The system is:
- ✅ **Modular** - Easy to modify one part without breaking others
- ✅ **Testable** - Each layer can be tested independently
- ✅ **Scalable** - Can add new quiz types without changing core logic
- ✅ **Maintainable** - Clear file structure and naming

---

**Generated:** February 18, 2026  
**System:** E-Learning Platform - Quiz Generation Module
