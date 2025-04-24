"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SplashScreen from "@/components/splash-screen"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function Home() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Show splash screen for at least 2 seconds
      setTimeout(() => {
        if (user) {
          router.push("/chat")
        } else {
          router.push("/auth")
        }
        setLoading(false)
      }, 2000)
    })

    return () => unsubscribe()
  }, [router])

  return <SplashScreen />
}
