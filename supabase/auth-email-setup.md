# Password reset: Supabase setup

The app code handles the reset flow. These dashboard settings make it deliver reliably.
Project: **local drop shipping gh** → Authentication.

1. **URL Configuration**
   - Site URL: `https://localdropshippinggh.com`
   - Redirect URLs (add all): `https://localdropshippinggh.com/**`, `http://localhost:3000/**`
     and your Vercel preview pattern, e.g. `https://*-your-team.vercel.app/**`.
2. **SMTP Settings → Enable Custom SMTP** (Supabase's built-in mailer only reaches your own
   team's addresses and is capped at a few emails per hour, so real users never get the link)
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password: your Resend API key
   - Sender email: an address on your verified Resend domain, e.g. `hello@localdropshippinggh.com`
   - Sender name: `Local Drop Shipping GH`
3. **Emails → Reset Password** template: set the subject and paste
   `supabase/email-templates/reset-password.html`. It links to `/reset-password?token_hash=…`,
   so email scanners that pre-open links cannot use the one-time token up.
4. **Sign In / Providers → Email**: minimum password length 8 (matches the form).
