export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-indigo-900 via-blue-800 to-indigo-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-6 md:space-y-0">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Future with AI
          </h2>
          <p className="text-sm mt-1 text-gray-300">
            Empowering conversations, one intelligent reply at a time.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-300">
          <a href="/chat" className="hover:text-white transition">
            AI Chat
          </a>
          <a href="/login" className="hover:text-white transition">
            Login
          </a>
          <a
            href="https://openai.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition"
          >
            Powered by OpenAI
          </a>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 mt-6">
        © {new Date().getFullYear()} AI Chat App. All rights reserved.
      </div>
    </footer>
  );
}
