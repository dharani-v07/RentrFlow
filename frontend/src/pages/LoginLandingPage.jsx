import React from 'react';
import { Link } from 'react-router-dom';

export default function LoginLandingPage() {
  return (
    <div className="min-h-full grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl overflow-hidden shadow-xl">
          <div className="relative">
            <div className="h-40 bg-gradient-to-r from-brand-700 to-slate-900" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="absolute left-0 right-0 top-0 p-6">
              <div className="text-white">
                <div className="text-xl font-semibold">Agent–Contractor Portal</div>
                <div className="text-sm opacity-80">Login to manage jobs, work orders and invoices</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 space-y-3">
            <Link
              to="/login/agent"
              className="block w-full text-center rounded-md bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700"
            >
              Agent Login
            </Link>
            <Link
              to="/login/contractor"
              className="block w-full text-center rounded-md bg-amber-500 text-white py-2.5 font-medium hover:bg-amber-600"
            >
              Contractor Login
            </Link>
            <div className="text-xs text-slate-500 pt-2">
              For demo/testing you can also register new users from the login screen.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
