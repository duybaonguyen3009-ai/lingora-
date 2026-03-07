# Lingora – API Specification

**Base URL:** `http://localhost:4000`  
**Format:** JSON  
**Auth:** Bearer token (JWT) — not yet implemented

---

## Response Envelope

All responses follow this shape:

```json
{
  "success": true,
  "message": "OK",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

---

## Endpoints

### Health

| Method | Path      | Description        | Auth |
|--------|-----------|--------------------|------|
| GET    | `/health` | Liveness check     | No   |

**GET /health – Response 200**
```json
{
  "success": true,
  "service": "lingora-api",
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Users *(Phase 1)*

| Method | Path             | Description         | Auth     |
|--------|------------------|---------------------|----------|
| POST   | `/api/v1/auth/register` | Create account | No  |
| POST   | `/api/v1/auth/login`    | Obtain JWT     | No  |
| GET    | `/api/v1/users/me`      | Current user   | Yes |
| PATCH  | `/api/v1/users/me`      | Update profile | Yes |

---

### Vocabulary *(Phase 2)*

| Method | Path                        | Description             | Auth |
|--------|-----------------------------|-------------------------|------|
| GET    | `/api/v1/vocabulary`        | List words (paginated)  | Yes  |
| GET    | `/api/v1/vocabulary/:id`    | Get single word         | Yes  |
| POST   | `/api/v1/vocabulary`        | Create word (admin)     | Yes  |
| PATCH  | `/api/v1/vocabulary/:id`    | Update word (admin)     | Yes  |
| DELETE | `/api/v1/vocabulary/:id`    | Delete word (admin)     | Yes  |

**Query params for GET /api/v1/vocabulary**

| Param       | Type   | Default | Description              |
|-------------|--------|---------|--------------------------|
| `page`      | number | 1       | Page number              |
| `pageSize`  | number | 20      | Items per page           |
| `level`     | string | –       | Filter by difficulty     |
| `search`    | string | –       | Fuzzy word search        |

---

### Quizzes *(Phase 3)*

| Method | Path                      | Description             | Auth |
|--------|---------------------------|-------------------------|------|
| GET    | `/api/v1/quizzes`         | List quizzes            | Yes  |
| GET    | `/api/v1/quizzes/:id`     | Get quiz with questions | Yes  |
| POST   | `/api/v1/quizzes/:id/submit` | Submit answers       | Yes  |

---

### Speaking *(Phase 4)*

| Method | Path                          | Description            | Auth |
|--------|-------------------------------|------------------------|------|
| GET    | `/api/v1/speaking/prompts`    | List speaking prompts  | Yes  |
| POST   | `/api/v1/speaking/submissions`| Upload audio recording | Yes  |

---

## HTTP Status Codes Used

| Code | Meaning                    |
|------|----------------------------|
| 200  | OK                         |
| 201  | Created                    |
| 400  | Bad request (validation)   |
| 401  | Unauthenticated            |
| 403  | Forbidden                  |
| 404  | Not found                  |
| 422  | Unprocessable entity       |
| 500  | Internal server error      |

---

*Spec reflects planned endpoints. Implemented endpoints are marked in the roadmap.*
