# HomeCare

HomeCare is a React home-services booking app built with Vite, Bootstrap, Firebase Authentication, and Cloud Firestore. It includes a local demo mode when Firebase credentials are not configured.

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm install
npm run dev
```

The Vite server prints the local URL after it starts.

## Firebase setup

1. Create a Firebase project and register a web app.
2. Enable the Google provider under Authentication → Sign-in method, create a Cloud Firestore database, and add your app domain under Authentication → Settings → Authorized domains.
3. Copy `.env.example` to `.env.local` and fill in the web app configuration values.
4. Set `VITE_ADMIN_EMAILS=praneethaboya2005@gmail.com` for the admin dashboard allowlist.
5. After that account registers, promote its `/users/{uid}` profile to `role: "admin"` in the database you use, through Firebase Console or a trusted Admin SDK. The current app adapter uses Firestore; `database.rules.json` checks the corresponding Realtime Database path. New registrations are always customers.
6. Publish the rules in `firestore.rules` from Firebase Console under **Firestore Database → Rules**, or deploy them from this project directory with `firebase login` followed by `firebase deploy --only firestore:rules` (requires the Firebase CLI). `.firebaserc` selects the `homecare-70522` project.

`firestore.rules` protects Cloud Firestore. `database.rules.json` protects Realtime Database and is configured in `firebase.json`; publish it with `firebase deploy --only database` or paste its `rules` object into Realtime Database → Rules in Firebase Console. The rules expect data under `/users/{uid}`, `/services/{serviceId}`, `/providers/{providerId}`, `/bookings/{bookingId}`, `/reviews/{reviewId}`, and `/payments/{paymentId}`. The verified Firebase Auth address `praneethaboya2005@gmail.com` is explicitly allowed as an admin in the RTDB rules; other admins must be promoted by setting `/users/{uid}/role` to `admin` in the Firebase Console or with a trusted Admin SDK.

Important: the current app data adapter still calls Cloud Firestore. Deploying Realtime Database rules will not switch the app's reads and writes to RTDB; the adapter must be migrated before the app uses these paths. Do not rely on these RTDB rules to secure Firestore, or vice versa.

The administrator profile must be promoted in Firestore by a trusted project owner. The email list controls the admin interface only; Firestore rules remain the security boundary.

## Firestore collections

- `users`: Authentication profile, display name, email, role, and creation timestamp. Passwords are handled by Firebase Authentication and are never stored in Firestore.
- `services`: Service name, description, starting price, icon, image path, rating, and active catalog information.
- `providers`: Professional name, specialties, rating, completed-job count, and profile presentation data.
- `bookings`: Customer UID/contact snapshot, service snapshot, requested date/time, address, notes, status, and timestamps.
- `reviews`: Customer UID/name, service, rating, written review, and timestamp.
- `payments`: Booking ID, customer UID, amount, payment method, status, and timestamp. The starter records a pending “pay after service” payment; it does not process card payments.

When Firebase is configured, the app seeds the service, provider, and review collections once if they are empty. Google sign-in creates a customer profile on first use. The configured admin email is recognized by the app UI; promote its profile in the active database for admin data access. Without Firebase configuration, Google sign-in is unavailable.