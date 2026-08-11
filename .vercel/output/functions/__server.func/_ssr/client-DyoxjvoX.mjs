import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client-DyoxjvoX.js
function createSupabaseClient() {
	return createClient("https://broeqkpkbtxdtrvdbqkh.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb2Vxa3BrYnR4ZHRydmRicWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTE5NTQsImV4cCI6MjA5Njc2Nzk1NH0.y8Zbepr63fhXvQ568fxPrAUBmhADZPCzImPSVaqhj9c", { auth: {
		storage: typeof window !== "undefined" ? localStorage : void 0,
		persistSession: true,
		autoRefreshToken: true
	} });
}
var _supabase;
var supabase = new Proxy({}, { get(_, prop, receiver) {
	if (!_supabase) _supabase = createSupabaseClient();
	return Reflect.get(_supabase, prop, receiver);
} });
//#endregion
export { supabase as t };
