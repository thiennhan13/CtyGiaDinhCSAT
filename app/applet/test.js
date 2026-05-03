const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const client = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cls } = await client.from('classes').select('*').limit(1);
  const { data: std } = await client.from('students').select('*').limit(1);
  console.log('Classes columns:', cls ? Object.keys(cls[0] || {}) : 'no data');
  console.log('Students columns:', std ? Object.keys(std[0] || {}) : 'no data');
}
run();
