


import { NextRequest, NextResponse } from "next/server";
import { getConfiguredDatabaseName } from "@/lib/database-authority";

const API_BASE_URL =
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000";

function getAuthToken(req: NextRequest) {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || process.env.DB_NAME;
  const cookieNames = [
    tenantId ? `${tenantId}_auth_token` : null,
    tenantId ? `auth_token_${tenantId}` : null,
    "kalp_session",
    "auth_token",
    "admin_token",
    "access_token",
    "token",
  ].filter(Boolean) as string[];

  for (const name of cookieNames) {
    const token = req.cookies.get(name)?.value;
    if (token) return token;
  }

  for (const cookie of req.cookies.getAll()) {
    if (
      (cookie.name.endsWith("_auth_token") || cookie.name.startsWith("auth_token_")) &&
      cookie.value
    ) {
      return cookie.value;
    }
  }

  return null;
}

export async function proxyRequest(
  req: NextRequest,
  targetPath: string,
  options: { addApiPrefix?: boolean } = {},
) {
  let databaseName: string;
  try {
    databaseName = getConfiguredDatabaseName();
  } catch {
    return NextResponse.json(
      { success: false, error: "Server configuration is unavailable" },
      { status: 500 },
    );
  }

  const searchParams = req.nextUrl.searchParams.toString();
  const baseBackendUrl = options.addApiPrefix
    ? `${API_BASE_URL}/api`
    : API_BASE_URL;
  const url = `${baseBackendUrl}/${targetPath}${searchParams ? `?${searchParams}` : ""}`;

  const headers = new Headers();

  const headersToForward = [
    "authorization",
    "cookie",
    "content-type",
    "accept",
    "tenant-slug",
    "tenant_slug",
    "auth-token",
    // Required by Business Core checkout order/payment endpoints. The
    // storefront creates this key once per operation; the proxy must preserve
    // it so retries cannot duplicate orders or payment intents.
    "idempotency-key",
  ];

  headersToForward.forEach((headerName) => {
    const value = req.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  });

  if (!headers.has("authorization")) {
    const authToken = getAuthToken(req);
    if (authToken) {
      headers.set("authorization", `Bearer ${authToken}`);
      headers.set("auth-token", authToken);
    }
  }

  headers.set("x-tenant-db", databaseName);

  if (!headers.has("x-tenant-slug") && process.env.NEXT_PUBLIC_TENANT_SLUG) {
    headers.set("x-tenant-slug", process.env.NEXT_PUBLIC_TENANT_SLUG);
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers: headers,
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    try {
      const contentType = req.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const body = await req.json();
        fetchOptions.body = JSON.stringify(body);
      } else {
        fetchOptions.body = await req.blob();
      }
    } catch (e) {
      // No body or error parsing
    }
  }

  try {
    console.log(`[Proxy] ${req.method} ${req.nextUrl.pathname} -> ${url}`);
    const response = await fetch(url, fetchOptions);

    // Build the outgoing response (same body logic as before)
    let nextResponse: NextResponse;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = await response.json();
      nextResponse = NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      nextResponse = new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": contentType || "text/plain" },
      });
    }

    // ✅ Relay Set-Cookie headers from the backend to the browser.
    // getSetCookie() handles multiple cookies correctly (Node 18.17+ / Next 14+)
    const setCookies: string[] = [];
    if (typeof response.headers.getSetCookie === "function") {
      setCookies.push(...response.headers.getSetCookie());
    } else {
      const raw = response.headers.get("set-cookie");
      if (raw) {
        // Robust split: cookies can be comma separated
        const split = raw.split(/,\s*(?=[a-zA-Z0-9_\-]+=[^;]+)/);
        setCookies.push(...split);
      }
    }

    const isSecureRequest =
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https";

    try {
      setCookies.forEach((cookie) => {
        const parts = cookie.split(";").map((p) => p.trim());
        const [nameValue, ...attrParts] = parts;
        if (!nameValue) return;

        const eqIndex = nameValue.indexOf("=");
        if (eqIndex === -1) return;

        const name = nameValue.substring(0, eqIndex);
        const value = nameValue.substring(eqIndex + 1);

        const options: any = {
          path: "/",
        };

        attrParts.forEach((attr) => {
          const lowerAttr = attr.toLowerCase();
          if (lowerAttr.startsWith("max-age=")) {
            options.maxAge = parseInt(attr.substring(8), 10);
          } else if (lowerAttr.startsWith("path=")) {
            options.path = attr.substring(5);
          } else if (lowerAttr === "httponly") {
            options.httpOnly = true;
          } else if (lowerAttr === "secure") {
            options.secure = true;
          } else if (lowerAttr.startsWith("samesite=")) {
            const sameSiteValue = attr.substring(9).toLowerCase();
            if (sameSiteValue === "lax") options.sameSite = "lax";
            else if (sameSiteValue === "strict") options.sameSite = "strict";
            else if (sameSiteValue === "none") options.sameSite = "none";
          }
        });

        if (!isSecureRequest) {
          options.secure = false;
          if (options.sameSite === "none") {
            options.sameSite = "lax";
          }
        }

        nextResponse.cookies.set(name, value, options);

        const effectiveDb =
          databaseName ||
          (name.startsWith("auth_token_") ? name.replace("auth_token_", "") : "") ||
          (name.endsWith("_auth_token") ? name.replace("_auth_token", "") : "");

        if (effectiveDb && (name.includes("auth_token") || name === "auth_token")) {
          nextResponse.cookies.set(`${effectiveDb}_auth_token`, value, options);
          nextResponse.cookies.set(`auth_token_${effectiveDb}`, value, options);
        }
      });
    } catch (cookieErr) {
      console.warn("[Proxy] Cookie setting error:", cookieErr);
    }

    return nextResponse;
  } catch (error) {
    console.error(`[Proxy Error] ${url}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend service" },
      { status: 500 },
    );
  }
}
