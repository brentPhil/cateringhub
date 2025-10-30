# Teams Management UI - Design Audit & Implementation Plan

## 1. Existing Design Patterns Analysis

### 1.1 Page Structure Pattern

All management pages follow a consistent structure:

```tsx
<div className="space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{Title}</h1>
      <p className="text-muted-foreground">{Description}</p>
    </div>
    <div className="flex gap-2">
      {/* Action buttons */}
    </div>
  </div>

  {/* Optional: Banner/Alert */}
  
  {/* Filters */}
  <div className="flex items-center gap-4">
    {/* Combobox filters, Search inputs */}
  </div>

  {/* Main Content: DataTable or Grid */}
  
  {/* Modals/Drawers */}
</div>
```

**Examples:**
- `team/page.tsx` - Staff management (DataTable)
- `bookings/page.tsx` - Bookings management (Custom table)
- `workers/page.tsx` - Worker profiles (DataTable)
- `products/page.tsx` - Products (Grid/List view)

### 1.2 State Management Pattern

**URL State with nuqs:**
```tsx
const [filters, setFilters] = useQueryStates({
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
  role: parseAsString.withDefault(""),
  status: parseAsString.withDefault(""),
  search: parseAsString.withDefault(""),
});
```

**Used in:** `team/page.tsx`, `bookings/page.tsx`, `workers/page.tsx`

### 1.3 Modal/Drawer/Dialog Patterns

**Dialog (Modal) - Used for:**
- Quick forms (invite member, add staff)
- Confirmation dialogs
- Small data entry

**Sheet (Drawer) - Used for:**
- Editing existing items (edit role, edit worker)
- Forms with more fields
- Side panel workflows

**Pattern:**
```tsx
// Dialog for creation
<Dialog open={open} onOpenChange={setOpenChange}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    <Form>...</Form>
    <DialogFooter>...</DialogFooter>
  </DialogContent>
</Dialog>

// Sheet for editing
<Sheet open={open} onOpenChange={setOpenChange}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>...</SheetTitle>
      <SheetDescription>...</SheetDescription>
    </SheetHeader>
    <Form>...</Form>
    <SheetFooter>...</SheetFooter>
  </SheetContent>
</Sheet>
```

### 1.4 Form Patterns

**Standard Form Structure:**
```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>Optional description</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

**Validation:** Zod schemas with `zodResolver`
**Loading States:** `isSubmitting` from form state + mutation `isPending`

### 1.5 Filter Components

**Combobox (Preferred):**
```tsx
<Combobox
  options={roleOptions}
  value={filters.role || "all"}
  onValueChange={(value) =>
    setFilters({ role: value === "all" ? "" : value })
  }
  placeholder="Filter by role"
  className="w-[200px]"
/>
```

**Search Input:**
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input
    placeholder="Search..."
    value={filters.search}
    onChange={(e) => setFilters({ search: e.target.value })}
    className="pl-9"
  />
</div>
```

### 1.6 Loading & Error States

**Loading:**
```tsx
{isLoading ? (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
) : ...}
```

**Error:**
```tsx
{error ? (
  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8">
    <div className="flex flex-col items-center justify-center text-center gap-3">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div>
        <h3 className="font-semibold text-lg mb-1">Error title</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  </div>
) : ...}
```

## 2. Shadcn UI Components Inventory

### 2.1 Already Installed & Used

✅ **Dialog** - For modals
✅ **Sheet** - For drawers/side panels
✅ **Form** - Form wrapper with context
✅ **FormField, FormItem, FormLabel, FormControl, FormMessage** - Form fields
✅ **Input** - Text inputs
✅ **Textarea** - Multi-line text
✅ **Button** - Actions
✅ **Combobox** - Searchable select (PREFERRED over Select)
✅ **Select** - Basic select (use Combobox instead)
✅ **Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter** - Cards
✅ **DataTable** - Generic table with sorting, filtering, pagination
✅ **Badge** - Status indicators
✅ **Skeleton** - Loading placeholders
✅ **Alert, AlertDescription** - Alerts/banners
✅ **Tooltip** - Tooltips
✅ **Separator** - Dividers
✅ **Slider** - Range inputs (available but not used yet)
✅ **Switch** - Toggle switches
✅ **Tabs** - Tab navigation (available)

### 2.2 Component Usage Preferences

**DO USE:**
- `Combobox` for all dropdowns (better UX with search)
- `Dialog` for create/add operations
- `Sheet` for edit operations
- `DataTable` for list views
- `Card` for grid views or summary sections

**DON'T USE:**
- `Select` (use `Combobox` instead per user preference)
- Custom table implementations (use `DataTable`)

## 3. Teams Management UI Design

### 3.1 Proposed Component Hierarchy

```
app/(provider)/dashboard/teams/
├── page.tsx                          # Main teams page
├── hooks/
│   └── use-teams.ts                  # ✅ Already created
└── components/
    ├── teams-table.tsx               # DataTable wrapper with columns
    ├── team-columns.tsx              # Column definitions
    ├── create-team-dialog.tsx        # Dialog for creating teams
    ├── edit-team-drawer.tsx          # Drawer for editing teams
    ├── team-members-dialog.tsx       # Dialog to view/manage members
    └── assign-member-combobox.tsx    # Combobox for member assignment
```

### 3.2 Page Layout (teams/page.tsx)

Following the established pattern from `team/page.tsx`:

```tsx
export default function TeamsPage() {
  // State management with nuqs
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault(""),
    location: parseAsString.withDefault(""),
    search: parseAsString.withDefault(""),
  });

  // Fetch data
  const { data: teams, isLoading, error } = useTeams(providerId, filters);
  
  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage operational teams and assignments
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create team
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search teams..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>
        <Combobox
          options={locationOptions}
          value={filters.location || "all"}
          onValueChange={(value) =>
            setFilters({ location: value === "all" ? "" : value })
          }
          placeholder="Filter by location"
          className="w-[200px]"
        />
        <Combobox
          options={statusOptions}
          value={filters.status || "all"}
          onValueChange={(value) =>
            setFilters({ status: value === "all" ? "" : value })
          }
          placeholder="Filter by status"
          className="w-[200px]"
        />
      </div>

      {/* Teams Table */}
      <TeamsTable
        teams={teams}
        isLoading={isLoading}
        error={error}
        onEdit={handleEdit}
        onViewMembers={handleViewMembers}
      />

      {/* Dialogs/Drawers */}
      <CreateTeamDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <EditTeamDrawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen} team={selectedTeam} />
    </div>
  );
}
```

### 3.3 Form Components Design

**CreateTeamDialog:**
- Dialog (not Sheet) for consistency with "create" operations
- Fields: service_location_id (Combobox), name, description, daily_capacity, max_concurrent_events
- Validation with Zod schema
- Uses `useCreateTeam` hook

**EditTeamDrawer:**
- Sheet (not Dialog) for consistency with "edit" operations
- Same fields as create, plus status
- Pre-populated with team data
- Uses `useUpdateTeam` hook

**Team Assignment:**
- Inline in staff management page (team/page.tsx)
- Add "Team" column to DataTable
- Add team filter Combobox
- Add "Assign to team" action in row actions menu
- Uses `useAssignMemberToTeam` hook

## 4. Integration Points

### 4.1 Navigation (app-sidebar.tsx)

Add new navigation item:
```tsx
{
  name: "Teams",
  href: "/dashboard/teams",
  icon: Users2, // or UsersRound
  description: "Manage operational teams",
}
```

### 4.2 Staff Management Updates (team/page.tsx)

1. Add "Team" column to team-members-columns.tsx
2. Add team filter Combobox
3. Add "Assign to team" action in team-member-actions.tsx
4. Update filters state to include team filter

### 4.3 Booking Management Updates (bookings/page.tsx)

1. Add team selection to create-manual-booking-drawer.tsx
2. Add "Team" column to bookings-table.tsx
3. Add team filter to bookings filters

## 5. Implementation Checklist

### Phase 3A: Teams Management Page ✅ READY TO IMPLEMENT

- [ ] Create `teams/page.tsx` with filters and DataTable
- [ ] Create `teams/components/teams-table.tsx`
- [ ] Create `teams/components/team-columns.tsx`
- [ ] Create `teams/components/create-team-dialog.tsx`
- [ ] Create `teams/components/edit-team-drawer.tsx`
- [ ] Add navigation item to app-sidebar.tsx

### Phase 3B: Staff Management Integration

- [ ] Add "Team" column to `team/components/team-members-columns.tsx`
- [ ] Add team filter to `team/page.tsx`
- [ ] Add "Assign to team" action to `team/components/team-member-actions.tsx`

### Phase 3C: Booking Management Integration

- [ ] Add team selection to `bookings/components/create-manual-booking-drawer.tsx`
- [ ] Add "Team" column to bookings table
- [ ] Add team filter to bookings page

## 6. Key Design Decisions

1. **Use DataTable, not custom table** - Consistency with existing pages
2. **Use Combobox, not Select** - Per user preference for better UX
3. **Dialog for create, Sheet for edit** - Established pattern
4. **URL state with nuqs** - Consistent with all management pages
5. **Sentence case for labels** - EU style per user rules
6. **Compact layout** - Per user preference for information density
7. **No prop drilling** - Components use hooks directly for data fetching

## 7. Next Steps

Ready to proceed with Phase 3A implementation. All patterns are documented and aligned with existing codebase conventions.

