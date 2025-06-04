# TypeScript Guide for CateringHub

This guide explains the comprehensive TypeScript type system implemented in CateringHub, including type organization, naming conventions, and best practices.

## Overview

CateringHub uses a comprehensive TypeScript type system to ensure type safety, improve developer experience, and maintain code quality. The type system is organized into domain-specific modules with clear naming conventions and strict type checking.

## Type Organization

### Directory Structure

```
types/
├── index.ts              # Central type exports
├── supabase.ts          # Generated Supabase types
├── auth.types.ts        # Authentication types
├── api.types.ts         # API and data fetching types
├── form.types.ts        # Form and validation types
├── ui.types.ts          # UI component types
└── query.types.ts       # TanStack Query types
```

### Import Strategy

Always import types from the central index file:

```typescript
import type { AuthUser, Profile, ApiResponse } from '@/types'
```

For specific domain types, you can import directly:

```typescript
import type { LoginFormData } from '@/types/form.types'
```

## Type Categories

### 1. Database Types (`types/supabase.ts`)

Generated from Supabase schema with additional helper types:

```typescript
// Generated types
export type Profile = Tables<'profiles'>
export type UserRole = Tables<'user_roles'>

// Helper types for operations
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>
```

### 2. Authentication Types (`types/auth.types.ts`)

Comprehensive authentication and user management types:

```typescript
export interface AuthUser extends User {
  profile?: Profile | null
  userRole?: UserRole | null
}

export interface UserRoleData {
  role: AppRole
  provider_role?: ProviderRoleType | null
  permissions: AppPermission[]
}
```

### 3. API Types (`types/api.types.ts`)

Types for API responses, queries, and data operations:

```typescript
export interface SupabaseResponse<T> {
  data: T | null
  error: SupabaseError | null
  count?: number | null
  status: number
  statusText: string
}
```

### 4. Form Types (`types/form.types.ts`)

Form data structures and validation types:

```typescript
export interface FormState<T extends FieldValues = FieldValues> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}
```

### 5. UI Types (`types/ui.types.ts`)

Component props and UI-related types:

```typescript
export interface ButtonProps extends BaseProps {
  variant?: Variant
  size?: Size
  disabled?: boolean
  loading?: boolean
}
```

### 6. Query Types (`types/query.types.ts`)

TanStack Query specific types:

```typescript
export interface QueryResult<TData = unknown, TError = SupabaseError> {
  data: TData | undefined
  error: TError | null
  isLoading: boolean
  isFetching: boolean
}
```

## Validation Schemas

### Zod Integration

All form validation uses Zod schemas located in `lib/validations/`:

```typescript
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
```

### Common Patterns

```typescript
// Email validation
const emailSchema = z.string().email('Please enter a valid email address')

// Password validation with complexity requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
```

## Naming Conventions

### Type Names

- **Interfaces**: PascalCase with descriptive names
  - `AuthUser`, `ProfileFormData`, `ApiResponse`
- **Types**: PascalCase for type aliases
  - `AppRole`, `ThemeMode`, `ViewMode`
- **Enums**: PascalCase with descriptive names
  - `UserStatus`, `Priority`, `NotificationType`

### Generic Types

- Use single uppercase letters for simple generics: `T`, `K`, `V`
- Use descriptive names for complex generics: `TData`, `TError`, `TVariables`

### File Naming

- Use `.types.ts` suffix for type-only files
- Use descriptive domain names: `auth.types.ts`, `api.types.ts`

## Best Practices

### 1. Strict Type Checking

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 2. Type Guards

Use type guards for runtime type checking:

```typescript
export function isAuthUser(user: unknown): user is AuthUser {
  return typeof user === 'object' && user !== null && 'id' in user
}
```

### 3. Utility Types

Leverage TypeScript utility types:

```typescript
// Make all properties optional
type PartialProfile = Partial<Profile>

// Pick specific properties
type ProfileSummary = Pick<Profile, 'id' | 'full_name' | 'avatar_url'>

// Omit specific properties
type CreateProfile = Omit<Profile, 'id' | 'created_at' | 'updated_at'>
```

### 4. Generic Constraints

Use constraints for better type safety:

```typescript
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  create(data: Omit<T, 'id'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
}
```

### 5. Discriminated Unions

Use discriminated unions for type safety:

```typescript
type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }
```

## Component Typing

### Props Interfaces

Always define explicit props interfaces:

```typescript
interface ButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  // Component implementation
}
```

### Event Handlers

Type event handlers explicitly:

```typescript
const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  // Handle form submission
}

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value)
}
```

### Ref Types

Use proper ref types:

```typescript
const inputRef = useRef<HTMLInputElement>(null)
const buttonRef = useRef<HTMLButtonElement>(null)
```

## Hook Typing

### Custom Hooks

Type custom hooks with explicit return types:

```typescript
export function useUser(): UseUserReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  })

  return { data, isLoading, error, refetch }
}
```

### Generic Hooks

Create reusable generic hooks:

```typescript
export function useFetchData<T>(
  endpoint: string,
  options?: QueryOptions
): QueryResult<T> {
  return useQuery<T>({
    queryKey: [endpoint, options],
    queryFn: () => fetchData<T>(endpoint, options),
  })
}
```

## Error Handling

### Error Types

Define specific error types:

```typescript
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ApiError {
  message: string
  code: string
  details?: Record<string, unknown>
}
```

### Error Boundaries

Type error boundary components:

```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  // Implementation
}
```

## Testing Types

### Test Utilities

Create typed test utilities:

```typescript
export function createMockUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  }
}
```

### Mock Types

Define mock types for testing:

```typescript
export type MockedFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>

export interface MockedComponent<P = {}> {
  (props: P): JSX.Element
  mockImplementation: (fn: (props: P) => JSX.Element) => void
}
```

## Migration Guide

### From Existing Code

1. **Replace `any` types**: Identify and replace all `any` types with specific types
2. **Add return types**: Add explicit return types to functions
3. **Type event handlers**: Add proper types to event handlers
4. **Use type assertions carefully**: Replace type assertions with type guards where possible

### Gradual Adoption

1. Start with new components and hooks
2. Update existing files when making changes
3. Use `@ts-ignore` sparingly and document why
4. Add types to the most critical paths first

## Tools and Extensions

### Recommended VS Code Extensions

- TypeScript Importer
- TypeScript Hero
- Error Lens
- Auto Rename Tag

### Useful Commands

```bash
# Type checking
npx tsc --noEmit

# Generate types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

## Conclusion

This comprehensive type system provides:

- **Type Safety**: Catch errors at compile time
- **Developer Experience**: Better IntelliSense and autocomplete
- **Code Quality**: Enforced patterns and conventions
- **Maintainability**: Clear contracts between components
- **Documentation**: Types serve as living documentation

Follow these guidelines to maintain consistency and leverage the full power of TypeScript in the CateringHub project.
