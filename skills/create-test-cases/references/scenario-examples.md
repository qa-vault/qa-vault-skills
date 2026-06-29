# Scenario examples

Reference material for `create-test-cases`. These show what a good manual UI scenario looks like — the naming, the comprehensive UI-verifiable expected results, and the coverage spread. The **first** example is in the QA Vault draft form (the format you write into `qa-vault/`); the rest are prose illustrating expected-result richness across project types.

Two rules visible throughout:
- **Only UI-verifiable detail** in expected results — no endpoints, status codes, table names, or logs.
- **Preconditions only when non-obvious.**

---

## 1. QA Vault draft form (the target)

This is exactly how cases look in a `qa-vault/<suite>/<set>.md` draft. Folder = suite (e.g. `qa-vault/Checkout/`), file = a set (e.g. `payment.md`). `automation: not_automated` applies to all and is not repeated per block.

```
### Checkout — pay with a valid card and reach order confirmation
- Priority: high
- Behavior: positive
- Tags: checkout, payment
- Preconditions: Cart has 1+ items; a valid shipping address is entered; user is on the Payment step.
- Steps:
  1. Enter a valid card and submit → Expected: Payment is accepted; no error shown; a loading state appears while processing.
  2. Confirm the order → Expected: The order confirmation page loads showing an order number and a summary of items, totals, shipping address, and payment method (last 4 digits). A confirmation message is displayed.
  3. Check the account's email inbox → Expected: An order confirmation email arrives with the order number and the same totals shown on the confirmation page.

### Checkout — declined card shows an error and creates no order
- Priority: high
- Behavior: negative
- Tags: checkout, payment
- Preconditions: Cart has 1+ items; valid shipping address; user is on the Payment step.
- Steps:
  1. Enter a card the gateway will decline and submit → Expected: A clear "payment declined" message is shown; the card fields remain editable for retry.
  2. Observe the order state → Expected: No order confirmation appears; the user stays on the Payment step; the cart still holds the same items.

### Checkout — removing the last cart item blocks proceeding
- Priority: medium
- Behavior: destructive
- Tags: checkout, cart
- Preconditions: Cart contains exactly one item.
- Steps:
  1. Remove the only item → Expected: The cart shows an empty state.
  2. Attempt to proceed to checkout → Expected: Checkout is blocked/disabled with a message prompting the user to add items.
```

Maps onto QA Vault fields: the `###` heading → `title`; `Priority`/`Behavior`/`Tags`/`Preconditions` → the same fields; each numbered line → a `step` with `action` (before `→ Expected:`) and `expected_result` (after). `description` is a short sentence you add when transferring if the title alone isn't self-explanatory.

---

## 2. Web — registration with email verification (expected-result richness)

Title: **User registers a new account and verifies it via email**
Behavior: positive · Priority: high · Tags: authentication

Steps (abridged — note how each expected result captures everything visible to the tester):

1. Fill the registration form with a valid email and a strong password (matching confirmation), then submit → **Expected:** The password-strength indicator shows "strong"; both password fields are masked with a show/hide toggle; the Register button enables only when all fields are valid; on submit a loading spinner appears and the page navigates to a "Check your email" screen showing the registered email; the account is created but cannot sign in until verified.
2. Open the inbox and click the verification link → **Expected:** The browser opens a "Email verified" page; a countdown then redirects to login; the link cannot be reused; a success toast appears on the login page.
3. Sign in with the verified credentials → **Expected:** Login succeeds and the dashboard loads; the session persists across a browser refresh.

---

## 3. Mobile — onboarding with system permission (platform richness)

Title: **Complete onboarding and enable notifications**
Behavior: positive · Priority: high · Tags: onboarding

Notes that make a mobile scenario good: assert the **system permission dialog** (platform-specific), the **persistence across app restart**, and any **animation/looped state**.

1. Tap "Turn on notifications" and grant the permission → **Expected:** The OS notification-permission dialog appears with Allow / Don't Allow; after Allow, the dialog closes and the app navigates to the dashboard; the onboarding is marked complete.
2. Close the app fully and reopen → **Expected:** The app launches to the dashboard (not the welcome/onboarding screen); the user stays signed in; onboarding does not restart.

---

## 4. Admin — bulk action (coverage cue)

Title: **Activate multiple inactive users via bulk action**
Behavior: positive · Priority: high · Tags: user-management

Cue: for admin/table UIs, assert selection state, the confirmation modal contents, the post-action table refresh, and that the change persists after a manual page reload — all UI-visible, no backend detail.

---

## What to keep out (manual UI perspective)

Do **not** put backend-only facts in expected results — no `POST /api/...`, status codes, DB table/row assertions, queue/topic names, or server logs. Assert only what a tester can see or do through the UI: messages, element states, navigation, persisted-and-then-visible data, emails received, etc. (API/contract-level checks belong to a different layer and are out of scope for this skill.)
