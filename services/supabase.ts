import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtxwgkiiwibgfnpfkckx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0eHdna2lpd2liZ2ZucGZrY2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTIwNDgsImV4cCI6MjA3NzU4ODA0OH0.rnn1yVA9FstwhbVXlMsj3bOv5gC2NXwinwQFdh7BF5o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
