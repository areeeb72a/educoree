import { createClient as originalCreateClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

const PROTECTED_SCHOOL_ID = "cf5bf57e-8f19-49c6-bbfd-77010a939866";
const OWNER_PROFILE_ID = "7fc45439-0e2d-4150-80a7-da2219fa9c4a";

export function createClient(supabaseUrl: string, supabaseKey: string, options?: any) {
  const client = originalCreateClient(supabaseUrl, supabaseKey, options);

  // Wrap the client in a Proxy to intercept calls to "from"
  const clientProxy = new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) => {
          const builder = target.from(table);
          return wrapQueryBuilder(builder, table);
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });

  return clientProxy;
}

function wrapQueryBuilder(builder: any, tableName: string): any {
  const methodsToIntercept = ["insert", "update", "upsert", "delete"];

  const builderProxy = new Proxy(builder, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && methodsToIntercept.includes(prop)) {
        return (...args: any[]) => {
          // Check if edit is allowed on the client
          if (typeof window !== "undefined") {
            const isAllowed = (window as any).__userAllowedToEdit;
            if (isAllowed === false) {
              // Fail fast and raise a user-friendly error
              throw new Error(
                "🔒 Protection Mode Active: Fatima Zahra Academy is a read-only demonstration school. To test write operations (creating, editing, deleting, marking attendance, entering marks), please create your own school or branch and test there."
              );
            }
          }

          const nextBuilder = target[prop](...args);
          return wrapQueryBuilder(nextBuilder, tableName);
        };
      }

      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function") {
        return (...args: any[]) => {
          const res = val.apply(target, args);
          // If the returned value is another query builder (for chaining like .eq(), .in(), etc.), wrap it too!
          if (res && typeof res === "object") {
            return wrapQueryBuilder(res, tableName);
          }
          return res;
        };
      }
      return val;
    }
  });

  return builderProxy;
}
