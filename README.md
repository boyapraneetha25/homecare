# HomeCare

HomeCare is a React home-services booking app built with Vite, Bootstrap, Firebase Authentication, and Firebase Realtime Database. It includes a local demo mode when Firebase credentials are not configured.

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm install
npm run dev
```

The Vite server prints the local URL after it starts.

## Deploy to GitHub Pages

The `main` branch is built and deployed automatically by `.github/workflows/deploy.yml`. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**. The site will be available at `https://boyapraneetha25.github.io/homecare/` after the workflow completes.

The Firebase web configuration is included as a workflow default; repository Actions variables under **Settings → Secrets and variables → Actions → Variables** can override it for another environment. Firebase web config is public in a browser app, so enforce access with Realtime Database rules. Add `boyapraneetha25.github.io` to Firebase Authentication's authorized domains for Google sign-in.

## Firebase setup

1. Create a Firebase project and register a web app.
2. Enable the Google provider under Authentication → Sign-in method, create a Realtime Database, and add your app domain under Authentication → Settings → Authorized domains.
3. Copy `.env.example` to `.env.local` and fill in the web app configuration values.
4. Set `VITE_ADMIN_EMAILS=praneethaboya2005@gmail.com` for the admin dashboard allowlist.
5. After that account registers, promote its `/users/{uid}` profile to `role: "admin"` in Realtime Database through Firebase Console or a trusted Admin SDK. New registrations are always customers.
6. Publish `database.rules.json` in Firebase Console under **Realtime Database → Rules**, or deploy it from this project directory with `firebase login` followed by `firebase deploy --only database` (requires the Firebase CLI). `.firebaserc` selects the `homecare-70522` project.

`database.rules.json` protects the Realtime Database and is configured in `firebase.json`. The app reads and writes `/users/{uid}`, `/services/{serviceId}`, `/providers/{providerId}`, `/bookings/{bookingId}`, `/reviews/{reviewId}`, and `/payments/{paymentId}`. The verified Firebase Auth address `praneethaboya2005@gmail.com` is explicitly allowed as an admin in the rules; other admins must be promoted by setting `/users/{uid}/role` to `admin` in the Firebase Console or with a trusted Admin SDK. The email list controls the admin interface only; database rules remain the security boundary.

## Realtime Database paths

- `users`: Authentication profile, display name, email, role, and creation timestamp. Passwords are handled by Firebase Authentication and are never stored in Realtime Database.
- `services`: Service name, description, starting price, icon, image path, rating, and active catalog information.
- `providers`: Professional name, specialties, rating, completed-job count, and profile presentation data.
- `bookings`: Customer UID/contact snapshot, service snapshot, requested date/time, address, notes, status, and timestamps.
- `reviews`: Customer UID/name, service, rating, written review, and timestamp.
- `payments`: Booking ID, customer UID, amount, payment method, status, and timestamp. The starter records a pending “pay after service” payment; it does not process card payments.

When Firebase is configured, the app seeds the services, providers, and reviews paths once if they are empty. Google sign-in creates a customer profile on first use. The configured admin email is recognized by the app UI; promote its profile in Realtime Database for admin data access. Without Firebase configuration, Google sign-in is unavailable.