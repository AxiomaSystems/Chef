# Page Memory

The web app uses lightweight client-side page memory so navbar pages feel like
tabs instead of full resets every time the user switches sections.

## Storage

Page memory is stored in `sessionStorage`, so it lasts for the current browser
tab and clears naturally when the tab is closed.

There are two memory shapes:

- `chef:page-memory:<route>` stores view state for a route.
- `chef:page-memory:last-location:<route>` stores the last location inside a
  navbar route group.

Examples:

- `/recipes` can remember `/recipes/:id` or `/recipes/preparation/:id`.
- `/carts` can remember `/carts/:id`, `/shopping`, or `/shopping/checkout/:id`.
- `/inventory` remembers search, category, expanded filters, selected item, and
  scroll position.

## Behavior

When a user navigates inside an active route group, `AppNavLink` stores the
current path as that group's last location.

When a user switches back to a navbar item from another section, `AppNavLink`
checks for a remembered last location and routes there instead of always using
the group root.

When a user taps the active navbar item again, the app treats that as an
intentional refresh:

- clears the route group's last location
- clears the route group's page memory
- dispatches the page-memory reset event
- scrolls to the top
- refreshes the current root route or navigates back to the root route

## Flowcharts

### Recording The Current Location

```txt
User is inside a navbar route group
Example: /recipes/preparation/recipe-123
        |
        v
AppNavLink sees the route group is active
        |
        v
Write current path to sessionStorage
        |
        v
chef:page-memory:last-location:/recipes
  -> /recipes/preparation/recipe-123
```

### Switching Back To A Navbar Section

```txt
User taps a navbar item from another section
Example: taps Recipes while on Inventory
        |
        v
AppNavLink checks last-location memory
        |
        |-- remembered location exists and still belongs to group?
        |        |
        |        v
        |     Navigate to remembered location
        |     Example: /recipes/preparation/recipe-123
        |
        |-- no remembered location
                 |
                 v
              Navigate to group root
              Example: /recipes
```

### Reclicking The Active Navbar Item

```txt
User is already inside the navbar group
Example: /recipes/preparation/recipe-123
        |
        v
User taps Recipes again
        |
        v
AppNavLink treats it as an intentional reset
        |
        v
Clear last-location memory
Clear route page memory
Dispatch page-memory reset event
Scroll to top
        |
        v
Navigate to /recipes or refresh if already on /recipes
```

### Route-Specific View Memory

```txt
Route client component uses usePageMemory(...)
        |
        v
On mount:
  read chef:page-memory:<route>
        |
        v
During interaction:
  write safe view state back to sessionStorage
        |
        v
On active-nav reset event:
  clear memory and restore initial state
```

## What To Remember

Remember view/session state that is cheap, current, and safe to restore:

- selected tab
- search and filters
- selected item id
- scroll position
- active recipe route
- active prep step
- checked prep ingredients
- whether hands-free mode should reopen
- hands-free setup context

Do not remember live or risky workflow state:

- microphone streams
- audio/WebSocket sessions
- file uploads
- in-flight AI requests
- unsaved destructive actions
- checkout submissions
- half-submitted forms

Hands-free memory is intentionally a restore hint, not a preserved live audio
session. Returning to a remembered hands-free recipe can reopen the hands-free
surface with the previous setup context, but the browser must create a fresh
audio/session connection.

## Implementation Points

- `apps/web/src/lib/page-memory.ts` owns storage helpers and `usePageMemory`.
- `apps/web/src/components/layout/app-nav-link.tsx` owns navbar route-group
  memory and active-item reset behavior.
- Route-specific client components decide which local UI state is safe to
  persist.
