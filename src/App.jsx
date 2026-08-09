import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getBusinesses, createBusiness } from "./productService";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Catalog from "./Catalog";

function App() {
  const [session, setSession] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [cargando, setCargando] = useState(true);

  const catalogMatch = window.location.pathname.match(/^\/catalogo\/([a-zA-Z0-9-]+)/);

  useEffect(() => {
    if (catalogMatch) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setCargando(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const cargarNegocios = async () => {
    setCargando(true);
    let negocios = await getBusinesses();
    if (negocios.length === 0) {
      const nuevo = await createBusiness("Mi Tienda");
      negocios = [nuevo];
    }
    setBusinesses(negocios);
    setActiveId((prev) => (prev && negocios.some((n) => n.id === prev) ? prev : negocios[0].id));
    setCargando(false);
  };

  useEffect(() => {
    if (session && !catalogMatch) cargarNegocios();
  }, [session]);

  if (catalogMatch) {
    return <Catalog businessId={catalogMatch[1]} />;
  }

  if (cargando) return <p style={{ textAlign: "center", marginTop: 80 }}>Cargando...</p>;
  if (!session) return <Login />;

  const activeBusiness = businesses.find((b) => b.id === activeId);
  if (!activeBusiness) return <p style={{ textAlign: "center", marginTop: 80 }}>Cargando...</p>;

  return (
    <Dashboard
      businessId={activeBusiness.id}
      businessName={activeBusiness.name}
      businesses={businesses}
      onSwitchBusiness={setActiveId}
      onBusinessesChange={cargarNegocios}
    />
  );
}

export default App;
