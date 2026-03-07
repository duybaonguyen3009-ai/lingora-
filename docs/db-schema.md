# Lingora – Database Schema

> Status: Planning. No database is connected yet.  
> Target: PostgreSQL (relational, well-suited to the structured quiz/progress data).

---

## Tables

### `users`

| Column       | Type         | Constraints           | Notes                        |
|--------------|--------------|-----------------------|------------------------------|
| `id`         | UUID         | PK, default gen       |                              |
| `name`       | VARCHAR(100) | NOT NULL              |                              |
| `email`      | VARCHAR(255) | UNIQUE, NOT NULL      |                              |
| `password_hash` | TEXT      | NOT NULL              | bcrypt                       |
| `role`       | ENUM         | NOT NULL, default kid | `kid`, `teacher`, `parent`, `admin` |
| `level`      | SMALLINT     | NOT NULL, default 1   |                              |
| `xp`         | INT          | NOT NULL, default 0   |                              |
| `avatar_url` | TEXT         | NULLABLE              |                              |
| `created_at` | TIMESTAMPTZ  | NOT NULL, default now |                              |
| `updated_at` | TIMESTAMPTZ  | NOT NULL, default now |                              |

---

### `vocabulary_words`

| Column            | Type         | Constraints     | Notes                  |
|-------------------|--------------|-----------------|------------------------|
| `id`              | UUID         | PK              |                        |
| `word`            | VARCHAR(100) | NOT NULL        |                        |
| `definition`      | TEXT         | NOT NULL        |                        |
| `example_sentence`| TEXT         | NULLABLE        |                        |
| `audio_url`       | TEXT         | NULLABLE        |                        |
| `image_url`       | TEXT         | NULLABLE        |                        |
| `difficulty`      | ENUM         | NOT NULL        | `beginner`, `intermediate`, `advanced` |
| `created_at`      | TIMESTAMPTZ  | NOT NULL        |                        |

---

### `quizzes`

| Column        | Type         | Constraints | Notes              |
|---------------|--------------|-------------|--------------------|
| `id`          | UUID         | PK          |                    |
| `title`       | VARCHAR(200) | NOT NULL    |                    |
| `description` | TEXT         | NULLABLE    |                    |
| `difficulty`  | ENUM         | NOT NULL    |                    |
| `created_at`  | TIMESTAMPTZ  | NOT NULL    |                    |

---

### `quiz_questions`

| Column          | Type         | Constraints  | Notes                                    |
|-----------------|--------------|--------------|------------------------------------------|
| `id`            | UUID         | PK           |                                          |
| `quiz_id`       | UUID         | FK → quizzes |                                          |
| `type`          | ENUM         | NOT NULL     | `multiple_choice`, `fill_blank`, `speaking` |
| `prompt`        | TEXT         | NOT NULL     |                                          |
| `options`       | JSONB        | NULLABLE     | Array of strings for multiple-choice     |
| `correct_answer`| TEXT         | NOT NULL     |                                          |
| `hint`          | TEXT         | NULLABLE     |                                          |
| `sort_order`    | SMALLINT     | NOT NULL     |                                          |

---

### `quiz_attempts`

| Column       | Type        | Constraints          | Notes               |
|--------------|-------------|----------------------|---------------------|
| `id`         | UUID        | PK                   |                     |
| `user_id`    | UUID        | FK → users           |                     |
| `quiz_id`    | UUID        | FK → quizzes         |                     |
| `score`      | SMALLINT    | NOT NULL             | Percentage 0–100    |
| `xp_earned`  | SMALLINT    | NOT NULL, default 0  |                     |
| `completed_at`| TIMESTAMPTZ| NOT NULL             |                     |

---

### `speaking_submissions`

| Column       | Type        | Constraints    | Notes                   |
|--------------|-------------|----------------|-------------------------|
| `id`         | UUID        | PK             |                         |
| `user_id`    | UUID        | FK → users     |                         |
| `prompt_id`  | UUID        | FK (future)    |                         |
| `audio_url`  | TEXT        | NOT NULL       | S3 / object storage URL |
| `score`      | SMALLINT    | NULLABLE       | Populated after review  |
| `feedback`   | TEXT        | NULLABLE       |                         |
| `created_at` | TIMESTAMPTZ | NOT NULL       |                         |

---

## Indexes (planned)

```sql
CREATE INDEX idx_vocabulary_difficulty ON vocabulary_words(difficulty);
CREATE INDEX idx_quiz_questions_quiz   ON quiz_questions(quiz_id);
CREATE INDEX idx_attempts_user        ON quiz_attempts(user_id);
CREATE INDEX idx_attempts_quiz        ON quiz_attempts(quiz_id);
```

---

## Notes

- All primary keys are UUIDs to avoid sequential ID enumeration.
- `updated_at` columns will use a trigger to auto-update on row change.
- Migrations will be managed with a tool like **node-pg-migrate** or **Knex**.
- Full-text search on `vocabulary_words.word` can be added with a GIN index on a `tsvector` column when needed.
