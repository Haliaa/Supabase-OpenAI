import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useRouter } from "next/router";
import Header from "../components/Header";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) router.push("/chat");
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) alert("Check your email to confirm sign-up!");
  };

  return (
    <>
      <Header />

      <div className="flex flex-col p-8">
        <input
          className="mb-2 p-2 border"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className="mb-2 p-2 border"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button
          onClick={handleLogin}
          className="mb-2 bg-blue-500 text-white p-2 rounded"
        >
          Login
        </button>
        <button
          onClick={handleSignUp}
          className="bg-gray-500 text-white p-2 rounded"
        >
          Sign Up
        </button>
      </div>
    </>
  );
}
