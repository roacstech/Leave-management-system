import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">🚫</div>

        <h1 className="text-2xl font-bold">
          Access Denied
        </h1>

        <p className="mt-3 text-gray-600">
          You don't have permission to access this page.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border px-4 py-2"
          >
            Go Home
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}