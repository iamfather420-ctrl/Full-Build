# SolveX Platform TODO

## Database & Backend
- [x] Database schema: problems, solutions, escrow_transactions, crawled_problems, categories
- [x] Backend router: problems (CRUD, list, filter, categorize)
- [x] Backend router: solutions (submit, list, status)
- [x] Backend router: escrow (deposit, release, refund, createPaymentIntent)
- [x] Backend router: crawler (trigger scan, list crawled problems, import)
- [x] Backend router: verification (AI verify solution)
- [x] Backend router: notifications (list, mark read)
- [x] Backend router: earnings (owner stats, payout history)

## Frontend Pages
- [x] Global layout with top navigation (public-facing)
- [x] Landing page with hero, features, stats, CTA
- [x] Problem marketplace page (browse, filter by category, search)
- [x] Problem detail page (description, payment offer, deadline, submission history)
- [x] Post a problem page (client form with payment deposit)
- [x] Solver dashboard (owner only: available problems, submit solution, earnings)
- [x] Client portal (track problems, view solutions, manage payments)
- [x] Notifications panel

## Integrations
- [x] Stripe integration for escrow payments
- [x] AI web crawler (Reddit, Quora, Stack Overflow, Hacker News)
- [x] AI solution verification system
- [x] Owner notification system for new problems
- [x] Client notification for solution status updates
- [x] Payment release workflow after AI verification

## Polish
- [x] Elegant dark premium design with gold/amber accents
- [x] Responsive design (mobile-first)
- [x] Loading states, empty states, error states
- [x] Problem categorization with icons
- [x] Earnings chart for solver dashboard

## Tests
- [x] Auth logout test (session cookie clearing)
- [x] Auth me test (authenticated and unauthenticated)
- [x] Admin access control tests (crawler, solutions, verification, earnings)
- [x] Public access tests (problems list, stats)
- [x] Protected access tests (myProblems, notifications)
- [x] Input validation tests (title, description, payment offer)

## Bidding & Counter-Offer System
- [ ] Offers table in database schema
- [ ] Offers backend router (create, list, accept, reject, counter)
- [ ] Offers component for Problem Detail page
- [ ] Offer history and negotiation flow UI
- [ ] Tests for offers CRUD and access control
