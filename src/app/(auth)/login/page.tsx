import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm shadow-xl">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">⚔️</span>
          <h1 className="text-2xl font-bold text-white">WoW Guild Dashboard</h1>
          <p className="text-gray-400 text-sm text-center">
            Sign in with your Battle.net account to manage your guild.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("battlenet", { redirectTo: "/" });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
            Sign in with Battle.net
          </button>
        </form>
        <p className="text-xs text-gray-600 text-center">
          You&apos;ll need to add your API credentials in <code>.env.local</code> before login works.
        </p>
      </div>
    </div>
  );
}
