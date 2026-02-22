# Supabase setup for Pie Guy Guide accounts

1. **Run the schema**  
   In Supabase Dashboard → **SQL Editor** → New query, paste and run the contents of `schema.sql`.  
   This creates the `profiles` table and RLS so each user can store character name, server, and LFG server URL.

2. **Discord redirect URI**  
   In Discord Developer Portal → your app → **OAuth2** → **Redirects**, add:
   ```text
   https://edmxyxwphjnspowcefkp.supabase.co/auth/v1/callback
   ```
   This is where Discord sends users after they authorize.

3. **Supabase redirect URL**  
   In Supabase Dashboard → **Authentication** → **URL Configuration**, add this to **Redirect URLs**:
   ```text
   pieguyguide://auth/callback
   ```
   Save. This lets Supabase send users back to the app after login.

4. **App config**  
   Copy `supabaseConfig.example.json` (in the project root) to `supabaseConfig.json` and set your **anon key** from Supabase Dashboard → **Settings** → **API**. The project URL is already set in the example.
