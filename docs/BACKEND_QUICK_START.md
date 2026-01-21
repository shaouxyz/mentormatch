# Backend Quick Start Guide - Supabase

This is a condensed guide to get you started quickly with Supabase backend integration.

---

## Step 1: Create Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Fill in project details
4. Wait for project creation (~2 minutes)
5. Go to Settings → API
6. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key**

---

## Step 2: Install Dependencies (1 minute)

```bash
npm install @supabase/supabase-js
```

---

## Step 3: Set Up Environment Variables

Create `.env` file in project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Add `.env` to `.gitignore` to keep keys secret!

---

## Step 4: Create Database Schema

In Supabase Dashboard → SQL Editor, paste and run:

```sql
-- Profiles table
CREATE TABLE public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  expertise TEXT NOT NULL,
  interest TEXT NOT NULL,
  expertise_years INTEGER NOT NULL CHECK (expertise_years >= 0 AND expertise_years <= 100),
  interest_years INTEGER NOT NULL CHECK (interest_years >= 0 AND interest_years <= 100),
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentorship requests table
CREATE TABLE public.mentorship_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  response_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, mentor_id) WHERE status = 'pending'
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for requests
CREATE POLICY "Users can view requests they sent or received"
  ON public.mentorship_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = mentor_id);

CREATE POLICY "Users can create requests"
  ON public.mentorship_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Mentors can update requests they received"
  ON public.mentorship_requests FOR UPDATE
  USING (auth.uid() = mentor_id);
```

---

## Step 5: Create Supabase Client

Create `services/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
                   process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
                       process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## Step 6: Update Signup Screen

In `app/signup.tsx`, replace the signup logic:

```typescript
import { supabase } from '@/services/supabaseClient';

// In handleSignup function:
const { data, error } = await supabase.auth.signUp({
  email: sanitizedEmail,
  password: password,
});

if (error) {
  ErrorHandler.handleError(error, error.message);
  return;
}

// User is automatically signed in after signup
router.replace('/profile/create');
```

---

## Step 7: Update Login Screen

In `app/login.tsx`, replace the login logic:

```typescript
import { supabase } from '@/services/supabaseClient';

// In handleLogin function:
const { data, error } = await supabase.auth.signInWithPassword({
  email: sanitizedEmail,
  password: password,
});

if (error) {
  ErrorHandler.handleError(error, 'Invalid email or password.');
  return;
}

// Check if profile exists
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', data.user.id)
  .single();

if (profile) {
  router.replace('/(tabs)/home');
} else {
  router.replace('/profile/create');
}
```

---

## Step 8: Update Profile Creation

In `app/profile/create.tsx`, replace save logic:

```typescript
import { supabase } from '@/services/supabaseClient';

// In handleSave function:
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('User not authenticated');

const { error } = await supabase
  .from('profiles')
  .insert({
    user_id: user.id,
    name: profile.name,
    expertise: profile.expertise,
    interest: profile.interest,
    expertise_years: profile.expertiseYears,
    interest_years: profile.interestYears,
    email: profile.email,
    phone_number: profile.phoneNumber,
  });

if (error) {
  ErrorHandler.handleError(error, 'Failed to save profile.');
  return;
}

Alert.alert('Success', 'Profile created successfully!', [
  { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
]);
```

---

## Step 9: Update Home Screen (Discover)

In `app/(tabs)/home.tsx`, replace profile loading:

```typescript
import { supabase } from '@/services/supabaseClient';

// In loadProfiles function:
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;

// Get all profiles except current user
const { data: profilesData, error } = await supabase
  .from('profiles')
  .select('*')
  .neq('user_id', user.id);

if (error) {
  logger.error('Error loading profiles', error);
  return;
}

// Map to Profile interface
const profiles: Profile[] = (profilesData || []).map((p) => ({
  name: p.name,
  expertise: p.expertise,
  interest: p.interest,
  expertiseYears: p.expertise_years,
  interestYears: p.interest_years,
  email: p.email,
  phoneNumber: p.phone_number,
}));

setProfiles(profiles);
```

---

## Step 10: Test It!

1. Start the app: `npm start`
2. Sign up with a new account
3. Create a profile
4. Check Supabase Dashboard → Table Editor → `profiles` to see your data!

---

## Common Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Solution**: Make sure `.env` file exists with correct variable names

### Issue: "Row Level Security policy violation"
**Solution**: Check that RLS policies are created correctly in SQL Editor

### Issue: "User not authenticated"
**Solution**: Make sure user is signed in before making API calls

### Issue: "Network request failed"
**Solution**: Check Supabase URL is correct, check internet connection

---

## Next Steps

1. ✅ Test basic signup/login/profile creation
2. Implement mentorship requests API
3. Add offline support (cache API responses)
4. Add error retry logic
5. Migrate remaining screens to use API

---

## Need Help?

See the full guide: `docs/BACKEND_INTEGRATION_GUIDE.md`
