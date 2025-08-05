import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useRouter } from "next/router";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { emailRegex, strongPasswordRegex } from "../constants/regexes";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const validateEmail = (value: string) => {
    const isValid = emailRegex.test(value);
    setEmailError(isValid ? null : "Please enter a valid email address");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    if (!strongPasswordRegex.test(value)) {
      setPasswordError(
        "Password must be at least 6 characters and include uppercase, lowercase, and a symbol"
      );
    } else {
      setPasswordError(null);
    }
  };

  const handleEmailLogin = async () => {
    if (emailError || !email) {
      setLoginError("Please provide a valid email.");
      return;
    }

    setLoginError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);

    if (error) {
      switch (error.message) {
        case "Invalid login credentials":
          setLoginError("Incorrect email or password.");
          break;
        default:
          setLoginError(error.message);
      }
    } else {
      router.push("/chat");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/chat", // or your deployed domain
      },
    });

    if (error) {
      console.error("Google login error:", error.message);
      // Show UI error if needed
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 transition-colors duration-500">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-800 shadow-3xl border-[1px] border-[rgba(59,130,246,0.15)] rounded-lg transition">
          <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
          <p className="text-sm text-center text-gray-500 dark:text-gray-300 mb-6">
            Log in to continue your AI journey
          </p>
          <div className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                className={`w-full p-3 rounded-md border ${
                  emailError
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition focus:outline-none focus:ring-2 ${
                  emailError
                    ? "focus:ring-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    : "focus:ring-blue-400 focus:shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                }`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateEmail(e.target.value);
                }}
              />
              {emailError && (
                <p className="text-red-500 text-sm">{emailError}</p>
              )}
            </div>
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full p-3 pr-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {passwordError}
                </p>
              )}
            </div>

            {loginError && (
              <div className="bg-red-100 border border-red-300 text-red-700 text-sm rounded p-3 transition dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                {loginError}
              </div>
            )}
          </div>

          <button
            onClick={handleEmailLogin}
            disabled={!!passwordError || !!emailError || isLoading}
            className="w-full bg-[var(--primary)] text-white py-3 mt-6 rounded-md hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">
              or
            </span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 py-3 rounded-md transition font-medium shadow-sm hover:shadow-md"
          >
            <FcGoogle size={20} />
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-5">
            Don’t have an account?{" "}
            <span
              onClick={() => router.push("/signup")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Sign up
            </span>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
