import { createAsyncThunk } from "@reduxjs/toolkit";

const tenantHeader = process.env.NEXT_PUBLIC_TENANT_ID;
const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || "nestcraft";

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials: any, { rejectWithValue }) => {
    try {
      const payload = {
        tenant_slug: tenantSlug,
        ...credentials,
      };

      const response: any = await fetch(`/api/auth/customer/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-db": tenantHeader || "kp_nestcraft",
          "x-tenant-slug": tenantSlug,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.detail || data.message || "Authentication failed");
      }

      const dbName =
        data.dbname ||
        data.db_name ||
        data.dbName ||
        data.tenant_db ||
        data.session?.dbname ||
        data.session?.db_name ||
        data.session?.tenant_id ||
        tenantHeader ||
        "kp_nestcraft";

      if (typeof document !== "undefined" && data.access_token) {
        const maxAge = 60 * 60 * 24 * 30;
        document.cookie = `${dbName}_auth_token=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `auth_token_${dbName}=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `auth_token=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      return {
        status: response.status,
        user: data.session || data.customer,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred");
    }
  },
);

export const getUserThunk = createAsyncThunk(
  "auth/getUser",
  async (_, { rejectWithValue }) => {
    try {
      const response: any = await fetch(`/api/auth/customer/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-db": tenantHeader || "kp_nestcraft",
          "x-tenant-slug": tenantSlug,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.detail || data.message || "Authentication failed");
      }
      return {
        status: response.status,
        user: data.session || data.customer || data,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred");
    }
  },
);

export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      if (typeof document !== "undefined") {
        const dbName = tenantHeader || "kp_nestcraft";
        document.cookie = `${dbName}_auth_token=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `auth_token_${dbName}=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `auth_token=; path=/; max-age=0; SameSite=Lax`;
      }

      const response: any = await fetch(`/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-db": tenantHeader || "kp_nestcraft",
          "x-tenant-slug": tenantSlug,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.detail || data.message || "Authentication failed");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred");
    }
  },
);

export const signupThunk = createAsyncThunk(
  "auth/signup",
  async (userData: any, { rejectWithValue }) => {
    try {
      const payload = {
        tenant_slug: tenantSlug,
        ...userData,
      };

      const response = await fetch(`/api/auth/customer/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-db": tenantHeader || "kp_nestcraft",
          "x-tenant-slug": tenantSlug,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.detail || data.message || "Registration failed");
      }

      const dbName =
        data.dbname ||
        data.db_name ||
        data.dbName ||
        data.tenant_db ||
        data.session?.dbname ||
        data.session?.db_name ||
        data.session?.tenant_id ||
        tenantHeader ||
        "kp_nestcraft";

      if (typeof document !== "undefined" && data.access_token) {
        const maxAge = 60 * 60 * 24 * 30;
        document.cookie = `${dbName}_auth_token=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `auth_token_${dbName}=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `auth_token=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unexpected error occurred during registration",
      );
    }
  },
);

export const updateProfileThunk = createAsyncThunk(
  "auth/updateProfile",
  async (
    {
      userData,
    }: {
      userData: any;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/auth/customer/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-db": tenantHeader || "kp_nestcraft",
          "x-tenant-slug": tenantSlug,
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.detail || data.message || "Profile update failed");
      }

      return data.session || data.customer || data;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred");
    }
  },
);
