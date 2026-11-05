# KAVI homepage frontend handoff

## Scope of this branch

Homepage (`/home`), sample login (`/login`), reusable product shell and controls, general/report composer, cards, detail/branch routes, nested comment connectors and resolution UI. Light/dark desktop, tablet and mobile layouts are included. Jelajah (`/explore`) and Timeline Kinerja (`/timeline`) are included. Search supports posts, reports and accounts; the Timeline lists only closed original reports, including zero-vote automatic closures, in reverse closure order.

This branch is based on the latest backend master. Existing APIs, auth, database schema, backend utilities and backend tests are preserved. UI interactions still use the frontend demo provider; API integration is left to the backend team.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `/login` and choose a sample account. The login is explicitly a demo and does not send credentials or grant real agency permissions. Refresh resets the demo session. The homepage does not fetch backend data.

The repository now contains backend routes that initialize a database client during production build. For real backend use, configure the variables documented in `.env.example`. For isolated build validation without connecting to a service, `TURSO_DATABASE_URL=file::memory:` supplies a disposable in-memory URL; never commit real environment values.

## Folder ownership

| Folder                               | Purpose                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `app/home`, `app/login`, `app/posts` | Frontend route entry points                                                 |
| `components/ui`                      | Button, Avatar and accessible native Dialog                                 |
| `components/layout`                  | Responsive navigation, centered feed and supporting column                  |
| `features/auth`                      | Sample frontend session and in-memory state                                 |
| `features/feed`                      | Homepage tabs and feed                                                      |
| `features/posts`                     | Cards, composer, detail and nested comments                                 |
| `features/validation`                | Evidence, countdown, voting and results UI                                  |
| `types`, `mocks`                     | Frontend types and sample content                                           |
| `lib/validation.ts`                  | Pure frontend media/result validation; other lib files remain backend-owned |
| `app/globals.css`                    | Shared semantic theme tokens and responsive styles                          |

Inter is served locally under `public/fonts` with its OFL license. Existing backend scripts and configuration remain available.

All application pages use the canvas color and a shared fixed CSS viewport frame aligned to the reading column; the sticky title header covers scrolling content above the frame. Horizontal dividers sit below the composer, notification toolbar, profile tabs, discovery controls and other content toolbars, rather than below the page title. Messaging retains its two-pane layout with the same frame and canvas. Shared post cards align content, media and compact muted actions with the author name to the right of the avatar, with 44 px action targets retained on mobile.

## IDs and integration boundary

**Backend IDs and foreign keys are deliberately empty strings.** This applies to users, posts, comments and resolution fixtures and newly composed content. `localKey`, `authorKey`, `parentKey` and `agencyKeys` are separate session-only UI references, never database IDs. The UUID generated for a new item is assigned only to `localKey`. The backend team will replace these relationships and connect real IDs later. Native HTML IDs used for accessibility, anchors and comment scrolling are DOM identifiers, not database identifiers.

The React provider keeps data in memory, not localStorage. Photo previews use browser blob URLs and are not uploaded. Replacing provider operations with backend adapters should keep UI components reusable. Current frontend models are view models, not insert payloads for the database. Do not insert the demo fixtures into backend tables.

Backend integration still needs to reconcile report type, public anonymity, verified agency tags, validation submissions/history and 72-hour voting. Social UP/DOWN votes and resolution votes are separate. The backend `reports` table describes abuse reports, not civic report posts. Existing backend behavior is not rewritten by this frontend delivery.

## Checks

```sh
pnpm lint:frontend
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:frontend
pnpm format:check:frontend
```

Playwright is scoped to `frontend.spec.ts`, `discovery.spec.ts`, `profile.spec.ts` and `remaining-ui.spec.ts`; it does not run the backend test scripts or touch external databases. Existing backend tests keep their own scripts. Formatting is scoped to frontend-owned files so it does not rewrite API routes or backend utilities.

## Discovery and compact filters

`features/discovery` owns the shared Directory, SearchControls and pure filtering helpers. Filters open from a button inside the search bar as an overlay, with checkbox groups and an inclusive date range in WIB. Multiple choices use OR within each group and AND across groups. Apply commits the draft; Escape or clicking outside dismisses it without changing results. Applied filters appear as removable tokens, including @agency tokens. Reset removes filters; Hapus semua also clears the query. Account search ignores post filters and supports account preview/follow.

Searching reports matches every tagged agency, not a designated solver. Anonymous author names are excluded from post search. Explore dates refer to publication; Timeline dates refer to the latest completed validation deadline. Neither search nor Timeline creates copies of reports; cards open their original detail routes. All backend IDs remain blank and no API integration is enabled.

## Profile draft

`/profile` opens the signed-in demo user; `/profile/[profileKey]` opens another sample profile using a UI-only local key. Profiles have Postingan, Laporan, Repost and Ditandai tabs. Anonymous authored posts are omitted from public profiles; owners see a private notice on their own profile. Profile editing only updates display name, bio, region and a session-only JPG/PNG/WebP photo up to 10 MB. Username, email and roles remain backend-owned. Changes propagate through the shared demo people state and disappear on refresh. Empty follower counts are demo state, not production metrics.

## Remaining application UI

Landing remains excluded at the user's request; `/` still opens the demo login. The application now includes `/notifications`, `/messages` and `/messages/[conversationKey]`, `/settings`, `/verification`, `/agency`, `/activity`, `/signup`, `/recovery` and `/help`. Navigation and profile account links reach these views. Loading, error and not-found route UI include recovery paths. No admin dashboard is invented.

- Notifications: All/Unread, mark read/open original content, mark all read, preferences for social/report notifications.
- Messages: desktop/tablet list-and-conversation, mobile list-to-conversation/back, search recipients, new conversation and session-only sending. No delivery/read-receipt claims or real transmission.
- Settings: account/profile and recovery links, privacy information, theme preference, notification preferences, private activity, verification, help and logout.
- Verification: local form and pending-state preview, optional local PDF/image metadata. No upload, approval or role change.
- Agency inbox: Government demo accounts only, limited to reports tagging the current agency; keyword/region/category filters and Open/Closed tabs. Other users see access denied.
- Private activity: votes, replies, reposts, saved posts and resolution choices, referencing original objects.
- Auth: standalone signup and recovery/reset/expired UI, labelled as demo without sending email or changing real credentials. New demo registrations always start as USER.
- Post actions: save, hide from home, report-abuse form (local confirmation), owner takedown with confirmation. Takedown is not closure and removed posts are excluded from feed, profile, search and Timeline.

`features/workspace/state.ts` owns extra in-memory session data. All backend IDs and foreign keys remain empty strings, including conversation/message and verification records. Requests to the existing backend are not enabled by this UI delivery. Full backend authorization, verification review, message permissions/attachments/read state, legal policy, actual mail/upload and production delivery remain integration responsibilities.

The frontend suite includes `remaining-ui.spec.ts`; backend test scripts are never executed by it. Screenshot checks cover desktop 1440, tablet 834, mobile 390 and narrow 320 in light/dark.
