"use client"

import { useState } from "react"
import { doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Pencil, Trash2, Reply } from "lucide-react"

interface MessageOptionsMenuProps {
  message: any
  isCurrentUser: boolean
  chatId: string
  onClose: () => void
}

export default function MessageOptionsMenu({ message, isCurrentUser, chatId, onClose }: MessageOptionsMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [editedText, setEditedText] = useState("")
  const [replyText, setReplyText] = useState("")
  const [loading, setLoading] = useState(false)

  if (!message) return null

  const handleEdit = async () => {
    if (!editedText.trim() || editedText === message.text) {
      setEditDialogOpen(false)
      return
    }

    setLoading(true)

    try {
      await updateDoc(doc(db, `chats/${chatId}/messages`, message.id), {
        text: editedText.trim(),
        edited: true,
        editedAt: new Date().toISOString(),
      })

      setEditDialogOpen(false)
      onClose()
    } catch (error) {
      console.error("Error editing message:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)

    try {
      await deleteDoc(doc(db, `chats/${chatId}/messages`, message.id))
      setDeleteDialogOpen(false)
      onClose()
    } catch (error) {
      console.error("Error deleting message:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim()) {
      setReplyDialogOpen(false)
      return
    }

    setLoading(true)

    try {
      // This would be implemented in a real app
      // For now, we'll just close the dialog
      setReplyDialogOpen(false)
      onClose()
    } catch (error) {
      console.error("Error replying to message:", error)
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = () => {
    setEditedText(message.text)
    setEditDialogOpen(true)
  }

  const openReplyDialog = () => {
    setReplyText("")
    setReplyDialogOpen(true)
  }

  return (
    <>
      <Dialog open={!!message} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message Options</DialogTitle>
          </DialogHeader>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm text-gray-800">{message.text}</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" onClick={openReplyDialog} className="justify-start">
              <Reply className="mr-2 h-4 w-4" />
              Reply
            </Button>

            {isCurrentUser && (
              <>
                <Button variant="outline" onClick={openEditDialog} className="justify-start">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Message
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="justify-start text-red-500 hover:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Message
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input value={editedText} onChange={(e) => setEditedText(e.target.value)} placeholder="Edit your message" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading || !editedText.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
          </DialogHeader>

          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <p className="text-xs font-medium text-gray-500">{message.senderName}</p>
            <p className="text-sm text-gray-800">{message.text}</p>
          </div>

          <div className="space-y-4">
            <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReply} disabled={loading || !replyText.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
