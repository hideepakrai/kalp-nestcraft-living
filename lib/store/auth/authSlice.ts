import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  getUserThunk,
  loginThunk,
  logoutThunk,
  signupThunk,
  updateProfileThunk,
} from "./authThunks";
import { ProductFormState } from "../products/productsSlices";

export type Address = {
  _id?: string;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
  id?: string;
  email?: string;
};

export type AddInProfile = Address & {
  label: string;
};

interface User {
  password?: string;
  role?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  id?: string;
  _id?: string;
  addresses?: Address[];
  name?: string;
  wishlist?: string[];
  isTenantOwner?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      //  if(action.payload.user.role === "tenant_admin"){
      //   state.isAuthenticated = true;
      //  } else {
      //   state.isAuthenticated = false;
      //  }
      state.isAuthenticated = true;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: any) => {
        state.user = action.payload.user;

        state.isAuthenticated = true;

        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getUserThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserThunk.fulfilled, (state, action: any) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(getUserThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logoutThunk.fulfilled, (state, action: any) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(signupThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action: any) => {
        state.user = action.payload.session || action.payload.customer || action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setCredentials, logout, setLoading, setError } =
  authSlice.actions;
export default authSlice.reducer;
