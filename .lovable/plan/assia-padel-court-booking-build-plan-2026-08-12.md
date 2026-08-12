# Assia Padel Court Booking — Build Plan

## Goal
Replace the current dark marketing landing page with a light, boutique, mobile-first booking experience for a single outdoor padel court in a Lebanese mountain village. No backend or database — all state lives in the browser (localStorage) for bookings and simulated availability.

## Design Direction
- **Palette:** warm off-white stone background, deep charcoal text, sophisticated padel green accent, muted sand/limestone secondary tones.
- **Personality:** premium, friendly, local, Mediterranean, relaxed, trustworthy.
- **Rules:** avoid gradients, glassmorphism, floating cards, huge rounded corners, excessive shadows, generic icons, and AI-looking sports imagery. Strong typography, real photography, excellent spacing, simple layouts.

## Key Pages / Routes
1. `/` — Homepage with sliding hero gallery, quick booking, court photography, short about, facilities, location, contact/footer.
2. `/bookings` — My Bookings (upcoming / previous) stored locally.
3. `/about` — Short court story, opening hours, facilities, contact, map.

## Booking Flow (frontend only)
- Horizontal date chip selector (today + next days) on the homepage.
- Time slots grouped by Morning / Afternoon / Evening, with Available, Booked, Selected states.
- Selecting a slot opens a bottom sheet (modal on desktop) with booking summary.
- "Continue Booking" opens a simple details sheet: Full Name, Mobile Number (Lebanon-friendly), Email optional, Players selector, Notes.
- "Confirm Booking" stores the booking in localStorage and shows a success screen with reference, actions (Add to Calendar, Get Directions, Share, WhatsApp).
- Some slots are pre-seeded as "booked" to make the demo feel realistic; user bookings are appended to that list.

## Hero Gallery
- 5 generated outdoor padel court images (natural Mediterranean mountain setting, evening lighting, court details, social atmosphere).
- Auto-sliding carousel with manual swipe/drag support, subtle dot indicators, and responsive aspect ratio.
- All images uploaded via Lovable Assets so they are easy to swap later for real venue photos.

## Technical Changes
- Rewrite `src/styles.css` for the new light stone palette and custom typography (Manrope + Inter).
- Rewrite `src/routes/index.tsx` as the new homepage.
- Add `src/routes/bookings.tsx` for My Bookings.
- Add `src/routes/about.tsx` for the About / Court page.
- Update `src/routes/__root.tsx` head metadata and add a simple navigation shell if needed.
- Create localStorage booking helpers in `src/lib/bookings.ts`.
- Add utility icons inline (no extra icon dependency).

## Verification
- Run the build to ensure no errors.
- Take Playwright screenshots at 375px and 1280px to confirm the mobile-first design and the sliding hero gallery.
