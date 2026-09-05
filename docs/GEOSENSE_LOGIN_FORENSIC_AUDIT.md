# GEOSENSE LOGIN FORENSIC AUDIT

## 1. THE PROBLEM
Browser console threw the following error when attempting to login:
`api/auth/login:1 Failed to load resource: the server responded with a status of 400 (Bad Request)`

This error usually indicates a malformed payload (missing required fields like email or password), leading to the hypothesis that the frontend was incorrectly formatting the request.

## 2. FORENSIC TRACE
- **Frontend Trace (`LoginPage.tsx` & `accounts.ts`)**: Confirmed that `email` and `password` states are passed directly to `apiClient.post` without alteration.
- **Network Request (`apiClient.ts`)**: Confirmed that `apiClient` properly stringifies the payload (`JSON.stringify({ email, password })`) and sets `Content-Type: application/json`.
- **Backend Trace (`backend/routes/auth.js`)**: Traced the POST `/login` endpoint. The route correctly validates `if (!email || !password)` and returns `400`. However, it *also* returned `400` if the user was not found, OR if the password did not match (`bcrypt.compare`).

## 3. ROOT CAUSE DISCOVERY
1. The frontend payload was **100% correct**.
2. The user was typing an incorrect password for the seeded users (the password hash in `database.json` did not match common passwords like `password123` or `admin`).
3. Because the password was incorrect, `bcrypt.compare` returned `false`.
4. **The Critical Flaw**: The backend was programmed to return `res.status(400)` instead of `res.status(401)` for invalid credentials.
5. The browser correctly reported the `400 Bad Request` network response, which mistakenly led the developer to believe the request format was broken.

## 4. THE FIX
- Modified `backend/routes/auth.js` to return `401 Unauthorized` for invalid email or password.
- Updated `tests/test_login_contract.mjs` to expect `401` for incorrect passwords/unknown emails.
- Updated `tests/test_login_contract.mjs` and `tests/test_security.js` to use a fresh, known test user (`test@test.com` / `password123`) to ensure automated testing passes without mass-resetting the seed database.

## 5. VALIDATION
- Node `fetch` tests confirm `200 OK` for valid credentials and `401 Unauthorized` for invalid credentials.
- The `400` status code is now strictly reserved for malformed requests (e.g., missing email/password).
- `npm run test` (which triggers `test_security.js` and `test_login_contract.mjs`) passes successfully.