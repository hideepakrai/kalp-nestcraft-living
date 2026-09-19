import { cache } from "react";

function serialize(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export const getAuthUser = cache(async (token: string) => {
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  try {
    let res = await fetch(`${API_URL}/auth/customer/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-db": tenantId || "",
        "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "nestcraft",
      } as HeadersInit,
    });

    if (!res.ok) {
      res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-db": tenantId || "",
          "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "nestcraft",
        } as HeadersInit,
      });
    }

    const data = await res.json();
    return serialize(data?.session ?? data?.user ?? data?.data?.session ?? data?.data?.user ?? data);
  } catch (error) {
    console.error("Error fetching auth user:", error);
    return null;
  }
});
