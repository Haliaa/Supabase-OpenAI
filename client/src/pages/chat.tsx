import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import Header from "../components/Header";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const sendMessage = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input, userId: user?.id }),
    });
    const data = await res.json();
    setResponse(data.result);
  };

  return (
    <>
      <Header />
      <div className="p-8">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full border p-2"
        />
        <button
          onClick={sendMessage}
          className="mt-2 bg-green-500 text-white p-2 rounded"
        >
          Send
        </button>
        <p className="mt-4 whitespace-pre-line">{response}</p>
      </div>
    </>
  );
}
