'use client'

import { useState, useEffect } from "react"
import { WebPDFLoader } from "langchain/document_loaders/web/pdf"

import { processDocsAsync, chat, saveChat, exportChat } from "@/app/actions";
import ChatWindow, { ChatMessage } from "@/components/ChatWindow";
import FilePicker from "@/components/FilePicker";
import FileTable from "@/components/FileTable";
import { Button } from "./ui/button";

export default function HomePage() {

  const [page, setPage] = useState(1)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")

  const [messages, setMessages] = useState<ChatMessage[]>([])

  const startChat = async (input: string) => {
    setLoadingMessage("Thinking...");
    setIsLoading(true);
    try {
      setMessages([...messages, { role: 'human', statement: input }]);
      const result = await chat(input);
  
      if (result) {
        const { response, metadata } = result;
        setMessages([
          ...messages,
          { role: 'human', statement: input },
          { role: 'ai', statement: response }
        ]);
  
        if (metadata && metadata.length > 0) {
          setPage(metadata[0].loc.pageNumber);
        }
        setLoadingMessage("Got response from AI.");
      } else {
        setLoadingMessage("No response from AI.");
      }
    } catch (e) {
      console.error("Error generating response:", e);
      setLoadingMessage("Error generating response.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChat = async () => {
    try {
      await saveChat(messages);
      alert('Chat saved successfully.');
    } catch (e) {
      console.error('Failed to save chat:', e);
      alert('Failed to save chat.');
    }
  };

  const handleExportChat = async () => {
    try {
      await exportChat(messages);
      alert('Chat exported successfully.');
    } catch (e) {
      console.error('Failed to export chat:', e);
      alert('Failed to export chat.');
    }
  };

  useEffect(() => {
    const processPdfAsync = async () => {
      if (selectedFiles.length > 0) {
        setLoadingMessage("Creating Index from the PDFs...")
        setIsLoading(true);
        try {
          const lcDocsPromises = selectedFiles.map(async file => {
            const loader = new WebPDFLoader(file, { parsedItemSeparator: " " });
            return (await loader.load()).map(lcDoc => ({
              pageContent: lcDoc.pageContent,
              metadata: lcDoc.metadata,
            }));
          });

          const lcDocs = (await Promise.all(lcDocsPromises)).flat();

          await processDocsAsync(lcDocs);
          setLoadingMessage("Done creating Index from the PDFs.")
        } catch (e) {
          console.log(e)
          setLoadingMessage("Error while creating index")
        } finally {
          setIsLoading(false);
        }
      }
    }
    processPdfAsync()
  }, [selectedFiles])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {selectedFiles.length > 0 ? (
        <div className='flex justify-between gap-4 h-[90vh] w-full'>
          <ChatWindow
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            startChat={startChat}
            messages={messages}
            setSelectedFiles={setSelectedFiles}
            setMessages={setMessages}
            setPage={setPage}
          />
          <FileTable files={selectedFiles} setPage={setPage} /> 
        </div>
      ) : (
        <FilePicker
          setPage={setPage}
          setSelectedFiles={setSelectedFiles} />
      )}
      <div className="flex gap-4 mt-4">
        <Button onClick={handleSaveChat}>Save Chat</Button>
        <Button onClick={handleExportChat}>Export Chat</Button>
      </div>
    </div>
  )
}
