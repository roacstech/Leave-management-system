"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("error") === "CredentialsSignin") {
    setLoading(false);
    setError("Invalid email or password.");

    // Remove the error from the browser URL
    window.history.replaceState(null, "", "/login");
  }
}, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold">
          Leave Management System
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Sign in to continue
        </p>

        <div className="mt-6">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@lms.com"
            autoComplete="email"
            required
            disabled={loading}
            className="w-full rounded-lg border px-3 py-2 outline-none disabled:opacity-60"
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="w-full rounded-lg border px-3 py-2 outline-none disabled:opacity-60"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center rounded-lg bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}