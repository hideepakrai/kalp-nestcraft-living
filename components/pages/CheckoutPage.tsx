
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import {
  selectCartItems,
  selectCartTotal,
} from "@/lib/store/cart/cartSlice";
import { clearCartAsync } from "@/lib/store/cart/cartThunk";
import { RootState } from "@/lib/store/store";
import {
  ChevronLeft,
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Wallet,
  Plus,
  Check,
  LogIn,
  User,
  Phone,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  LogOut,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getGateway } from "@/lib/paymentgateway/resgistry";
import {
  createCheckoutOrder,
  createCheckoutPaymentIntent,
  createCheckoutQuote,
  toCheckoutAddress,
} from "@/lib/commerce/checkout-client";
import { loginThunk, signupThunk, logoutThunk } from "@/lib/store/auth/authThunks";

const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

const CheckoutPage = () => {
  const regions = {
    India: "IN",
    US: "US",
    UK: "UK",
    Canada: "CA",
  };
  const cart = useAppSelector(selectCartItems);
  const cartTotal = useAppSelector(selectCartTotal);
  const { businessBlueprint, isLoading } = useAppSelector(
    (state: RootState) => state.businessBlueprint,
  );


  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isBillingDifferent, setIsBillingDifferent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">(
    "online",
  );
  const [selectedGateway, setSelectedGateway] = useState<string>("");
  const [shippingData, setShippingData] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const checkoutQuote = useRef<any | null>(null);
  const orderIdempotencyKey = useRef<string | null>(null);
  const paymentIdempotencyKey = useRef<string | null>(null);
  const { user, isAuthenticated } = useAppSelector((state: RootState) => state.auth);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<
    string | null
  >(null);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<
    string | null
  >(null);
  const dispatch = useAppDispatch();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  // Coupon / Promotion State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const commerce = businessBlueprint?.payload?.commerce;

  const shippingRegions = commerce?.shippingRegions;
  const paymentProviders = commerce?.paymentProviders;
  const enabledGateways =
    paymentProviders?.gateways?.filter((g: any) => g.enabled) || [];

  useEffect(() => {
    if (enabledGateways.length > 0 && !selectedGateway) {
      setSelectedGateway(enabledGateways[0].id);
    }
  }, [enabledGateways, selectedGateway]);

  // If no gateways are enabled at all, online payment is impossible —
  // fall back to COD automatically.
  useEffect(() => {
    if (enabledGateways.length === 0 && paymentMethod === "online") {
      setPaymentMethod("cod");
    }
  }, [enabledGateways.length, paymentMethod]);

  const currenciesTaxes = commerce?.currenciesTaxes;
  const checkoutPolicies = commerce?.checkoutPolicies;

  const taxes = currenciesTaxes?.tax;

  const shippingThings = shippingRegions;

  // Taxing Rule Code
  const [manualShippingCountry, setManualShippingCountry] =
    useState<keyof typeof regions>("India");

  const rawCountry = selectedShippingAddressId
    ? user?.addresses?.find((a: any) => a.id === selectedShippingAddressId)
        ?.country
    : manualShippingCountry;
  const countrySelected = (
    rawCountry && rawCountry in regions ? rawCountry : "India"
  ) as keyof typeof regions;

  const taxingRule = countrySelected
    ? taxes?.taxRules?.filter(
        (rule: any) => rule.region === regions[countrySelected],
      )
    : null;

  const amoutTaxable =
    taxingRule?.reduce((acc: number, rule: any) => {
      if (rule.inclusive) {
        return acc + 0;
      } else {
        return acc + rule.rate;
      }
    }, 0) || 0;

  const totalTax =
    Math.max(0, cartTotal - discountAmount) * (amoutTaxable! / 100);

  // "============================================"

  // Shipping Rule
  const shippingRule = countrySelected
    ? shippingThings?.zones?.find((zone: any) =>
        zone.regions.includes(regions[countrySelected]),
      )
    : null;

  const shippingCost = shippingThings?.freeShipping
    ? cartTotal >= shippingThings.freeShipping.threshold
      ? 0
      : shippingRule?.flatRate || 0
    : 0;
  // "============================================"

  // Single source of truth for the order total (used in summary + payload)
  const orderTotal = Math.max(
    0,
    cartTotal - discountAmount + (totalTax || 0) + (shippingCost || 0),
  );

  const handleCheckoutLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsSigningIn(true);

    try {
      await dispatch(
        loginThunk({ email: loginEmail.trim(), password: loginPassword }),
      ).unwrap();
      setLoginPassword("");
    } catch (error: any) {
      setLoginError(
        typeof error === "string"
          ? error
          : error?.detail || error?.message || "We could not sign you in. Check your details and try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCheckoutSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupError(null);
    setIsSigningUp(true);

    try {
      await dispatch(
        signupThunk({
          firstName: signupFirstName.trim(),
          lastName: signupLastName.trim(),
          email: signupEmail.trim(),
          phone: signupPhone.trim() || undefined,
          password: signupPassword,
        }),
      ).unwrap();
      setSignupPassword("");
    } catch (error: any) {
      setSignupError(
        typeof error === "string"
          ? error
          : error?.detail || error?.message || "Registration failed. Please check your details and try again.",
      );
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleCheckoutLogout = async () => {
    await dispatch(logoutThunk()).unwrap().catch(() => {});
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }

    if (code === "WELCOME10") {
      const discount = Math.round(cartTotal * 0.1);
      setDiscountAmount(discount);
      setAppliedCoupon(code);
      setCouponSuccess("Coupon 'WELCOME10' applied successfully! (10% Off)");
    } else if (code === "NEST50") {
      const discount = Math.min(500, cartTotal);
      setDiscountAmount(discount);
      setAppliedCoupon(code);
      setCouponSuccess("Coupon 'NEST50' applied successfully! (Flat ₹500 Off)");
    } else {
      setCouponError("Invalid coupon code. Try 'WELCOME10' or 'NEST50'");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponSuccess(null);
    setCouponError(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getItemImage = (item: any) => {
    if (item.selectedVariant?.image) return item.selectedVariant.image;
    if (item.selectedVariant?.imageId && item.gallery) {
      const vImg = item.gallery.find((d: any) => d.id === item.selectedVariant.imageId);
      if (vImg?.url) return vImg.url;
    }
    const primaryImg = item.gallery?.find((d: any) => d.id === item.primaryImageId);
    if (primaryImg?.url) return primaryImg.url;
    if (item.gallery && item.gallery.length > 0) return item.gallery[0].url;
    return "/assets/Image/Sofa.jpg";
  };

  const handlePlaceOrder = async () => {
    setOrderError(null);
    setIsProcessing(true);

    // COD if user picked COD, OR there is no usable gateway selected.
    const isCOD = paymentMethod === "cod" || !selectedGateway;

    try {
      const shippingAddress = toCheckoutAddress(shippingData || {}, regions);
      const billingAddress = toCheckoutAddress(
        billingData || shippingData || {},
        regions,
      );
      const quote = checkoutQuote.current ||
        await createCheckoutQuote({
          tenantId,
          email: shippingData?.email || user?.email || "",
          shippingAddress,
          billingAddress,
          couponCode: appliedCoupon || undefined,
        });
      checkoutQuote.current = quote;
      orderIdempotencyKey.current ||= `nestcraft-order-${crypto.randomUUID()}`;
      const order = await createCheckoutOrder({
        tenantId,
        quoteId: quote.id,
        quoteChecksum: quote.checksum,
        paymentMethod: isCOD ? "cod" : selectedGateway,
        idempotencyKey: orderIdempotencyKey.current,
      });

      // 2. COD: we're done — no gateway, no verification.
      if (isCOD) {
        setIsCompleted(true);
        checkoutQuote.current = null;
        orderIdempotencyKey.current = null;
        await dispatch(clearCartAsync()).catch(() => {});
        return;
      }

      // 3. Online: initiate payment via the selected gateway
      const gatewayConfig = enabledGateways.find(
        (gw: any) => gw.id === selectedGateway,
      );
      if (!gatewayConfig) {
        throw new Error(
          "Selected payment gateway is no longer available. Please go back and choose another method.",
        );
      }

      const gateway = getGateway(selectedGateway);

      paymentIdempotencyKey.current ||= `nestcraft-payment-${crypto.randomUUID()}`;
      const paymentIntent = await createCheckoutPaymentIntent({
        tenantId,
        orderId: order.id,
        provider: selectedGateway,
        idempotencyKey: paymentIdempotencyKey.current,
      });
      const paymentpayload = {
        amount: paymentIntent.amountMinor,
        currency: paymentIntent.currency,
        orderId: paymentIntent.gatewayOrderId,
        customerEmail: shippingData?.email,
        customerName:
          `${shippingData?.firstName ?? ""} ${shippingData?.lastName ?? ""}`.trim(),
      };

      const result = await gateway.initiatePayment(
        paymentpayload,
        String(paymentIntent.publicKey),
        `${shippingData?.addressLine1 ?? ""} ${shippingData?.addressLine2 ?? ""}`.trim(),
      );
      if (!result.transactionId) throw new Error("Payment was not completed.");

      setIsCompleted(true);
      checkoutQuote.current = null;
      orderIdempotencyKey.current = null;
      paymentIdempotencyKey.current = null;
      await dispatch(clearCartAsync()).catch(() => {});
    } catch (err: any) {
      console.error("Order placement failed:", err);
      setOrderError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) {
      const formData = new FormData(e.currentTarget);

      let ship;
      if (selectedShippingAddressId) {
        const addr = user?.addresses?.find(
          (a: any) => a.id === selectedShippingAddressId,
        );
        if (addr) {
          ship = {
            firstName: addr.firstName,
            lastName: addr.lastName,
            phone: addr.phone,
            email: addr.email || user?.email || "",
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zipCode,
            country: addr.country,
          };
        }
      } else {
        ship = {
          firstName: formData.get("shippingFirstName"),
          lastName: formData.get("shippingLastName"),
          phone: formData.get("shippingPhone"),
          email: formData.get("shippingEmail") || user?.email || "",
          addressLine1: formData.get("shippingAddressLine1"),
          addressLine2: formData.get("shippingAddressLine2"),
          city: formData.get("shippingCity"),
          state: formData.get("shippingState"),
          zipCode: formData.get("shippingZipCode"),
          country: formData.get("shippingCountry"),
        };
      }
      setShippingData(ship);

      if (isBillingDifferent) {
        let bill;
        if (selectedBillingAddressId) {
          const addr = user?.addresses?.find(
            (a: any) => a.id === selectedBillingAddressId,
          );
          if (addr) {
            bill = {
              firstName: addr.firstName,
              lastName: addr.lastName,
              phone: addr.phone,
              email: addr.email || user?.email || "",
              addressLine1: addr.addressLine1,
              addressLine2: addr.addressLine2,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode,
              country: addr.country,
            };
          }
        } else {
          bill = {
            firstName: formData.get("billingFirstName"),
            lastName: formData.get("billingLastName"),
            phone: formData.get("billingPhone"),
            email: formData.get("billingEmail") || user?.email || "",
            addressLine1: formData.get("billingAddressLine1"),
            addressLine2: formData.get("billingAddressLine2"),
            city: formData.get("billingCity"),
            state: formData.get("billingState"),
            zipCode: formData.get("billingZipCode"),
            country: formData.get("billingCountry"),
          };
        }
        setBillingData(bill);
      } else {
        setBillingData(ship);
      }
      setStep(2);
    } else if (step === 2) {
      checkoutQuote.current = null;
      orderIdempotencyKey.current = null;
      paymentIdempotencyKey.current = null;
      setStep(3);
    } else {
      await handlePlaceOrder();
    }
  };

  const renderAddressForm = (prefix: "shipping" | "billing") => {
    const data = prefix === "shipping" ? shippingData : billingData;
    const selectedId =
      prefix === "shipping"
        ? selectedShippingAddressId
        : selectedBillingAddressId;
    const setSelectedId =
      prefix === "shipping"
        ? setSelectedShippingAddressId
        : setSelectedBillingAddressId;

    const savedAddresses = user?.addresses || [];
    const selectedAddress = savedAddresses.find(
      (a: any) => a.id === selectedId,
    );

    return (
      <div className="flex flex-col gap-6">
        {/* Saved Addresses Selection */}
        {savedAddresses.length > 0 && (
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-[2px] text-muted ml-1">
              Select Saved Address
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedAddresses.map((address: any) => (
                <div
                  key={address.id}
                  onClick={() => setSelectedId(address.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedId === address.id
                      ? "border-secondary bg-primary/5"
                      : "border-border bg-surface hover:border-primary/30"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider">
                        {address.label}
                      </p>
                      <p className="text-xs font-semibold mt-1">
                        {address.firstName} {address.lastName}
                      </p>
                      <p className="text-[10px] text-muted font-semibold line-clamp-1">
                        {address.addressLine1}, {address.city}
                      </p>
                    </div>
                    {selectedId === address.id && (
                      <div className="w-5 h-5 bg-secondary text-white rounded-full flex items-center justify-center">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div
                onClick={() => setSelectedId(null)}
                className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  selectedId === null
                    ? "border-secondary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Plus size={16} className="text-muted" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  New Address
                </span>
              </div>
            </div>
          </div>
        )}

        {selectedAddress ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-surface border-2 border-secondary/20 space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <MapPin size={40} />
            </div>
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-black uppercase tracking-wider text-secondary">
                Selected: {selectedAddress.label}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-colors"
              >
                Change
              </button>
            </div>
            <div className="space-y-1">
              <p className="font-bold">
                {selectedAddress.firstName} {selectedAddress.lastName}
              </p>
              <p className="text-sm font-semibold text-muted">
                {selectedAddress.addressLine1}
              </p>
              {selectedAddress.addressLine2 && (
                <p className="text-sm font-semibold text-muted">
                  {selectedAddress.addressLine2}
                </p>
              )}
              <p className="text-sm font-semibold text-muted">
                {selectedAddress.city}, {selectedAddress.state}{" "}
                {selectedAddress.zipCode}
              </p>
              <p className="text-sm font-semibold text-muted">
                {selectedAddress.country}
              </p>
              {selectedAddress.email && (
                <p className="text-sm font-semibold text-muted">
                  {selectedAddress.email}
                </p>
              )}
              <p className="text-sm font-bold text-secondary pt-1">
                {selectedAddress.phone}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                  First Name *
                </label>
                <input
                  required
                  type="text"
                  defaultValue={data?.firstName || user?.first_name || (user?.name ? user.name.split(" ")[0] : "") || ""}
                  name={`${prefix}FirstName`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                  Last Name *
                </label>
                <input
                  required
                  type="text"
                  defaultValue={data?.lastName || user?.last_name || (user?.name ? user.name.split(" ").slice(1).join(" ") : "") || ""}
                  name={`${prefix}LastName`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  defaultValue={data?.email || user?.email || ""}
                  name={`${prefix}Email`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                  Phone *
                </label>
                <input
                  required
                  type="tel"
                  defaultValue={data?.phone || user?.phone || ""}
                  name={`${prefix}Phone`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                Address Line 1 *
              </label>
              <input
                required
                type="text"
                defaultValue={data?.addressLine1 || data?.address1 || ""}
                name={`${prefix}AddressLine1`}
                className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                Address Line 2
              </label>
              <input
                type="text"
                defaultValue={data?.addressLine2 || data?.address2 || ""}
                name={`${prefix}AddressLine2`}
                className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                  City *
                </label>
                <input
                  required
                  type="text"
                  defaultValue={data?.city || ""}
                  name={`${prefix}City`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                  State *
                </label>
                <input
                  required
                  type="text"
                  defaultValue={data?.state || ""}
                  name={`${prefix}State`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                  Zip Code *
                </label>
                <input
                  required
                  type="text"
                  defaultValue={data?.zipCode || data?.pincode || ""}
                  name={`${prefix}ZipCode`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                Country *
              </label>
              <div className="relative">
                <select
                  required
                  value={
                    prefix === "shipping" ? manualShippingCountry : undefined
                  }
                  defaultValue={
                    prefix === "shipping" ? undefined : data?.country || "India"
                  }
                  onChange={(e) => {
                    if (prefix === "shipping") {
                      setManualShippingCountry(
                        e.target.value as keyof typeof regions,
                      );
                    }
                  }}
                  name={`${prefix}Country`}
                  className="w-full h-14 px-6 rounded-xl bg-surface border border-border outline-none focus:border-secondary transition-all font-semibold appearance-none cursor-pointer"
                >
                  {Object.keys(regions).map((countryName) => (
                    <option
                      key={countryName}
                      value={countryName}
                      className="bg-surface text-foreground"
                    >
                      {countryName}
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isCompleted) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-[5%] text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            Order Confirmed!
          </h1>
          <p className="text-muted font-semibold mb-10">
            Thank you for your purchase. Your order has been placed and is being
            processed. We've sent a confirmation email to your inbox.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-primary text-white px-10 h-14 rounded-full text-[15px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-12 px-[5%] max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-12">
        <Link
          href="/cart"
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-surface transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-[42px] font-bold tracking-tight">Checkout</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-16 items-start">
        {/* Checkout Form */}
        <div className="space-y-12">
          {!isAuthenticated ? (
            <div className="rounded-3xl border border-border bg-surface/80 p-8 sm:p-10 shadow-sm space-y-8 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-bold shrink-0">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      Customer Authentication
                    </h2>
                    <p className="text-sm text-muted mt-1">
                      Please sign in or create an account to proceed with your delivery details and payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-2xl bg-background p-1.5 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setLoginError(null);
                    setSignupError(null);
                  }}
                  className={`flex-1 py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    authMode === "login"
                      ? "bg-secondary text-white shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <LogIn size={18} />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setLoginError(null);
                    setSignupError(null);
                  }}
                  className={`flex-1 py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    authMode === "signup"
                      ? "bg-secondary text-white shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <UserPlus size={18} />
                  Create Account
                </button>
              </div>

              {/* Sign In Form */}
              {authMode === "login" && (
                <form onSubmit={handleCheckoutLogin} className="space-y-5">
                  {loginError && (
                    <div className="p-4 flex items-center gap-3 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                      Email Address *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-secondary transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full h-14 pl-12 pr-4 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                      Password *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-secondary transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-14 pl-12 pr-12 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full h-14 bg-secondary text-white rounded-full font-bold uppercase tracking-wider text-sm hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                  >
                    {isSigningIn ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Sign In & Proceed to Checkout
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-muted">
                      New to Nestcraft?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setLoginError(null);
                        }}
                        className="text-secondary font-bold hover:underline"
                      >
                        Create an account
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Create Account Form */}
              {authMode === "signup" && (
                <form onSubmit={handleCheckoutSignup} className="space-y-5">
                  {signupError && (
                    <div className="p-4 flex items-center gap-3 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span>{signupError}</span>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                        First Name *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-secondary transition-colors">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          required
                          value={signupFirstName}
                          onChange={(e) => setSignupFirstName(e.target.value)}
                          placeholder="First Name"
                          className="w-full h-14 pl-12 pr-4 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                        Last Name *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-secondary transition-colors">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          required
                          value={signupLastName}
                          onChange={(e) => setSignupLastName(e.target.value)}
                          placeholder="Last Name"
                          className="w-full h-14 pl-12 pr-4 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                        Email Address *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-secondary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="customer@example.com"
                          className="w-full h-14 pl-12 pr-4 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                        Phone Number
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-secondary transition-colors">
                          <Phone size={18} />
                        </div>
                        <input
                          type="tel"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full h-14 pl-12 pr-4 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-[1px] text-muted ml-1">
                      Password (min 6 characters) *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-secondary transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-14 pl-12 pr-12 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSigningUp}
                    className="w-full h-14 bg-secondary text-white rounded-full font-bold uppercase tracking-wider text-sm hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                  >
                    {isSigningUp ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Create Account & Proceed to Checkout
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-muted">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setSignupError(null);
                        }}
                        className="text-secondary font-bold hover:underline"
                      >
                        Sign in instead
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              <section
                aria-label="Checkout account"
                className="rounded-2xl border border-border bg-surface/70 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[1.5px] text-secondary">
                      Account connected
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Customer"}
                      {user?.email && (
                        <span className="text-muted font-normal ml-2">({user.email})</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCheckoutLogout}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-red-500 transition-colors self-start sm:self-auto px-3 py-1.5 rounded-lg border border-border hover:border-red-200"
                >
                  <LogOut size={14} />
                  Switch account
                </button>
              </section>

          {/* Steps Indicator */}
          <div className="flex items-center gap-6">
            {[
              { id: 1, label: "Shipping", icon: Truck },
              { id: 2, label: "Payment", icon: CreditCard },
              { id: 3, label: "Review", icon: ShieldCheck },
            ].map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s.id
                      ? "bg-secondary text-white"
                      : "bg-surface text-muted border border-border"
                  }`}
                >
                  {step > s.id ? <CheckCircle2 size={18} /> : s.id}
                </div>
                <span
                  className={`text-sm font-bold uppercase tracking-wider hidden sm:block ${
                    step >= s.id ? "text-foreground" : "text-muted"
                  }`}
                >
                  {s.label}
                </span>
                {s.id < 3 && (
                  <div className="w-8 h-px bg-border hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleNext} className="space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 uppercase">
                    <MapPin className="text-secondary" size={20} />
                    Shipping Address
                  </h2>

                  {renderAddressForm("shipping")}

                  <div className="flex items-center gap-3 pt-6 pb-2">
                    <button
                      type="button"
                      onClick={() => setIsBillingDifferent(!isBillingDifferent)}
                      className="w-12 h-6 rounded-full bg-surface border-2 border-border relative flex items-center transition-all data-[state=true]:bg-secondary data-[state=true]:border-secondary focus:outline-none"
                      data-state={isBillingDifferent}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-border absolute transition-all ${isBillingDifferent ? "left-[26px] bg-white" : "left-1"}`}
                      />
                    </button>
                    <span className="text-sm font-bold mt-0.5 uppercase tracking-wider text-muted">
                      Billing address is different
                    </span>
                  </div>

                  <AnimatePresence>
                    {isBillingDifferent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-8 border-t border-border mt-2 space-y-6">
                          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 uppercase">
                            <MapPin className="text-secondary" size={20} />
                            Billing Address
                          </h2>
                          {renderAddressForm("billing")}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold tracking-tight mb-6">
                    Payment Method
                  </h2>
                  <div className="space-y-4">
                    {/* COD Option */}
                    <div
                      onClick={() => setPaymentMethod("cod")}
                      className={`p-6 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${paymentMethod === "cod" ? "border-2 border-[#5a6330] bg-primary/5" : "border border-border bg-surface hover:border-primary/50"}`}
                    >
                      <div className="flex items-center gap-4">
                        <Wallet
                          className={
                            paymentMethod === "cod"
                              ? "text-primary"
                              : "text-muted"
                          }
                        />
                        <span className="font-bold">
                          Cash on Delivery (COD)
                        </span>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === "cod" ? "border-[#5a6330]" : "border-border"}`}
                      >
                        {paymentMethod === "cod" && (
                          <div className="w-3 h-3 rounded-full bg-olive" />
                        )}
                      </div>
                    </div>

                    {/* Online Option — only meaningful when gateways exist */}
                    <div
                      onClick={() => {
                        if (enabledGateways.length > 0) {
                          setPaymentMethod("online");
                        }
                      }}
                      className={`p-6 rounded-2xl flex items-center justify-between transition-all ${
                        enabledGateways.length === 0
                          ? "opacity-50 cursor-not-allowed border border-border bg-surface"
                          : paymentMethod === "online"
                            ? "cursor-pointer border-2 border-[#5a6330] bg-primary/5"
                            : "cursor-pointer border border-border bg-surface hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <CreditCard
                          className={
                            paymentMethod === "online"
                              ? "text-primary"
                              : "text-muted"
                          }
                        />
                        <div>
                          <span className="font-bold">Online Payment</span>
                          {enabledGateways.length === 0 && (
                            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider mt-0.5">
                              Currently unavailable
                            </p>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === "online" ? "border-[#5a6330]" : "border-border"}`}
                      >
                        {paymentMethod === "online" && (
                          <div className="w-3 h-3 rounded-full bg-olive" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Enabled Gateways list for Online */}
                  <AnimatePresence>
                    {paymentMethod === "online" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="mt-4 p-6 rounded-2xl bg-surface border border-border space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-[2px] text-muted block ml-1">
                            Select Online Payment Gateway
                          </label>
                          {enabledGateways.length === 0 ? (
                            <div className="text-sm font-semibold text-muted bg-primary/5 p-4 rounded-xl border border-dashed border-border text-center">
                              No online payment gateways are currently enabled.
                              Your order will be placed as Cash on Delivery.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {enabledGateways.map((gateway: any) => {
                                const isSelected =
                                  selectedGateway === gateway.id;
                                return (
                                  <div
                                    key={gateway.id}
                                    onClick={() =>
                                      setSelectedGateway(gateway.id)
                                    }
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                      isSelected
                                        ? "border-[#5a6330] bg-primary/5"
                                        : "border-border bg-surface hover:border-[#5a6330]/30"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <CreditCard size={16} />
                                      </div>
                                      <div>
                                        <p className="font-bold text-sm">
                                          {gateway.name}
                                        </p>
                                        {gateway.testMode && (
                                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                            Test Mode
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                        isSelected
                                          ? "border-[#5a6330]"
                                          : "border-border"
                                      }`}
                                    >
                                      {isSelected && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#5a6330]" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {enabledGateways.length > 0 && (
                            <div className="pt-2 text-xs font-semibold text-muted">
                              You will be redirected to the secure payment
                              gateway (
                              {enabledGateways.find(
                                (g: any) => g.id === selectedGateway,
                              )?.name || "selected provider"}
                              ) after reviewing your order.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-2xl font-bold tracking-tight mb-6">
                    Review Order
                  </h2>
                  <div className="p-8 rounded-3xl border border-border bg-surface space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[2px] text-muted mb-2">
                          Shipping To
                        </h4>
                        <p className="font-bold">
                          {shippingData?.firstName || "Customer"}{" "}
                          {shippingData?.lastName || ""}
                        </p>
                        <p className="text-sm text-muted font-semibold">
                          {shippingData?.addressLine1 || "Address 1"},{" "}
                          {shippingData?.city || "City"},{" "}
                          {shippingData?.state || "State"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-secondary text-xs font-black uppercase tracking-wider"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[2px] text-muted mb-2">
                          Payment Method
                        </h4>
                        <p className="font-bold">
                          {paymentMethod === "cod" || !selectedGateway
                            ? "Cash on Delivery (COD)"
                            : `Online Payment (${
                                enabledGateways.find(
                                  (g: any) => g.id === selectedGateway,
                                )?.name || "Online"
                              })`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-secondary text-xs font-black uppercase tracking-wider"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {orderError && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-600">
                      {orderError}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4 pt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 h-14 rounded-full border border-border text-foreground font-bold uppercase tracking-wider hover:bg-surface transition-all"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isProcessing || isLoading}
                className="flex-[2] bg-primary text-white h-14 rounded-full text-[15px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {step === 3
                      ? paymentMethod === "online" && selectedGateway
                        ? "Proceed to Payment"
                        : "Complete Order"
                      : "Continue to " + (step === 1 ? "Payment" : "Review")}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-8 sticky top-[140px]">
          <div className="bg-surface border border-border p-8 rounded-3xl">
            <h3 className="text-xl font-bold mb-6 tracking-tight">Summary</h3>
            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {cart.map((item) => (
                <div key={item.cartItemId || item._id} className="flex gap-4">
                  <div className="w-16 h-20 bg-background rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img
                      src={getItemImage(item)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="font-bold text-sm line-clamp-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted font-bold uppercase tracking-wider">
                      Qty: {item.quantity}
                    </p>
                    <p className="text-sm font-black text-secondary mt-1">
                      {formatPrice(
                        Number(
                          item.selectedVariant?.price ||
                            item.price ||
                            item.pricing?.price ||
                            0,
                        ),
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-px bg-border my-6" />

            {/* Promo / Coupon Code Section */}
            <div className="mb-6">
              <label className="text-[11px] font-black uppercase tracking-[2px] text-muted block mb-2 ml-1">
                Have a coupon?
              </label>
              {!appliedCoupon ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError(null);
                      }}
                      className="flex-1 h-11 px-4 rounded-xl bg-background border border-border outline-none focus:border-secondary transition-all font-semibold text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-5 h-11 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-red-500 text-xs font-semibold ml-1 mt-1">
                      {couponError}
                    </p>
                  )}
                  {couponSuccess && (
                    <p className="text-emerald-600 text-xs font-semibold ml-1 mt-1">
                      {couponSuccess}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2 items-center">
                    <span className="text-[10px] text-muted font-semibold">
                      Try:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCouponCode("WELCOME10");
                        setCouponError(null);
                      }}
                      className="text-[10px] text-secondary hover:underline font-bold uppercase tracking-wider"
                    >
                      WELCOME10
                    </button>
                    <span className="text-muted text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCouponCode("NEST50");
                        setCouponError(null);
                      }}
                      className="text-[10px] text-secondary hover:underline font-bold uppercase tracking-wider"
                    >
                      NEST50
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                      Applied Coupon
                    </span>
                    <span className="text-sm font-black text-emerald-900">
                      {appliedCoupon}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[10px] text-red-500 hover:text-red-700 font-black uppercase tracking-wider transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-border my-6" />
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-muted font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 font-semibold animate-fade-in">
                  <span>Discount ({appliedCoupon})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted font-semibold">
                <span>Shipping</span>
                <span className="text-emerald-600 font-semibold">
                  {isLoading ? (
                    <span className="text-xs text-muted animate-pulse">
                      Calculating...
                    </span>
                  ) : shippingCost == 0 ? (
                    "Free"
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              {isLoading && countrySelected && (
                <div className="flex justify-between text-sm text-muted font-semibold">
                  <span>Taxes</span>
                  <span className="text-xs text-muted animate-pulse">
                    Calculating...
                  </span>
                </div>
              )}
              {taxingRule &&
                taxingRule.length > 0 &&
                taxingRule?.map((item: any) => {
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm text-muted font-semibold"
                    >
                      <span>
                        {item.label} (
                        {item.inclusive ? "Inclusive" : "Exclusive"}){" "}
                        {item.rate}%
                      </span>
                      <span>
                        {formatPrice(
                          Math.max(0, cartTotal - discountAmount) *
                            (item.rate / 100),
                        )}{" "}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className="flex justify-between text-lg font-black pt-4 border-t border-border">
              <span>Total</span>
              <span className="text-secondary font-black">
                {isLoading ? (
                  <span className="text-sm font-semibold text-muted animate-pulse">
                    Calculating...
                  </span>
                ) : (
                  formatPrice(orderTotal)
                )}
              </span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 flex gap-4 items-start">
            <ShieldCheck className="text-emerald-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Secure Payment
              </p>
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                Your data is protected by 256-bit SSL encryption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
