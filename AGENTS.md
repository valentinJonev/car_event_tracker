# AGENTS.md - Coding Guidelines for event-tracker

## Tooling Preferences

- **Use LSP for code navigation** - Prefer "Go to Definition", "Find References", and IDE search over `grep`/`rg` for exploring code
- **Use IDE refactoring tools** - Rename, extract, and organize imports via LSP instead of manual text replacement

## Project Overview
Monorepo: **backend/** (Python 3.12/FastAPI/SQLAlchemy 2.0 async/Pydantic v2/PostgreSQL+PostGIS/Celery/Redis) + **frontend/** (React 18/TypeScript/Vite/Zustand/TanStack Query v5/Tailwind/i18next)

## Build / Lint / Test Commands

### Backend (Python)
```bash
# Run all tests
docker-compose exec api pytest

# Run single test file
docker-compose exec api pytest backend/tests/test_api/test_events.py

# Run single test by name
docker-compose exec api pytest backend/tests/test_api/test_events.py::TestListEvents::test_list_events_empty

# Run single test class
docker-compose exec api pytest backend/tests/test_api/test_events.py::TestListEvents

# Lint/format with ruff
docker-compose exec api ruff check backend/
docker-compose exec api ruff format backend/
```

### Frontend (TypeScript/React)
```bash
cd frontend
npm install
npm run dev          # Dev server
npm run build        # Production build
npx tsc --noEmit     # Type check
npm run preview      # Preview build
```

### Docker
```bash
docker-compose up -d           # Start all services
docker-compose up api          # Start single service
docker-compose up --build      # Rebuild and restart
docker-compose logs -f api     # View logs
docker-compose down            # Stop all
```

## Backend Code Style (Python)

### Imports
- Always start with `from __future__ import annotations`
- Order: stdlib → third-party → local (`app.*`)

```python
from __future__ import annotations

import enum
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.schemas.event import EventCreate
```

### Type Hints & Naming
- Use `from __future__ import annotations` for forward references
- Always annotate function parameters and return types
- **Files**: `snake_case.py` | **Classes**: `PascalCase` | **Functions/variables**: `snake_case` | **Constants**: `UPPER_CASE`
- Pydantic models: `PascalCase` with intent suffix (`EventCreate`, `EventResponse`)

### FastAPI Routes
- Use `APIRouter()` for modular routing, dependency injection for DB/auth
- Raise `HTTPException` for errors; use `status_code=status.HTTP_201_CREATED` for POST

```python
@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    event = await get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
```

### SQLAlchemy 2.0 Patterns
- Use `mapped_column` syntax, inherit from `UUIDMixin`, `TimestampMixin`, `Base`
- Use `select()` for queries, `async_sessionmaker` and `AsyncSession`

```python
class Event(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "events"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    organiser_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
```

### Pydantic v2 Schemas
- Use `BaseModel` with `model_config = {"from_attributes": True}`
- Use `Field()` for validation; separate `*Create`, `*Update`, `*Response` schemas

### Service Layer & Error Handling
- Routes delegate to `app/services/`; services contain business logic
- Use `HTTPException` in routes; `try/except` with rollback in DB operations
- Use `async def` for all routes/services; `await` for all DB ops

### Ruff Configuration
- Line length: 100, Target: Python 3.12 (in `pyproject.toml`)

## Frontend Code Style (TypeScript/React)

### Components & State
- Function components with default exports; named exports for utilities/types
- **Zustand** for global state (auth, theme); **TanStack Query** for server state
- Custom hooks in `src/hooks/` prefixed with `use`

```tsx
const { user, isAuthenticated } = useAuthStore();
const { data: events } = useEvents(filters);
```

### TypeScript
- Strict mode enabled; define types in `src/types/index.ts`
- Path alias: `@/*` → `./src/*`

```typescript
export interface Event {
  id: string;
  title: string;
  event_type: EventType;
  start_datetime: string;
}
```

### Styling & i18n
- Tailwind CSS exclusively; dark mode via `dark:`, responsive via `sm:`, `md:`, `lg:`
- i18next with `useTranslation()` hook; keys in `src/i18n/locales/`

```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md">
const { t } = useTranslation();
<h3>{t('eventTypes.racing')}</h3>
```

### API Layer
- Axios instance in `src/services/api.ts` with request/response interceptors for auth + token refresh

## Testing Patterns

### Backend (pytest)
- Fixtures in `tests/conftest.py`: `client`, `db_session`, `test_user`, `test_organiser`, `test_admin`
- Use `@pytest.mark.asyncio` for async tests; `auth_headers(user)` for authenticated requests

```python
@pytest.mark.asyncio
async def test_list_events(client: AsyncClient, test_organiser: User):
    response = await client.get("/api/v1/events/")
    assert response.status_code == 200
```

### Frontend
- No test framework configured; consider Vitest + React Testing Library

## Architecture Notes
- API versioning: `/api/v1/` | Database: PostgreSQL + PostGIS | Cache/Queue: Redis + Celery
- Auth: JWT access + refresh tokens, bcrypt | OAuth: Facebook/Instagram via Authlib
- Notifications: Web Push + email via Celery | Calendar: iCal (.ics) export

## File Organization
```
backend/
├── app/api/v1/      # Routes
├── app/models/      # SQLAlchemy models
├── app/schemas/     # Pydantic schemas
├── app/services/    # Business logic
├── app/tasks/       # Celery tasks
├── app/utils/       # Utilities
├── tests/conftest.py
└── alembic/         # Migrations

frontend/
├── src/components/  # UI components
├── src/hooks/       # Custom hooks
├── src/pages/       # Page components
├── src/services/    # API layer
├── src/store/       # Zustand stores
├── src/types/       # TypeScript types
└── src/i18n/        # Translations
```
