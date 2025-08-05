import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useRouter } from "next/router";
import { Eye, EyeOff } from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { emailRegex, strongPasswordRegex } from "../constants/regexes";
import { FcGoogle } from "react-icons/fc";

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleEmailSignUp = async () => {
    setSignUpError(null);

    if (!strongPasswordRegex.test(password)) {
      setSignUpError(
        "Password must have upper, lower case letters, symbol, and be at least 6 characters."
      );
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setSignUpError(error.message);
    } else {
      alert("Check your email to confirm sign-up!");
      router.push("/chat"); // Or stay on page if you wait for confirmation
    }

    setIsLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/chat", // or your deployed URL
      },
    });

    if (error) {
      setSignUpError(error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 transition-colors duration-500">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-800 shadow-3xl border-[1px] border-[rgba(59,130,246,0.15)] rounded-lg transition">
          <h2 className="text-3xl font-bold text-center mb-2">
            Create Account
          </h2>
          <p className="text-sm text-center text-gray-500 dark:text-gray-300 mb-6">
            Sign up to start using the AI chat
          </p>

          <div className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:shadow-[0_0_8px_rgba(59,130,246,0.4)]"
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

            {signUpError && (
              <div className="bg-red-100 border border-red-300 text-red-700 text-sm rounded p-3 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 transition">
                {signUpError}
              </div>
            )}
          </div>

          <button
            onClick={handleEmailSignUp}
            disabled={!!passwordError || !!emailError || isLoading}
            className="w-full bg-[var(--primary)] text-white py-3 mt-6 rounded-md hover:bg-blue-600 transition font-medium"
          >
            {isLoading ? "Signing up..." : "Sign Up"}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">
              or
            </span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          <button
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-600 py-3 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 transition font-medium disabled:opacity-50"
          >
            <FcGoogle size={20} />
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-5">
            Already have an account?{" "}
            <span
              onClick={() => router.push("/login")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Log in
            </span>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
