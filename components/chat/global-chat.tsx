"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, onSnapshot, addDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, CheckCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import UserProfileModal from "./user-profile-modal"

interface GlobalChatProps {
  user: any
}

export default function GlobalChat({ user }: GlobalChatProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.uid) return

    // Fetch global chat messages
    const messagesRef = collection(db, "globalChat")
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(50))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList: any[] = []
      snapshot.forEach((doc) => {
        messageList.push({ id: doc.id, ...doc.data() })
      })
      setMessages(messageList.reverse())
      setLoading(false)
      scrollToBottom()
    })

    // Simulate fetching online users
    // In a real app, you would use a presence system
    const fetchOnlineUsers = async () => {
      // This is a placeholder. In a real app, you would fetch actual online users
      // from a presence system like Firebase Realtime Database
      const usersRef = collection(db, "users")
      const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const userList: any[] = []
        snapshot.forEach((doc) => {
          // In a real app, you would check if the user is actually online
          if (doc.id !== user.uid) {
            userList.push({ id: doc.id, ...doc.data() })
          }
        })
        setOnlineUsers(userList.slice(0, 15)) // Limit to 15 users for demo
      })

      return unsubscribeUsers
    }

    const unsubscribeUsers = fetchOnlineUsers()

    return () => {
      unsubscribe()
      if (typeof unsubscribeUsers === "function") {
        unsubscribeUsers()
      }
    }
  }, [user])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || !user) return

    setSending(true)

    try {
      await addDoc(collection(db, "globalChat"), {
        text: message.trim(),
        senderId: user.uid,
        senderName: user.name || user.username,
        senderUsername: user.username,
        senderProfilePic: user.profilePic || "",
        senderVerified: user.verified || false,
        createdAt: new Date().toISOString(),
      })

      setMessage("")
      scrollToBottom()
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const openUserProfile = (user: any) => {
    setSelectedUser(user)
  }

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Global Chat</h2>
          <p className="text-sm text-gray-500">Chat with everyone on ChatX</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[80%] ${msg.senderId === user?.uid ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() =>
                      openUserProfile({
                        uid: msg.senderId,
                        name: msg.senderName,
                        username: msg.senderUsername,
                        profilePic: msg.senderProfilePic,
                        verified: msg.senderVerified,
                      })
                    }
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.senderProfilePic || ""} alt={msg.senderName} />
                      <AvatarFallback>{msg.senderName?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div
                    className={`mx-2 p-3 rounded-lg ${
                      msg.senderId === user?.uid ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <span
                        className="text-xs font-medium cursor-pointer"
                        onClick={() =>
                          openUserProfile({
                            uid: msg.senderId,
                            name: msg.senderName,
                            username: msg.senderUsername,
                            profilePic: msg.senderProfilePic,
                            verified: msg.senderVerified,
                          })
                        }
                      >
                        {msg.senderName || msg.senderUsername}
                      </span>
                      {msg.senderVerified && (
                        <Badge variant="outline" className="ml-1 h-4 px-1 bg-blue-100 text-blue-800 border-blue-200">
                          <CheckCheck className="h-2 w-2" />
                        </Badge>
                      )}
                    </div>
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? "text-blue-100" : "text-gray-500"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-gray-500">No messages yet. Be the first to say hello!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="p-4 border-t">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !message.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>

      {/* Online users sidebar */}
      <div className="w-64 border-l bg-gray-50 hidden md:block">
        <div className="p-4 border-b">
          <h3 className="font-medium">Online Users</h3>
        </div>
        <div className="overflow-y-auto h-[calc(100%-57px)]">
          {onlineUsers.length > 0 ? (
            <div className="divide-y">
              {onlineUsers.map((onlineUser) => (
                <div
                  key={onlineUser.id}
                  className="p-3 hover:bg-gray-100 cursor-pointer"
                  onClick={() => openUserProfile(onlineUser)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={onlineUser.profilePic || ""} alt={onlineUser.name} />
                        <AvatarFallback>
                          {onlineUser.name?.charAt(0) || onlineUser.username?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-1 ring-white"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium truncate">{onlineUser.name || onlineUser.username}</p>
                        {onlineUser.verified && (
                          <Badge variant="outline" className="ml-1 h-4 px-1 bg-blue-100 text-blue-800 border-blue-200">
                            <CheckCheck className="h-2 w-2" />
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">@{onlineUser.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">No users online</p>
            </div>
          )}
        </div>
      </div>

      {/* User profile modal */}
      <UserProfileModal
        user={selectedUser}
        currentUser={user}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </div>
  )
}
