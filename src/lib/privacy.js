import { supabase } from "./supabase";

export async function requestDataDeletion({ accountType, businessName } = {}) {
  const { data, error } = await supabase.functions.invoke("request-data-deletion", {
    body: { accountType, businessName },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}