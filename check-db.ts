import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: buckets, error: err } = await supabase.storage.listBuckets();
  console.log("Buckets existentes:", buckets);
  if (err) {
    console.error("Error al listar buckets:", err);
    return;
  }

  console.log("Intentando subida de prueba a 'exercises'...");
  const dummyBuffer = Buffer.from("hello world");
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('exercises')
    .upload('test_folder/test.txt', dummyBuffer, {
      contentType: 'text/plain',
      upsert: true
    });

  if (uploadError) {
    console.error("Error en la subida de prueba:", uploadError);
  } else {
    console.log("Subida de prueba exitosa! Datos:", uploadData);
    // Intentar obtener URL pública
    const { data: urlData } = supabase.storage
      .from('exercises')
      .getPublicUrl('test_folder/test.txt');
    console.log("URL pública:", urlData.publicUrl);
  }
}
check();
