import { createClient } from "./node_modules/@supabase/supabase-js/dist/index.mjs";
const url = "https://sunjjexcyfrlucitngwx.supabase.co";
const anonKey = "sb_publishable_rrbQ_mpUhHWE0r1iUk6sPw_0ncDrW3i";
const supabase = createClient(url, anonKey);
const { data, error } = await supabase.auth.signInWithPassword({ email: "punctualplumbers@outlook.com", password: "TempOwner123!" });
if (error) { console.error(error); process.exit(1); }
console.log("user id", data.user.id);
const { data: profile, error: e2 } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
console.log("profile", profile, e2);
const res = await fetch("https://plumbing-jms.vercel.app/api/test-email", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${data.session.access_token}` },
  body: JSON.stringify({ to: "ballitoai@gmail.com" })
});
console.log("test-email", res.status, await res.text());
