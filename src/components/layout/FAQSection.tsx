"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "What is Wakeup and how does it work?",
      answer: "Wakeup is a local-first developer operating cockpit. It connects your browser dashboard directly to your physical host machine through a lightweight local daemon running on port 3131. You can launch scripts, terminate ports, review git activity, and write AI notes from one place."
    },
    {
      question: "Is it secure to let Wakeup control my machine?",
      answer: "Yes, security is our top design parameter. The local agent binds strictly to localhost (127.0.0.1) and gates all actions behind local session tokens matching your authenticated Google Account. No external network requests can bypass this gate."
    },
    {
      question: "Do you store my Groq API keys or local files in the cloud?",
      answer: "No. Wakeup has a strict local-storage architecture. Credentials and API tokens are encrypted with AES-256-GCM directly inside your host configuration folder. Code paths and logs remain in session memory and are never transmitted to our servers."
    },
    {
      question: "How do I configure the Telegram note capture bot?",
      answer: "Once you sign in, head to the Telegram Widget configuration. Copy the secret handshake key, open the bot in your mobile app, send /sync <key>, and you're set. Any messages or links sent to the bot will automatically parse into your inbox lists."
    },
    {
      question: "What are the local machine pre-requisites?",
      answer: "The local agent requires Node.js installed. Run a simple terminal bootstrap command (npm run start:agent) in your project repository directory to spin up the local Express daemon on port 3131."
    }
  ];

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative bg-background bg-dot-grid py-16 px-6 border-t border-dashed border-zinc-200 select-none">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Headings (1 Col) */}
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F1F1F] font-poppins">
            FAQs
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed font-poppins max-w-sm">
            Common questions about Wakeup, our security features, and how to configure your local machine cockpit.
          </p>
        </div>

        {/* Right Side: Accordion Grid (2 Cols) */}
        <div className="lg:col-span-2 border-t border-dashed border-zinc-200">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx} 
                className="border-b border-dashed border-zinc-200"
              >
                <button
                  onClick={() => handleToggle(idx)}
                  className="w-full py-4 flex items-center justify-between text-left transition-all hover:text-zinc-900 cursor-pointer group"
                >
                  <span className={`text-[11px] font-bold font-poppins transition-colors ${
                    isOpen ? "text-[#3b53e9]" : "text-zinc-650 group-hover:text-zinc-855"
                  }`}>
                    {faq.question}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-[#3b53e9]" : ""
                  }`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pb-4 pr-6 text-[10px] text-zinc-500 leading-relaxed font-poppins">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
