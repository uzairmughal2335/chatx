import { Loader2 } from "lucide-react"

export default function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-500 to-blue-700 text-white">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative w-32 h-32 mb-4">
          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
            <h1 className="text-4xl font-bold text-blue-600">CX</h1>
          </div>
        </div>
        <h1 className="text-4xl font-bold">ChatX</h1>
        <p className="text-lg text-blue-100">Connect. Chat. Share.</p>
        <Loader2 className="h-8 w-8 animate-spin mt-6" />
      </div>
    </div>
  )
}
