# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be ready (usually takes 1-2 minutes)

## 2. Get Your Supabase Credentials

1. Go to your project dashboard
2. Click on "Settings" in the sidebar
3. Click on "API" 
4. Copy the following values:
   - **Project URL** (something like `https://your-project-ref.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## 3. Set Up Environment Variables

Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with your actual Supabase credentials.

## 4. Run the Database Schema

1. In your Supabase dashboard, go to the "SQL Editor"
2. Copy the entire contents of `supabase-schema.sql`
3. Paste it into the SQL Editor
4. Click "Run" to create all the tables, functions, and demo data

## 5. Verify Setup

After running the schema, you should see:
- `documents` table
- `users` table  
- Demo users (admin@company.com, mail@company.com, etc.)
- Database functions and triggers

## 6. Test the Integration

The app will automatically detect if Supabase is configured and switch from localStorage to database storage.

## Security Notes

- The anon key is safe to use in client-side code
- Row Level Security (RLS) is enabled for additional protection
- In production, you may want to implement more restrictive RLS policies 