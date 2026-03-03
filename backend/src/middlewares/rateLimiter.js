import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Fonction pour construire un message d'erreur personnalisé
const buildErrorHandler = (message, type) => (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      message,
      type
    }
  });
};

// Limiteur pour les générations IA
export const aiGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // max 10 requêtes
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req), // Utilisateur connecté ou IP (IPv4/IPv6)
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildErrorHandler(
    'Trop de générations IA. Veuillez réessayer dans 15 minutes.',
    'AI_GENERATION_RATE_LIMIT'
  )
});

// Limiteur pour la soumission des évaluations
export const assessmentSubmitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req), // Utilisateur connecté ou IP (IPv4/IPv6)
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildErrorHandler(
    'Trop de soumissions. Veuillez réessayer dans 10 minutes.',
    'SUBMISSION_RATE_LIMIT'
  )
});

// Limiteur pour l’authentification
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  keyGenerator: ipKeyGenerator, // Limitation uniquement par IP (IPv4/IPv6)
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildErrorHandler(
    'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    'AUTH_RATE_LIMIT'
  )
});