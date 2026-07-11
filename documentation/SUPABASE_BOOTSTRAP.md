# Supabase Project Bootstrap Guide

This guide explains how to set up and configure a new Supabase project for the Validata EDC platform. Follow these steps to build the database schema, enable user registration controls, and activate the initial administrator account.

---

## Step 1: Create a Supabase Project
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project** and select your organization.
3. Provide a **Name**, set a secure **Database Password**, and choose your hosting **Region**.
4. Wait for the database instance to provision (usually takes a minute).

---

## Step 2: Initialize the Database Schema
All database tables, constraints, triggers, helper functions, and Row-Level Security (RLS) policies are defined in a single SQL file.

1. In the Supabase Dashboard, click on **SQL Editor** in the left navigation panel.
2. Click **New Query**.
3. Open the file [supabase_setup.sql](../validata-app/supabase_setup.sql) in your local workspace and copy its entire contents.
4. Paste the SQL script into the SQL Editor.
5. Click **Run**. Verify that the query executes successfully with no errors.

---

## Step 3: Enable Email Confirmations
Validata uses a two-stage registration flow (`wait_email_confirm` → `wait_approval`). For this flow to operate correctly, Supabase must require email verification.

1. In the Supabase Dashboard, navigate to **Authentication** (the user icon) -> **Providers** -> **Email**.
2. Make sure **Enable Email Signup** is toggled ON.
3. Toggle **Confirm email** to ON.
4. Click **Save** to apply the configuration.

> [!NOTE]
> When email confirmation is enabled, a user signing up will receive a verification link. Clicking this link triggers the database hook `handle_email_confirmed()` which automatically advances their status to `wait_approval` and resets their 30-day candidate expiry window.

---

## Step 4: Register the First Account
Because the onboarding screen blocks dashboard access for pending applicants, you must register your initial account and then manually upgrade it via SQL.

1. Open the Validata login screen (either on your local environment or your hosted deployment).
2. Click **Request access** to open the registration form.
3. Fill in the **Email address** and **Password** for your primary administrator account and click **Request Access**.
4. Go to your email inbox and click the verification link sent by Supabase.

---

## Step 5: Activate the Administrator Account
By default, new registrations are assigned the `applicant` role and a blocked status. Since there are no other administrators in the database yet to approve you from the UI, you must activate the first account by running a direct database query.

1. Go back to the **SQL Editor** in the Supabase Dashboard.
2. Click **New Query**.
3. Run the following query to promote your profile to `admin` and status to `active` (replace `admin@example.com` with the email you registered in Step 4):

```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE email = 'admin@example.com';
```

4. Once the query runs successfully, return to the Validata login page, sign in with your email and password, and you will have full administrator access to the entire application and all dashboards.
