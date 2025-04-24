"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Plus, Search, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import ChatItem from "./chat-item"
import { Skeleton } from "@/components/ui/skeleton"

interface ChatListProps {
  user: any
  onNewChat: () => void
}

export default function ChatList({ user, onNewChat }: ChatListProps) {
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!user?.uid) return

    const chatsRef = collection(db, "chats")
    const q = query(chatsRef, where("participants", "array-contains", user.uid), orderBy("lastMessageAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList: any[] = []
      snapshot.forEach((doc) => {
        chatList.push({ id: doc.id, ...doc.data() })
      })
      setChats(chatList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true
    return chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button size="sm" onClick={onNewChat}>
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search chats..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[160px]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length > 0 ? (
          <div className="divide-y">
            {filteredChats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} currentUser={user} onClick={() => handleChatClick(chat.id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">No chats yet</h3>
            <p className="text-gray-500 mt-1 mb-4">Start a new conversation with someone</p>
            <Button onClick={onNewChat}>
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
