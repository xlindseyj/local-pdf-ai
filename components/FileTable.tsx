'use client'

import React from "react";
import { useState } from "react";
import Preview from "./Preview";

interface FileTableProps {
  files: File[];
  setPage: (page: number) => void;
}

const FileTable: React.FC<FileTableProps> = ({ files, setPage }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-[40%] h-full overflow-y-auto border-2 border-gray-200 rounded-xl">
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th className="p-2 text-left">File(s)</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => (
            <React.Fragment key={index}>
              <tr onClick={() => toggleOpen(index)} className="cursor-pointer">
                <td className="p-2 border-b">{file.name}</td>
              </tr>
              {openIndex === index && (
                <tr>
                  <td colSpan={2} className="p-2 border-b">
                    <div className="h-[50vh] overflow-hidden">
                      <Preview fileToPreview={file} /> {/* Use Preview component */}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FileTable;
