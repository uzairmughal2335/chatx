"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Plus, Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import GroupItem from "./group-item"
import { Skeleton } from "@/components/ui/skeleton"

interface GroupListProps {
  user: any
  onNewGroup: () => void
}

export default function GroupList({ user, onNewGroup }: GroupListProps) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!user?.uid) return

    const groupsRef = collection(db, "groups")
    const q = query(groupsRef, where("members", "array-contains", user.uid), orderBy("lastMessageAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupList: any[] = []
      snapshot.forEach((doc) => {
        groupList.push({ id: doc.id, ...doc.data() })
      })
      setGroups(groupList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const filteredGroups = groups.filter((group) => {
    if (!searchQuery) return true
    return group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleGroupClick = (groupId: string) => {
    router.push(`/chat/group/${groupId}`)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Groups</h2>
          <Button size="sm" onClick={onNewGroup}>
            <Plus className="h-4 w-4 mr-1" />
            New Group
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search groups..."
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
        ) : filteredGroups.length > 0 ? (
          <div className="divide-y">
            {filteredGroups.map((group) => (
              <GroupItem key={group.id} group={group} currentUser={user} onClick={() => handleGroupClick(group.id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">No groups yet</h3>
            <p className="text-gray-500 mt-1 mb-4">Create a new group or get added to one</p>
            <Button onClick={onNewGroup}>
              <Plus className="h-4 w-4 mr-1" />
              New Group
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
