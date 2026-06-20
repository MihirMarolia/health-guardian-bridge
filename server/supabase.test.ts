import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Connection', () => {
  it('should initialize Supabase client with valid credentials', async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    // Check that environment variables are set
    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(supabaseAnonKey?.length).toBeGreaterThan(20);

    // Create client
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    expect(supabase).toBeDefined();

    // Test connection by querying users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    // Should either get data or a permission error (not a connection error)
    if (error) {
      // RLS might block this, but connection should work
      expect(error.message).not.toContain('connection');
      expect(error.message).not.toContain('ECONNREFUSED');
    } else {
      expect(Array.isArray(data)).toBe(true);
    }
  });
});
