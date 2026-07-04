import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiGet } from "../api/client";

const SchemaContext = createContext(null);

export function SchemaProvider({ children }) {
  const [schema, setSchema] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet("/dataset/schema");
      setSchema(data);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SchemaContext.Provider value={{ schema, connected, loading, refresh }}>
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchema() {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error("useSchema must be used within SchemaProvider");
  return ctx;
}
