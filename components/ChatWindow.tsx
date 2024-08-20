'use client'

import { Dispatch, SetStateAction, useState, useEffect, useRef } from "react";
import { CircleX, LoaderCircle, Trash, Save, FileText } from 'lucide-react'
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

import { resetChatEngine } from "@/app/actions";

export interface ChatMessage {
  role: "human" | "ai"
  statement: string
}

interface ChatWindowProps {
  isLoading: boolean,
  loadingMessage: string,
  startChat: (input: string) => void,
  messages: ChatMessage[],
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setSelectedFiles: Dispatch<SetStateAction<File[]>>,
  setPage: Dispatch<SetStateAction<number>>,
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  isLoading,
  loadingMessage,
  messages,
  setMessages,
  startChat,
  setPage,
  setSelectedFiles
}) => {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messageClass = "rounded-3xl p-3 block relative max-w-full break-words";
  const aiMessageClass = `text-start rounded-bl bg-gray-300 float-left text-gray-700 ${messageClass}`;
  const humanMessageClass = `text-end rounded-br bg-blue-400 text-gray-50 float-right ${messageClass}`;

  const closePDF = async () => {
    await resetChatEngine();
    setMessages([]);
    setSelectedFiles([]);
    setPage(1)
  }

  const resetChat = async () => {
    await resetChatEngine();
    setMessages([])
    setPage(1)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-full flex flex-col justify-stretch w-[50vw] border-2 border-gray-200 rounded-xl p-4 bg-white shadow-md">
      <div className="flex justify-between items-center">
        <span className="text-gray-500">
          {isLoading && <LoaderCircle className="animate-spin" />}
          {loadingMessage}
        </span>
        <div className="flex gap-2">
          <Button onClick={resetChat} className="px-2 py-1" disabled={isLoading} title="Refresh Chat">
            <Trash size={20} className="text-gray-400" />
          </Button>
          <Button onClick={closePDF} className="px-2 py-1" disabled={isLoading} title="Close PDFs">
            <CircleX size={20} className="text-red-500" />
          </Button>
        </div>
      </div>
      <hr className="my-3" />
      <div className="flex-grow overflow-y-auto mb-2 px-2">
        {messages.map((message, index) => (
          <div key={index} className="w-full mb-2">
            {message.role === "ai" ? (
              <div className={aiMessageClass}>
                <ReactMarkdown>{message.statement}</ReactMarkdown>
              </div>
            ) : (
              <div className={humanMessageClass}>{message.statement}</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 items-center justify-between mt-4">
        <Input
          disabled={isLoading}
          className="text-md flex-grow"
          type="text"
          placeholder="Send a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <Button
          variant={"outline"}
          disabled={isLoading}
          onClick={() => {
            if (input.trim()) {
              setInput("")
              startChat(input)
            }
          }}
          className="px-4 py-2"
        >
          Send
        </Button>
      </div>
    </div>
  )
}

export default ChatWindow;
