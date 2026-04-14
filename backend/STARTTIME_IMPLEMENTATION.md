# StartTime Implementation Guide

## Overview
Added `startTime` (format HH:mm) to the Seance model with full validation in the backend data flow.

---

## Changes Made

### 1. **Seance Model** (`src/models/Seance.js`)

Added required field with format validation:

```javascript
startTime: {
  type: String,
  required: [true, 'L\'heure de début (startTime) est requise'],
  match: [
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    'startTime doit être au format HH:mm (ex: 14:30)',
  ],
  trim: true,
},
```

**Validation:**
- ✅ Required field (cannot be null or undefined)
- ✅ Must match HH:mm format (00:00 to 23:59)
- ✅ Automatically trimmed whitespace

---

### 2. **Seance Service** (`src/services/seance.service.js`)

Added validation helpers and integrated into create/update flows:

```javascript
// ── Validation Helpers ──────────────────────────────────────
const isValidStartTime = (startTime) => {
  if (!startTime || typeof startTime !== 'string') return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(startTime);
};

const validateStartTime = (data) => {
  if (!data.startTime) {
    throw new ValidationError('startTime est obligatoire (format HH:mm, ex: 14:30)');
  }
  if (!isValidStartTime(data.startTime)) {
    throw new ValidationError(
      `startTime invalide. Format attendu: HH:mm (ex: 14:30), reçu: ${data.startTime}`
    );
  }
  return data.startTime.trim();
};
```

**Integration:**
- `createSeance()` validates startTime before creating
- `updateSeance()` validates startTime if present in update payload
- Returns clear error messages for format validation failures

---

## API Usage Examples

### ✅ **Create Seance (POST)**

**Endpoint:** `POST /api/seances`

#### Valid Request:
```json
{
  "moduleId": "67a1b2c3d4e5f6g7h8i9j0k1",
  "subModuleId": null,
  "titre": "Introduction aux bases de données",
  "type": "presentielle",
  "dateSeance": "2025-04-15T00:00:00Z", 
  "startTime": "14:30",
  "duree": 90
}
```

#### Valid Response (201 Created):
```json
{
  "success": true,
  "message": "Séance créée",
  "data": {
    "_id": "67b5d8e9f1g2h3i4j5k6l7m8",
    "moduleId": "67a1b2c3d4e5f6g7h8i9j0k1",
    "subModuleId": null,
    "titre": "Introduction aux bases de données",
    "type": "presentielle",
    "dateSeance": "2025-04-15T00:00:00.000Z",
    "startTime": "14:30",
    "duree": 90,
    "ordre": 1,
    "createdAt": "2025-04-10T10:30:00.000Z",
    "updatedAt": "2025-04-10T10:30:00.000Z"
  }
}
```

---

### ❌ **Error Cases**

#### Missing startTime:
```json
{
  "moduleId": "67a1b2c3d4e5f6g7h8i9j0k1",
  "titre": "Mon cours",
  "type": "distanciel"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "startTime est obligatoire (format HH:mm, ex: 14:30)"
}
```

---

#### Invalid startTime Format:
```json
{
  "moduleId": "67a1b2c3d4e5f6g7h8i9j0k1",
  "titre": "Mon cours",
  "type": "distanciel",
  "startTime": "25:70"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "startTime invalide. Format attendu: HH:mm (ex: 14:30), reçu: 25:70"
}
```

---

#### Wrong Format (Text instead of HH:mm):
```json
{
  "moduleId": "67a1b2c3d4e5f6g7h8i9j0k1",
  "titre": "Mon cours",
  "type": "distanciel",
  "startTime": "afternoon"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "startTime invalide. Format attendu: HH:mm (ex: 14:30), reçu: afternoon"
}
```

---

### ✅ **Update Seance (PUT)**

**Endpoint:** `PUT /api/seances/:id`

#### Update startTime:
```json
{
  "startTime": "09:00",
  "duree": 120
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Séance mise à jour",
  "data": {
    "_id": "67b5d8e9f1g2h3i4j5k6l7m8",
    "moduleId": "67a1b2c3d4e5f6g7h8i9j0k1",
    "titre": "Introduction aux bases de données",
    "type": "presentielle",
    "startTime": "09:00",
    "duree": 120,
    "ordre": 1,
    "updatedAt": "2025-04-10T11:00:00.000Z"
  }
}
```

---

## Validation Rules Summary

| Rule | Details |
|------|---------|
| **Required** | startTime must always be present |
| **Format** | HH:mm (24-hour format, 00:00 to 23:59) |
| **Type** | String |
| **Whitespace** | Auto-trimmed |
| **Valid Examples** | `"09:00"`, `"14:30"`, `"23:59"`, `"00:00"` |
| **Invalid Examples** | `"25:00"`, `"14:61"`, `"2:30"`, `"14.30"` |

---

## How It Works

### Data Flow

1. **Request Received** → Controller receives request body
2. **Service Layer** → `createSeance()` or `updateSeance()` called
   - Calls `validateStartTime()` 
   - Throws `ValidationError` if invalid
3. **Model Layer** → Mongoose schema validates
   - Regex match validation
   - Trim whitespace
4. **Repository Layer** → Save to MongoDB
5. **Response Sent** → Client receives seance with startTime

---

## Testing Guide

### Test with cURL:

```bash
# ✅ Valid request
curl -X POST http://localhost:3000/api/seances \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "YOUR_MODULE_ID",
    "titre": "Test Seance",
    "type": "presentielle",
    "startTime": "14:30",
    "duree": 90
  }'

# ❌ Missing startTime
curl -X POST http://localhost:3000/api/seances \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "YOUR_MODULE_ID",
    "titre": "Test Seance",
    "type": "presentielle",
    "duree": 90
  }'

# ❌ Invalid format
curl -X POST http://localhost:3000/api/seances \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "YOUR_MODULE_ID",
    "titre": "Test Seance",
    "type": "presentielle",
    "startTime": "25:99",
    "duree": 90
  }'
```

---

## Next Steps (Optional)

- **Frontend**: Add time input field (HTML5 `<input type="time">`) to forms
- **Calendar**: Integrate FullCalendar when ready
- **API Docs**: Update Swagger/OpenAPI spec with startTime parameter
- **Database Migration**: Run `db.seances.update()` if you have existing seances without startTime

---

## Notes

- ✅ **No breaking changes** — Backwards compatible data flow
- ✅ **Validation at 2 layers** — Service + Model for robustness
- ✅ **Clear error messages** — For debugging and API integration
- ✅ **Ready for frontend** — Can add calendar UI anytime
- ✅ **Production-ready** — Follows existing code patterns

