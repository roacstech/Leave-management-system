"use client";

import React from "react";
import { FileSpreadsheet } from "lucide-react";

export default function LeaveTypesPage() {
  const leaveTypes = [
    { name: "Annual Leave", code: "AL", quota: 18, desc: "Paid annual vacation days for all full-time staff." },
    { name: "Casual Leave", code: "CL", quota: 10, desc: "Emergency short-notice leave for unforeseen personal tasks." },
    { name: "Sick Leave", code: "SL", quota: 12, desc: "Health and medical illness recovery days." },
    { name: "Maternity/Paternity", code: "MPL", quota: 90, desc: "Parental family support leaves for welcoming newborns." },
    { name: "Compensatory Off", code: "COMP", quota: 5, desc: "Earned compensatory rest days after weekend deployments." },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Leave Types & Policies
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure annual quotas, allowance carryover rules, and leave categories.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {leaveTypes.map((t) => (
          <div key={t.code} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                {t.code}
              </span>
              <span className="text-sm font-extrabold text-slate-900">{t.quota} Days/Year</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">{t.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
