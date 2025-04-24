"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MessageItemProps {
  message: any
  isCurrentUser: boolean
  onOptions: () => void
}

export default function MessageItem({ message, isCurrentUser, onOptions }: MessageItemProps) {
  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      {message.senderId === "system" ? (
        <div className="w-full my-2">
          <div className="bg-gray-100 text-gray-500 text-xs text-center py-1 px-2 rounded-md italic">
            {message.text}
          </div>
        </div>
      ) : (
        <div className={`flex max-w-[80%] group ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
          {!isCurrentUser && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.senderProfilePic || ""} alt={message.senderName} />
              <AvatarFallback>{message.senderName?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
          )}

          <div className="flex flex-col mx-2">
            <div
              className={`p-3 rounded-lg relative ${
                isCurrentUser ? "bg-blue-500 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
              }`}
            >
              {message.replyTo && (
                <div className={`text-xs p-2 rounded mb-1 ${isCurrentUser ? "bg-blue-600" : "bg-gray-200"}`}>
                  <p className="font-medium">{message.replyToSenderName || "Someone"}</p>
                  <p className="truncate">{message.replyToText}</p>
                </div>
              )}

              <p>{message.text}</p>

              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-0 ${isCurrentUser ? "left-0" : "right-0"} -translate-y-1/2 ${
                  isCurrentUser ? "-translate-x-full" : "translate-x-full"
                } opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 bg-white shadow-sm border`}
                onClick={onOptions}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </div>

            <span className={`text-xs mt-1 ${isCurrentUser ? "text-right" : "text-left"} text-gray-500`}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {message.edited && <span className="ml-1">(edited)</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
