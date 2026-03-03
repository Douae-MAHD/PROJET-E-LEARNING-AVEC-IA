# SCRIPT DE NETTOYAGE ARCHITECTURE - PowerShell
# Refactorisation Backend Node.js/Express
# À exécuter après validation de la nouvelle structure

<#
.SYNOPSIS
Script de nettoyage pour supprimer les anciens dossiers suite à la refactorisation architecture

.DESCRIPTION
Ce script:
1. Archive les anciens fichiers (traçabilité)
2. Supprime les doublons obsolètes
3. Valide la nouvelle structure
4. Nettoie les fichiers temporaires

.NOTES
Exécuter depuis la racine du projet (c:\moodle project\moodle-project)
#>

param(
    [switch]$DryRun = $false,
    [switch]$Archive = $true,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Couleurs pour le output
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

function Write-Success { Write-Host "[✓]" -ForegroundColor $SuccessColor -NoNewline; Write-Host " $args" }
function Write-Error { Write-Host "[✗]" -ForegroundColor $ErrorColor -NoNewline; Write-Host " $args" }
function Write-Warning { Write-Host "[!]" -ForegroundColor $WarningColor -NoNewline; Write-Host " $args" }
function Write-Info { Write-Host "[i]" -ForegroundColor $InfoColor -NoNewline; Write-Host " $args" }

Write-Host "`n========================================`n" -ForegroundColor Blue
Write-Host "SCRIPT DE NETTOYAGE ARCHITECTURE" -ForegroundColor Blue
Write-Host "Refactorisation Backend Node.js/Express`n" -ForegroundColor Blue
Write-Host "========================================`n" -ForegroundColor Blue

# Configuration
$ProjectRoot = Get-Location
$BackendPath = Join-Path $ProjectRoot "backend"
$ArchivePath = Join-Path $BackendPath ".archive"
$OldModelsPath = Join-Path $BackendPath "models"
$OldUtilsPath = Join-Path $BackendPath "utils"
$TestScriptPath = Join-Path $BackendPath "scripts\test-exercise-flow.js"

Write-Info "Répertoire courant: $ProjectRoot"
Write-Info "Mode DryRun: $DryRun"
Write-Info "Archivage: $Archive`n"

# === ÉTAPE 1: VÉRIFICATIONS ===
Write-Host "ÉTAPE 1: Vérifications préalables`n" -ForegroundColor Magenta

# Vérifier que backend/src/models existe
$NewModelsPath = Join-Path $BackendPath "src\models"
if (-not (Test-Path $NewModelsPath)) {
    Write-Error "backend/src/models n'existe pas! La refactorisation semble incomplète."
    exit 1
}
Write-Success "backend/src/models existe ✓"

# Vérifier que backend/src/utils existe
$NewUtilsPath = Join-Path $BackendPath "src\utils"
if (-not (Test-Path $NewUtilsPath)) {
    Write-Error "backend/src/utils n'existe pas!"
    exit 1
}
Write-Success "backend/src/utils existe ✓"

# Vérifier que mongoHelpers.js est dans src/utils
$MongoHelpersNew = Join-Path $NewUtilsPath "mongoHelpers.js"
if (-not (Test-Path $MongoHelpersNew)) {
    Write-Error "mongoHelpers.js n'existe pas dans backend/src/utils!"
    exit 1
}
Write-Success "mongoHelpers.js présent dans backend/src/utils ✓"

# Vérifier que les anciens fichiers existent avant suppression
$OldModelsExist = Test-Path $OldModelsPath
$OldUtilsExist = Test-Path $OldUtilsPath

if (-not $OldModelsExist -and -not $OldUtilsExist -and -not (Test-Path $TestScriptPath)) {
    Write-Warning "Les anciens fichiers n'existent pas déjà. Rien à supprimer."
    exit 0
}

Write-Success "Vérifications complètées`n"

# === ÉTAPE 2: ARCHIVAGE ===
if ($Archive) {
    Write-Host "ÉTAPE 2: Archivage des anciens fichiers`n" -ForegroundColor Magenta

    $ArchiveOldPath = Join-Path $ArchivePath "old-structure-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    if (-not (Test-Path $ArchivePath)) {
        Write-Info "Création du répertoire .archive"
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path $ArchivePath | Out-Null
        }
        Write-Success ".archive créé"
    }

    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $ArchiveOldPath | Out-Null
    }
    Write-Info "Dossier d'archivage: $ArchiveOldPath`n"

    # Archiver backend/models
    if ($OldModelsExist) {
        $ArchiveModelsPath = Join-Path $ArchiveOldPath "models"
        Write-Info "Archivage de backend/models..."
        
        if (-not $DryRun) {
            Copy-Item -Path $OldModelsPath -Destination $ArchiveModelsPath -Recurse -Force
        }
        Write-Success "backend/models archivé"
    }

    # Archiver backend/utils
    if ($OldUtilsExist) {
        $ArchiveUtilsPath = Join-Path $ArchiveOldPath "utils"
        Write-Info "Archivage de backend/utils..."
        
        if (-not $DryRun) {
            Copy-Item -Path $OldUtilsPath -Destination $ArchiveUtilsPath -Recurse -Force
        }
        Write-Success "backend/utils archivé"
    }

    # Archiver test-exercise-flow.js
    if (Test-Path $TestScriptPath) {
        Write-Info "Archivage de test-exercise-flow.js..."
        
        if (-not $DryRun) {
            Copy-Item -Path $TestScriptPath -Destination (Join-Path $ArchiveOldPath "test-exercise-flow.js") -Force
        }
        Write-Success "test-exercise-flow.js archivé"
    }

    Write-Success "Archivage complété`n"
}

# === ÉTAPE 3: SUPPRESSION ===
Write-Host "ÉTAPE 3: Suppression des anciens fichiers`n" -ForegroundColor Magenta

$ItemsToDelete = @()

if ($OldModelsExist) {
    $ItemsToDelete += $OldModelsPath
    Write-Warning "À supprimer: backend/models/"
}

if ($OldUtilsExist) {
    $ItemsToDelete += $OldUtilsPath
    Write-Warning "À supprimer: backend/utils/"
}

if (Test-Path $TestScriptPath) {
    $ItemsToDelete += $TestScriptPath
    Write-Warning "À supprimer: backend/scripts/test-exercise-flow.js"
}

if ($ItemsToDelete.Count -eq 0) {
    Write-Info "Aucun élément à supprimer"
}
else {
    if ($DryRun) {
        Write-Info "DRY RUN - Les éléments suivants SERAIENT supprimés:"
        $ItemsToDelete | ForEach-Object { Write-Host "  - $_" -ForegroundColor $WarningColor }
    }
    else {
        Write-Warning "Suppression en cours..."
        
        if (-not $Force) {
            $Confirmation = Read-Host "Êtes-vous certain? (oui/non)"
            if ($Confirmation -ne "oui") {
                Write-Warning "Suppression annulée"
                exit 0
            }
        }

        foreach ($Item in $ItemsToDelete) {
            try {
                Remove-Item -Path $Item -Recurse -Force -ErrorAction Stop
                Write-Success "Supprimé: $Item"
            }
            catch {
                Write-Error "Erreur lors de la suppression de $Item : $_"
            }
        }

        Write-Success "Suppression complétée`n"
    }
}

# === ÉTAPE 4: VALIDATION ===
Write-Host "ÉTAPE 4: Validation de la structure`n" -ForegroundColor Magenta

$ValidationsPassed = 0
$ValidationsFailed = 0

# Vérifier que backend/src/models existe toujours
if (Test-Path $NewModelsPath) {
    Write-Success "backend/src/models existe"
    $ValidationsPassed++
} else {
    Write-Error "backend/src/models n'existe plus!"
    $ValidationsFailed++
}

# Vérifier que les models sont dans src/models
$ExpectedModels = @("User.js", "CourseModule.js", "SubModule.js", "PDF.js", "Quiz.js", "Exercise.js", "Feedback.js", "ModuleEnrollment.js")
$ModelsCount = 0

foreach ($Model in $ExpectedModels) {
    $ModelPath = Join-Path $NewModelsPath $Model
    if (Test-Path $ModelPath) {
        $ModelsCount++
    } else {
        Write-Warning "  Modèle manquant: $Model"
    }
}

Write-Success "$ModelsCount/$($ExpectedModels.Count) modèles trouvés dans src/models"
$ValidationsPassed++

# Vérifier que mongoHelpers.js est dans src/utils
if (Test-Path $MongoHelpersNew) {
    Write-Success "mongoHelpers.js présent dans src/utils"
    $ValidationsPassed++
} else {
    Write-Error "mongoHelpers.js manquant dans src/utils"
    $ValidationsFailed++
}

# Afficher résumé
Write-Host "`n========================================`n" -ForegroundColor Blue
Write-Host "RÉSUMÉ DE LA VALIDATION" -ForegroundColor Blue
Write-Host "========================================`n" -ForegroundColor Blue

Write-Host "Validations réussies: " -NoNewline
Write-Host "$ValidationsPassed" -ForegroundColor $SuccessColor

if ($ValidationsFailed -gt 0) {
    Write-Host "Validations échouées: " -NoNewline
    Write-Host "$ValidationsFailed" -ForegroundColor $ErrorColor
}

Write-Host "`n========================================`n" -ForegroundColor Blue

if ($ValidationsFailed -eq 0) {
    Write-Success "`nNettoyage complété avec succès!`n"
    Write-Info "Recommandations:"
    Write-Host "  1. Exécuter 'npm install' pour vérifier les dépendances"
    Write-Host "  2. Redémarrer les services: npm start"
    Write-Host "  3. Exécuter les tests pour valider les imports"
} else {
    Write-Error "`nDes problèmes ont été détectés. Vérifiez ci-dessus.`n"
    exit 1
}
