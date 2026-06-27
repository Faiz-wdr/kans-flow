console.log("Environment variables keys:");
Object.keys(process.env).forEach(key => {
  if (key.toLowerCase().includes('supabase') || key.toLowerCase().includes('db') || key.toLowerCase().includes('pass') || key.toLowerCase().includes('conn')) {
    console.log(`- ${key}: ${process.env[key] ? 'DEFINED (length ' + process.env[key].length + ')' : 'UNDEFINED'}`);
    if (key.toLowerCase().includes('pass') && !key.toLowerCase().includes('key')) {
      console.log(`  Value: ${process.env[key]}`);
    }
  } else {
    console.log(`- ${key}`);
  }
});
