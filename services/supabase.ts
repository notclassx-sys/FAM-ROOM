
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://abhjlnzupemzmjdxmpmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiaGpsbnp1cGVtem1qZHhtcG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTA5NzIsImV4cCI6MjA4MjQyNjk3Mn0.3IyqVziF4dPTFygY4752mWjRb8ZFryO4q4ascxK8cVw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
