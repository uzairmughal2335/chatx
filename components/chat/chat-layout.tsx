"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Users, Globe, User } from "lucide-react"
import ChatList from "./chat-list"
import GroupList from "./group-list"
import GlobalChat from "./global-chat"
import ProfileSection from "./profile-section"
import NewChatDialog from "./new-chat-dialog"
import NewGroupDialog from "./new-group-dialog"

export default function ChatLayout() {
  const [activeTab, setActiveTab] = useState("chats")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        router.push("/auth")
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
        if (userDoc.exists()) {
          setUser(userDoc.data())
        } else {
          console.error("User document not found")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">ChatX</h1>
          <div className="flex items-center space-x-2">{/* Add notification bell or other header icons here */}</div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="chats" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-4 px-4 py-2 bg-white border-b">
            <TabsTrigger value="chats" className="flex flex-col items-center py-2 text-xs">
              <MessageSquare className="h-5 w-5 mb-1" />
              <span>Chats</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex flex-col items-center py-2 text-xs">
              <Users className="h-5 w-5 mb-1" />
              <span>Groups</span>
            </TabsTrigger>
            <TabsTrigger value="global" className="flex flex-col items-center py-2 text-xs">
              <Globe className="h-5 w-5 mb-1" />
              <span>Global</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col items-center py-2 text-xs">
              <User className="h-5 w-5 mb-1" />
              <span>Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 overflow-hidden flex flex-col">
            <ChatList user={user} onNewChat={() => setNewChatOpen(true)} />
          </TabsContent>

          <TabsContent value="groups" className="flex-1 overflow-hidden flex flex-col">
            <GroupList user={user} onNewGroup={() => setNewGroupOpen(true)} />
          </TabsContent>

          <TabsContent value="global" className="flex-1 overflow-hidden flex flex-col">
            <GlobalChat user={user} />
          </TabsContent>

          <TabsContent value="profile" className="flex-1 overflow-auto">
            <ProfileSection user={user} />
          </TabsContent>
        </Tabs>
      </main>

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} currentUser={user} />

      <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} currentUser={user} />
    </div>
  )
}
