"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Users } from "lucide-react"

interface GroupItemProps {
  group: any
  currentUser: any
  onClick: () => void
}

export default function GroupItem({ group, currentUser, onClick }: GroupItemProps) {
  const isRead = group.lastMessage?.readBy?.includes(currentUser.uid)
  const lastMessageTime = group.lastMessageAt
    ? formatDistanceToNow(new Date(group.lastMessageAt), { addSuffix: true })
    : ""

  return (
    <div className={`p-4 hover:bg-gray-50 cursor-pointer ${!isRead ? "bg-blue-50" : ""}`} onClick={onClick}>
      <div className="flex items-center space-x-3">
        <Avatar className="h-12 w-12">
          {group.groupPic ? (
            <AvatarImage src={group.groupPic || "/placeholder.svg"} alt={group.name} />
          ) : (
            <AvatarFallback className="bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{group.name || "Unnamed Group"}</h3>
            <span className="text-xs text-gray-500">{lastMessageTime}</span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-600 truncate max-w-[200px]">
              {group.lastMessage ? (
                group.lastMessage.senderId === "system" ? (
                  <span className="italic">{group.lastMessage.text}</span>
                ) : (
                  <>
                    <span className="font-medium">{group.lastMessage.senderName?.split(" ")[0] || "Someone"}:</span>{" "}
                    {group.lastMessage.text}
                  </>
                )
              ) : (
                "No messages yet"
              )}
            </p>
            {!isRead && group.lastMessage?.senderId !== currentUser.uid && <Badge className="bg-blue-500">New</Badge>}
          </div>

          <div className="mt-1">
            <p className="text-xs text-gray-500">{group.memberCount || group.members?.length || 0} members</p>
          </div>
        </div>
      </div>
    </div>
  )
}
