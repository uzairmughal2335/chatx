import { Loader2 } from "lucide-react"

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="flex flex-col items-center space-y-4">
        <h1 className="text-2xl font-bold text-blue-600">ChatX</h1>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Loading your chats...</p>
      </div>
    </div>
  )
}
