"use client";

import React from "react";
import { Settings, Bell, Database, Check } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          System Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure organization policies, Prisma database connectivity, and notifications.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Database Engine</h3>
              <p className="text-xs text-slate-500">MySQL & Prisma Client (MariaDB Adapter)</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-700 flex items-center justify-between">
            <span>Status: Connected to LMS Database (localhost:3306)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Email & Push Notifications</h3>
              <p className="text-xs text-slate-500">Automatically notify employees and TLs upon leave decisions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Automatic audit log entry creation enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
