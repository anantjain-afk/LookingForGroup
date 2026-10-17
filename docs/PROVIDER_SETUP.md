# Email and voice provider setup

Keep secret values in the ignored `server/.env` file locally and in the existing Render service's Environment settings for production. Never put them in a `VITE_` variable, commit them, or paste them into a support message. Redeploy Render after changing production environment values.

## Brevo verification and password reset

1. Create a free [Brevo account](https://www.brevo.com/).
2. Open Settings → Senders, Domains & Dedicated IPs → Senders. Add the From name and an email address you own. Complete the emailed verification code. If you own a domain, follow Brevo's domain authentication instructions; a free mailbox sender can have deliverability/From-address limitations.
3. Open SMTP & API → API Keys → Generate a new API key. Name it `LFG transactional email`. Copy it immediately. The app uses Brevo's HTTPS API; an SMTP key will not work.
4. Set these values locally and on Render:

   ```env
   BREVO_API_KEY=your_api_key
   MAIL_FROM_EMAIL=the_exact_verified_sender_address
   MAIL_FROM_NAME=LFG
   PUBLIC_APP_URL=https://looking-for-group.vercel.app
   ```

5. Keep the free plan and avoid enabling paid features or automatic purchases. In the app, register a test password account, open the verification email, then request a password reset. Check both Gmail and Outlook inboxes and spam folders. Brevo's Transactional Email logs show delivery/rejection status.

Official guides: [sender verification](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [API keys](https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-API-keys).

## Metered / Open Relay TURN

1. Sign up from [Open Relay](https://www.metered.ca/tools/openrelay/) and choose the free TURN service. Its published allowance is 20 GB/month; check the current dashboard limits before launch. Do not enable automatic top-ups, paid upgrades, or paid overages.
2. Select/create an app, open TURN Server, and generate a TURN credential. Copy the REST API key shown in its `.../api/v1/turn/credentials?apiKey=...` example. This is the credential retrieval key, not a Realtime Messaging publishable key or an account management secret.
3. Copy the app name from `https://YOUR_APP_NAME.metered.live`. Enter only `YOUR_APP_NAME`, without the protocol or suffix.
4. Set locally and on Render:

   ```env
   METERED_APP_NAME=your_app_name
   METERED_API_KEY=your_turn_credential_api_key
   ```

5. Create credentials ahead of testing: new TURN credentials can take time to propagate. Where the free account supports expiry, choose an expiry and rotate before it ends; update Render and allow propagation before revoking the old credential. The app fetches existing credentials, caches them for one minute, and sends ICE credentials only to authenticated lobby members. It does not mint per-user expiring credentials automatically. Browsers necessarily receive relay usernames/passwords, so monitor the usage cap and rotate credentials if abused.
6. Join a lobby in two browsers on different networks and explicitly click Join voice in each. For a QA build set `VITE_FORCE_TURN=true`, rebuild the frontend, and verify the selected candidate pair is `relay` in browser WebRTC diagnostics. Remove the flag after testing. Check two-way audio, mute, leaving voice, and reconnecting. Denying microphone permission or relay failure should leave text chat usable.

Official API: [retrieve TURN credentials](https://www.metered.ca/docs/turn-rest-api/get-credential/). The app never sends the Metered REST API key to the frontend.

## Google sign-in

The supplied Web OAuth client ID is configured on the backend. Authorized JavaScript origins must include `http://localhost:5173` and `https://looking-for-group.vercel.app` (already confirmed). This uses the Google Identity Services popup and server verification of its ID token: no client secret or backend redirect URI is required. If the consent screen is in testing, add your test Google accounts or publish the consent configuration when ready. Test both a new Google account and an existing password account's explicit Connect Google action.
