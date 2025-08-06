import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import Header from "../components/Header";
import Footer from "@/components/Footer";

export default function AskAIPage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const sendMessage = async () => {
    const res = await fetch("/api/ask-ai", {
      method: "POST",
      body: JSON.stringify({ message: input, userId: user?.id }),
    });
    const data = await res.json();
    setResponse(data.result);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-800 shadow-3xl border border-[1px] border-[rgba(59,130,246,0.15)] rounded-lg transition">
          <h2 className="text-2xl font-semibold text-center text-gray-800 dark:text-slate-100">
            Ask AI Anything
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-300">
            You can ask 3 questions for free. Just type and hit send!
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your question here..."
            className="w-full h-32 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:shadow-[0_0_8px_rgba(59,130,246,0.4)] outline-none resize-none transition"
          />

          <button
            onClick={sendMessage}
            className="w-full bg-blue-600 text-white py-3 mt-3 rounded-md hover:bg-blue-700 transition font-medium shadow-md"
          >
            Send
          </button>

          {response && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-100 rounded-md whitespace-pre-line">
              {response}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
