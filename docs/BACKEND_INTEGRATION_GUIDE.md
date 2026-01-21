# Backend Integration Guide

This guide covers how to add a backend server to the MentorMatch app, migrating from local-only storage (AsyncStorage) to a cloud-based API.

---

## Table of Contents

1. [Backend Options](#backend-options)
2. [Recommended Approach](#recommended-approach)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [API Design](#api-design)
5. [Frontend Integration](#frontend-integration)
6. [Migration Strategy](#migration-strategy)
7. [Testing](#testing)
8. [Deployment](#deployment)

---

## Backend Options

### Option 1: Backend-as-a-Service (BaaS) - **RECOMMENDED FOR MVP**

**Pros**:
- Fastest to implement (hours to days)
- Built-in authentication
- Real-time capabilities
- Automatic scaling
- Free tiers available

**Options**:
- **Firebase** (Google) - Most popular, comprehensive
- **Supabase** - Open source Firebase alternative, PostgreSQL
- **AWS Amplify** - AWS ecosystem integration
- **Appwrite** - Open source, self-hostable

**Best For**: MVP, rapid prototyping, small to medium apps

---

### Option 2: Custom Backend (Node.js/Express)

**Pros**:
- Full control
- Custom business logic
- No vendor lock-in
- Can optimize for your needs

**Cons**:
- More time to implement (weeks)
- Need to handle auth, database, deployment
- More maintenance

**Best For**: Production apps with specific requirements

---

### Option 3: Serverless Functions

**Pros**:
- Pay per use
- Auto-scaling
- No server management

**Options**:
- **Vercel Functions**
- **AWS Lambda**
- **Netlify Functions**

**Best For**: Simple APIs, event-driven architectures

---

## Recommended Approach

**For MentorMatch MVP**: Use **Supabase** or **Firebase**

**Why**:
1. ✅ Built-in authentication (email/password, OAuth)
2. ✅ Real-time database
3. ✅ File storage (for future profile pictures)
4. ✅ Free tier sufficient for MVP
5. ✅ Easy to migrate to custom backend later
6. ✅ Good React Native/Expo support

---

## Step-by-Step Implementation

### Phase 1: Set Up Supabase (Recommended)

#### Step 1.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - Project name: `mentormatch`
   - Database password: (save this!)
   - Region: Choose closest to your users
5. Wait for project to be created (~2 minutes)

#### Step 1.2: Get API Credentials

1. Go to Project Settings → API
2. Copy:
   - `Project URL` (e.g., `https://xxxxx.supabase.co`)
   - `anon` `public` key
   - `service_role` key (keep secret!)

#### Step 1.3: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

#### Step 1.4: Create Database Schema

In Supabase Dashboard → SQL Editor, run:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expertise TEXT NOT NULL,
  interest TEXT NOT NULL,
  expertise_years INTEGER NOT NULL CHECK (expertise_years >= 0 AND expertise_years <= 100),
  interest_years INTEGER NOT NULL CHECK (interest_years >= 0 AND interest_years <= 100),
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Mentorship requests table
CREATE TABLE public.mentorship_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  response_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, mentor_id, status) -- Prevent duplicate pending requests
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for mentorship requests
CREATE POLICY "Users can view requests they sent or received"
  ON public.mentorship_requests FOR SELECT
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = mentor_id
  );

CREATE POLICY "Users can create requests"
  ON public.mentorship_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Mentors can update requests they received"
  ON public.mentorship_requests FOR UPDATE
  USING (auth.uid() = mentor_id);
```

---

### Phase 2: Create API Service Layer

#### Step 2.1: Create Supabase Client

Create `services/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### Step 2.2: Create Auth Service

Create `services/authService.ts`:

```typescript
import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

export interface SignUpData {
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export async function signUp({ email, password }: SignUpData) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    return { user: data.user, session: data.session };
  } catch (error) {
    logger.error('Sign up error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Failed to create account. Please try again.');
    throw error;
  }
}

/**
 * Sign in existing user
 */
export async function signIn({ email, password }: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { user: data.user, session: data.session };
  } catch (error) {
    logger.error('Sign in error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Invalid email or password.');
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    logger.error('Sign out error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    logger.error('Get session error', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    logger.error('Get current user error', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
```

#### Step 2.3: Create Profile API Service

Create `services/profileApiService.ts`:

```typescript
import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { Profile } from '../types/types';

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    if (!data) return null;

    // Map database fields to Profile interface
    return {
      name: data.name,
      expertise: data.expertise,
      interest: data.interest,
      expertiseYears: data.expertise_years,
      interestYears: data.interest_years,
      email: data.email,
      phoneNumber: data.phone_number,
    };
  } catch (error) {
    logger.error('Get current profile error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Failed to load profile.');
    return null;
  }
}

/**
 * Create or update profile
 */
export async function saveProfile(profile: Profile): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const profileData = {
      user_id: user.id,
      name: profile.name,
      expertise: profile.expertise,
      interest: profile.interest,
      expertise_years: profile.expertiseYears,
      interest_years: profile.interestYears,
      email: profile.email,
      phone_number: profile.phoneNumber,
      updated_at: new Date().toISOString(),
    };

    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      // Create new profile
      const { error } = await supabase
        .from('profiles')
        .insert(profileData);

      if (error) throw error;
    }
  } catch (error) {
    logger.error('Save profile error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Failed to save profile.');
    throw error;
  }
}

/**
 * Get all profiles (for discover page)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all profiles except current user's
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id);

    if (error) throw error;

    // Map database fields to Profile interface
    return (data || []).map((item) => ({
      name: item.name,
      expertise: item.expertise,
      interest: item.interest,
      expertiseYears: item.expertise_years,
      interestYears: item.interest_years,
      email: item.email,
      phoneNumber: item.phone_number,
    }));
  } catch (error) {
    logger.error('Get all profiles error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Failed to load profiles.');
    return [];
  }
}

/**
 * Get profile by email
 */
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      name: data.name,
      expertise: data.expertise,
      interest: data.interest,
      expertiseYears: data.expertise_years,
      interestYears: data.interest_years,
      email: data.email,
      phoneNumber: data.phone_number,
    };
  } catch (error) {
    logger.error('Get profile by email error', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
```

#### Step 2.4: Create Request API Service

Create `services/requestApiService.ts`:

```typescript
import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { MentorshipRequest } from '../types/types';

/**
 * Send mentorship request
 */
export async function sendMentorshipRequest(
  mentorEmail: string,
  note?: string
): Promise<MentorshipRequest> {
  try {
    const { data: { user: requester } } = await supabase.auth.getUser();
    if (!requester) throw new Error('User not authenticated');

    // Get mentor's user ID from their email
    const { data: mentorProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', mentorEmail)
      .single();

    if (!mentorProfile) throw new Error('Mentor not found');

    const { data, error } = await supabase
      .from('mentorship_requests')
      .insert({
        requester_id: requester.id,
        mentor_id: mentorProfile.user_id,
        note: note || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch full request with user details
    return await getRequestById(data.id);
  } catch (error) {
    logger.error('Send request error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Failed to send request.');
    throw error;
  }
}

/**
 * Get request by ID
 */
async function getRequestById(id: string): Promise<MentorshipRequest> {
  const { data, error } = await supabase
    .from('mentorship_requests')
    .select(`
      *,
      requester:users!mentorship_requests_requester_id_fkey(email),
      mentor:users!mentorship_requests_mentor_id_fkey(email)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  return mapRequestFromDb(data);
}

/**
 * Get all requests for current user
 */
export async function getUserRequests(): Promise<{
  incoming: MentorshipRequest[];
  outgoing: MentorshipRequest[];
  processed: MentorshipRequest[];
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { incoming: [], outgoing: [], processed: [] };

    // Get requests where user is mentor (incoming)
    const { data: incomingData, error: incomingError } = await supabase
      .from('mentorship_requests')
      .select(`
        *,
        requester:users!mentorship_requests_requester_id_fkey(email)
      `)
      .eq('mentor_id', user.id)
      .order('created_at', { ascending: false });

    if (incomingError) throw incomingError;

    // Get requests where user is requester (outgoing)
    const { data: outgoingData, error: outgoingError } = await supabase
      .from('mentorship_requests')
      .select(`
        *,
        mentor:users!mentorship_requests_mentor_id_fkey(email)
      `)
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (outgoingError) throw outgoingError;

    const incoming = (incomingData || [])
      .filter((r) => r.status === 'pending')
      .map(mapRequestFromDb);
    
    const outgoing = (outgoingData || [])
      .filter((r) => r.status === 'pending')
      .map(mapRequestFromDb);
    
    const processed = [
      ...(incomingData || []),
      ...(outgoingData || []),
    ]
      .filter((r) => r.status !== 'pending')
      .map(mapRequestFromDb)
      .sort((a, b) => 
        new Date(b.respondedAt || b.createdAt).getTime() - 
        new Date(a.respondedAt || a.createdAt).getTime()
      );

    return { incoming, outgoing, processed };
  } catch (error) {
    logger.error('Get user requests error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Failed to load requests.');
    return { incoming: [], outgoing: [], processed: [] };
  }
}

/**
 * Respond to mentorship request
 */
export async function respondToRequest(
  requestId: string,
  status: 'accepted' | 'declined',
  responseNote?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('mentorship_requests')
      .update({
        status,
        response_note: responseNote || null,
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('mentor_id', user.id); // Ensure user is the mentor

    if (error) throw error;
  } catch (error) {
    logger.error('Respond to request error', error instanceof Error ? error : new Error(String(error)));
    ErrorHandler.handleError(error, 'Failed to respond to request.');
    throw error;
  }
}

/**
 * Map database request to MentorshipRequest interface
 */
function mapRequestFromDb(data: any): MentorshipRequest {
  return {
    id: data.id,
    requesterEmail: data.requester?.email || '',
    requesterName: '', // Would need to join with profiles table
    mentorEmail: data.mentor?.email || '',
    mentorName: '', // Would need to join with profiles table
    note: data.note || '',
    status: data.status,
    responseNote: data.response_note || undefined,
    createdAt: data.created_at,
    respondedAt: data.responded_at || undefined,
  };
}
```

---

### Phase 3: Update Frontend to Use API

#### Step 3.1: Update Environment Configuration

Add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "YOUR_SUPABASE_URL",
      "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
    }
  }
}
```

Or use `.env` file (requires `expo-constants`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

#### Step 3.2: Update Signup Screen

Replace `app/signup.tsx` auth logic:

```typescript
// OLD:
import { createUser, setCurrentUser } from '@/utils/userManagement';

// NEW:
import { signUp } from '@/services/authService';
import { saveProfile } from '@/services/profileApiService';

// In handleSignup:
const { user, session } = await signUp({ email: sanitizedEmail, password });
// Session is automatically managed by Supabase
```

#### Step 3.3: Update Login Screen

Replace `app/login.tsx` auth logic:

```typescript
// OLD:
import { authenticateUser, setCurrentUser } from '@/utils/userManagement';

// NEW:
import { signIn } from '@/services/authService';

// In handleLogin:
const { user, session } = await signIn({ email: sanitizedEmail, password });
// Session is automatically managed by Supabase
```

#### Step 3.4: Update Profile Service

Replace `services/profileService.ts` to use API:

```typescript
// Add fallback to API
import { getCurrentProfile as getCurrentProfileApi } from './profileApiService';
import { getCurrentProfile as getCurrentProfileLocal } from './profileService';

export async function getCurrentProfile(): Promise<Profile | null> {
  // Try API first, fallback to local
  try {
    const apiProfile = await getCurrentProfileApi();
    if (apiProfile) return apiProfile;
  } catch (error) {
    logger.warn('API unavailable, using local storage', error);
  }
  
  return await getCurrentProfileLocal();
}
```

---

## Migration Strategy

### Option A: Gradual Migration (Recommended)

1. **Phase 1**: Keep AsyncStorage, add API calls in parallel
2. **Phase 2**: Sync data: write to both AsyncStorage and API
3. **Phase 3**: Read from API first, fallback to AsyncStorage
4. **Phase 4**: Remove AsyncStorage, use API only

### Option B: Big Bang Migration

1. Implement all API services
2. Update all screens to use API
3. Remove AsyncStorage code
4. Test thoroughly

**Recommendation**: Use Option A for safer migration

---

## Alternative: Custom Node.js/Express Backend

If you prefer a custom backend, here's a basic structure:

### Backend Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── profiles.ts
│   │   └── requests.ts
│   ├── controllers/
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── models/
│   ├── services/
│   └── app.ts
├── package.json
└── tsconfig.json
```

### Basic Express Server Example

```typescript
// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profiles';
import requestRoutes from './routes/requests';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/requests', requestRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Testing

### Test API Locally

1. **Start Supabase locally** (optional):
   ```bash
   npx supabase start
   ```

2. **Test endpoints**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

### Test Frontend Integration

1. Update `app.json` with local Supabase URL
2. Run app: `npm start`
3. Test signup/login flows
4. Verify data syncs to Supabase dashboard

---

## Deployment

### Supabase Deployment

1. **Already deployed** - Supabase handles hosting
2. **Just update environment variables** in your app

### Custom Backend Deployment

**Options**:
- **Railway** - Easy deployment, free tier
- **Render** - Simple, free tier
- **Heroku** - Popular, paid
- **AWS EC2** - More control, more setup
- **DigitalOcean** - Good balance

**Steps**:
1. Push code to GitHub
2. Connect to hosting platform
3. Set environment variables
4. Deploy
5. Update app with production API URL

---

## Next Steps

1. **Choose backend solution** (Supabase recommended for MVP)
2. **Set up Supabase project** (15 minutes)
3. **Create database schema** (30 minutes)
4. **Implement API services** (2-4 hours)
5. **Update frontend** (4-6 hours)
6. **Test thoroughly** (2-4 hours)
7. **Deploy** (30 minutes)

**Total Estimated Time**: 1-2 days for MVP backend integration

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Firebase Docs](https://firebase.google.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

## Support

If you need help implementing any part of this guide, I can:
1. Generate specific code for your chosen backend
2. Help with database schema design
3. Assist with migration strategy
4. Debug integration issues
