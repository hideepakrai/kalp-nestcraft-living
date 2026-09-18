"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Edit3,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { setEditMode } from "@/lib/store/pages/pagesSlice";
import { RootState } from "@/lib/store/store";
import { useAnnotatorStore } from "@/components/annotationPlugin/store";
import { AnnotatorPlugin } from "@/components/annotationPlugin/AnnotatorPlugin";

const OPERATOR_ROLES = new Set([
  "admin",
  "staff",
  "business_admin",
  "tenant_admin",
  "platform_admin",
  "super_admin",
]);

export default function AdminBar() {
  const dispatch = useAppDispatch();

  const { isAuthenticated, user } = useAppSelector((state: RootState) => state.auth);
  // ✅ Real edit mode state from Redux (same as EditModeToggle uses)
  const { isEditable } = useAppSelector((state: RootState) => state.pages);

  const operatorRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin =
    isAuthenticated && user !== null && OPERATOR_ROLES.has(operatorRole);

  // ✅ Real comment mode state from AnnotatorStore
  const { isCommentModeActive, setCommentMode, annotations } = useAnnotatorStore();

  const [isVisible, setIsVisible] = useState(true);
  const commentCount = annotations.length;

  const handleCommentToggle = () => {
    const nextCommentMode = !isCommentModeActive;
    setCommentMode(nextCommentMode);
    if (nextCommentMode) dispatch(setEditMode(false));
  };

  const handleEditToggle = () => {
    const nextEditMode = !isEditable;
    dispatch(setEditMode(nextEditMode));
    if (nextEditMode) setCommentMode(false);
  };

  if (!isAdmin) return null;

  // Collapsed floating button when bar is hidden
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{ backgroundColor: "#063A1D" }}
        className="fixed top-3 right-3 z-[10000] flex items-center gap-2 px-4 h-8 border border-white/20 text-white/80 rounded-full transition-all duration-200 hover:scale-105 hover:text-white font-semibold text-[11px] shadow-lg shadow-black/40"
        title="Show Admin Bar"
      >
        <Eye className="w-3.5 h-3.5" style={{ color: "#98c45f" }} />
        <span>Show Admin Bar</span>
      </button>
    );
  }

  return (
    <div
      data-annotator-ui="true"
      style={{ backgroundColor: "#063A1D" }}
      className="w-full text-white text-[13px] font-sans border-b border-white/10 relative z-[9999] select-none"
    >
      <div
        className="w-full px-2 sm:px-4 h-11 flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .admin-bar-scroll::-webkit-scrollbar { display: none; }
        ` }} />

        {/* Left — Dashboard link */}
        <div className="flex items-center shrink-0 admin-bar-scroll">
          <Link
            href="https://zerolive.kalptree.xyz/login"
            target="_blank"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors duration-200 font-bold uppercase tracking-wider text-[11px]"
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" style={{ color: "#98c45f" }} />
            <span className="hidden sm:inline">ADMIN DASHBOARD</span>
            <span className="sm:hidden">ADMIN</span>
          </Link>
        </div>

        {/* Right — Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Comments toggle */}
          <button
            onClick={handleCommentToggle}
            style={
              isCommentModeActive
                ? { borderColor: "#98c45f", color: "#98c45f", backgroundColor: "rgba(152,196,95,0.1)" }
                : { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.05)" }
            }
            className="h-7 px-2 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2 transition-all border text-[11px] font-semibold hover:opacity-90 shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">{isCommentModeActive ? "Hide Comments" : `Show Comments (${commentCount})`}</span>
            <span className="md:hidden">{commentCount}</span>
          </button>

          {/* ✅ Edit Mode — connected to real Redux state (same as the floating EditModeToggle) */}
          <button
            onClick={handleEditToggle}
            style={
              isEditable
                ? { backgroundColor: "#98c45f", borderColor: "#98c45f", color: "#063A1D", boxShadow: "0 0 12px rgba(152,196,95,0.45)" }
                : { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.05)" }
            }
            className="h-7 px-2 sm:px-3 rounded-full flex items-center gap-1.5 transition-all text-[11px] font-semibold border hover:opacity-90 shrink-0"
            title={isEditable ? "Disable edit mode" : "Enable edit mode"}
          >
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Edit Mode {isEditable ? "ON" : "OFF"}</span>
            <span className="md:hidden">{isEditable ? "ON" : "OFF"}</span>
          </button>

          {/* Divider */}
          <span className="text-white/20 select-none">|</span>

          {/* Hide button */}
          <button
            onClick={() => setIsVisible(false)}
            className="h-7 w-7 rounded-full flex items-center justify-center bg-transparent text-white/70 hover:bg-white/15 hover:text-white transition-all shrink-0"
            title="Hide Admin Bar"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Edit mode banner — active when isEditable is true */}
      {isEditable && (
        <div
          style={{ backgroundColor: "#98c45f", color: "#063A1D" }}
          className="w-full text-center py-2 text-[12px] font-semibold border-t border-white/10"
        >
          ✨ Inline editing is active. Changes are saved as reviewable drafts and do not alter Published content.
        </div>
      )}

      {/* Global Annotator Plugin (only renders for admins since AdminBar is admin-only) */}
      <AnnotatorPlugin />
    </div>
  );
}
