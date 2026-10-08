# Activate the first PyLearn Pro administrator

The admin console does not allow a learner to promote themselves. To activate the current account once, use the Supabase Dashboard's SQL Editor after migration `006_admin_console_access.sql` has been applied.

Replace the email placeholder below with the exact email used to sign in to PyLearn Pro, then run the statement:

```sql
UPDATE public.profiles AS profile
SET role = 'admin', updated_at = now()
FROM auth.users AS auth_user
WHERE auth_user.id = profile.id
  AND lower(auth_user.email) = lower('cokoth95@gmail.com')
  AND profile.role IN ('student', 'instructor')
RETURNING profile.id, profile.full_name, profile.role;
```

Check that one row returns and that its role is `admin`. Then sign out and sign back in to refresh the session and open `/admin`.

This one-time action uses the dashboard's database administrator session. Do not add the SQL Editor database password or a Supabase service-role key to the browser app.
