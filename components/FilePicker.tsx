'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dispatch, SetStateAction, useState, DragEvent } from "react"

interface FilePickerProps {
  setSelectedFiles: Dispatch<SetStateAction<File[]>>
  setPage: Dispatch<SetStateAction<number>>
}

const FilePicker: React.FC<FilePickerProps> = ({
  setSelectedFiles,
  setPage
}) => {
  const [status, setStatus] = useState("");

  const handleFileDrop = (e: DragEvent<HTMLInputElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
    if (files.length > 0) {
      setSelectedFiles(files);
      setPage(1);
    } else {
      setStatus("Drop PDFs only")
    }
  }

  return (
    <div className='flex flex-col gap-7 justify-center items-center h-[80vh]'>
      <Label htmlFor="pdf" className="text-xl font-bold tracking-tight text-gray-600 cursor-pointer">
        Select PDFs to chat
      </Label>
      <Input
        onDragOver={() => setStatus("Drop PDF files to chat")}
        onDragLeave={() => setStatus("")}
        onDrop={handleFileDrop}
        id="pdf"
        type="file"
        accept='.pdf'
        className="cursor-pointer"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
            setSelectedFiles(files);
            setPage(1);
          }
        }}
      />
      <div className="text-lg font-medium">{status}</div>
    </div>
  )
}

export default FilePicker
