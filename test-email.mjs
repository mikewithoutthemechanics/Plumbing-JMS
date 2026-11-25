import { createClient } from "./node_modules/@supabase/supabase-js/dist/index.mjs";
const url = "https://sunjjexcyfrlucitngwx.supabase.co";
const anonKey = "sb_publishable_rrbQ_mpUhHWE0r1iUk6sPw_0ncDrW3i";
const supabase = createClient(url, anonKey);
console.log("signing in as owner...");
const { data, error } = await supabase.auth.signInWithPassword({ email: "punctualplumbers@outlook.com", password: "TempOwner123!" });
if (error) { console.error("signIn error", error); process.exit(1); }
console.log("signed in", data.user.email, data.session.access_token.substring(0,20)+"...");
const res = await fetch("https://plumbing-jms.vercel.app/api/test-email", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${data.session.access_token}` },
  body: JSON.stringify({ to: "ballitoai@gmail.com", subject: "Test email from Plumbing-JMS (live)", html: "<p>Hi Ballito Accountant,</p><p>This is a live test from Plumbing-JMS at "+new Date().toISOString()+"</p><p>If you see this, AgentMail is working via punctualplumbers@agentmail.to</p>" })
});
const txt = await res.text();
console.log("test-email status", res.status, txt);
