-- Création de la base de données
CREATE DATABASE IF NOT EXISTS e_learning_db;
USE e_learning_db;

-- Table Users
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('professeur', 'etudiant') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table CourseModules (Modules de cours)
CREATE TABLE IF NOT EXISTS course_modules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titre VARCHAR(200) NOT NULL,
  description TEXT,
  professeur_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professeur_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table SubModules (Sous-modules)
CREATE TABLE IF NOT EXISTS sub_modules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titre VARCHAR(200) NOT NULL,
  description TEXT,
  parent_module_id INT,
  parent_sub_module_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_sub_module_id) REFERENCES sub_modules(id) ON DELETE CASCADE
);

-- Table PDFs
CREATE TABLE IF NOT EXISTS pdfs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nom_fichier VARCHAR(255) NOT NULL,
  chemin_fichier VARCHAR(500) NOT NULL,
  taille_fichier INT,
  sub_module_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sub_module_id) REFERENCES sub_modules(id) ON DELETE CASCADE
);

-- Table Quiz
CREATE TABLE IF NOT EXISTS quiz (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pdf_id INT NULL,
  module_id INT NULL,
  etudiant_id INT NOT NULL,
  questions JSON NOT NULL,
  reponses_etudiant JSON,
  note DECIMAL(5,2),
  date_completion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (etudiant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table Exercises
CREATE TABLE IF NOT EXISTS exercises (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pdf_id INT NULL,
  module_id INT NULL,
  etudiant_id INT NOT NULL,
  enonce TEXT NOT NULL,
  reponse_etudiante TEXT,
  correction_ia TEXT,
  note DECIMAL(5,2),
  date_completion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (etudiant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  etudiant_id INT NOT NULL,
  quiz_id INT NULL,
  exercise_id INT NULL,
  feedback_texte TEXT NOT NULL,
  type_feedback ENUM('individuel', 'global') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (etudiant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Table Module Enrollments (Inscriptions des étudiants aux modules)
CREATE TABLE IF NOT EXISTS module_enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  module_id INT NOT NULL,
  etudiant_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_enrollment (module_id, etudiant_id),
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (etudiant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX idx_professeur ON course_modules(professeur_id);
CREATE INDEX idx_sub_module_parent ON sub_modules(parent_module_id);
CREATE INDEX idx_pdf_sub_module ON pdfs(sub_module_id);
CREATE INDEX idx_quiz_etudiant ON quiz(etudiant_id);
CREATE INDEX idx_exercise_etudiant ON exercises(etudiant_id);
CREATE INDEX idx_enrollment_module ON module_enrollments(module_id);
CREATE INDEX idx_enrollment_etudiant ON module_enrollments(etudiant_id);

