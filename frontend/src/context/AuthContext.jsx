import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orgUser, setOrgUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setUser(null);
        setOrgUser(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("organization_users") // ✅ FIXED
        .select("org_id, role, status")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();

      setUser(session.user);
      if (error) {
        console.error("Org user fetch failed:", error);
        setOrgUser(null);
      } else {
        setOrgUser(data);
      }

      setLoading(false);
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      mounted = false;
      if (listener?.subscription) {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, orgUser, loading }}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
