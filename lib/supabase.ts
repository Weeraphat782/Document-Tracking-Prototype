import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Database helper functions
export class SupabaseService {
  
  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('documents').select('count').limit(1)
      return !error
    } catch (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
  }

  // Check if tables exist and create them if they don't
  static async initializeTables(): Promise<void> {
    try {
      // Test if documents table exists
      const { error } = await supabase.from('documents').select('id').limit(1)
      
      if (error && error.message.includes('relation "documents" does not exist')) {
        console.log('Documents table does not exist. Please run the SQL schema in your Supabase dashboard.')
        throw new Error('Database tables not initialized. Please run the SQL schema.')
      }
    } catch (error) {
      console.error('Error initializing tables:', error)
      throw error
    }
  }
} 