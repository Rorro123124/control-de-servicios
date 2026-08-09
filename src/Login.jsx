import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState("entrar"); // "entrar" o "registrar"
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    try {
      if (modo === "registrar") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMensaje("Cuenta creada. Ya puedes iniciar sesión.");
        setModo("entrar");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMensaje("Error: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: 320, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2>{modo === "entrar" ? "Iniciar sesión" : "Crear cuenta"}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 8 }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 8 }}
        />
        <button type="submit" disabled={cargando} style={{ padding: 10 }}>
          {cargando ? "Cargando..." : modo === "entrar" ? "Entrar" : "Registrarme"}
        </button>
      </form>

      {mensaje && <p style={{ color: "crimson", fontSize: 13 }}>{mensaje}</p>}

      <button
        onClick={() => setModo(modo === "entrar" ? "registrar" : "entrar")}
        style={{ marginTop: 12, background: "none", border: "none", color: "blue", cursor: "pointer" }}
      >
        {modo === "entrar" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </div>
  );
}
