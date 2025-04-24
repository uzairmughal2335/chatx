"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LoginForm from "@/components/auth/login-form"
import SignupForm from "@/components/auth/signup-form"
import { useRouter, useSearchParams } from "next/navigation"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get("redirect")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">ChatX</h1>
          <p className="text-gray-600 mt-2">{activeTab === "login" ? "Welcome back!" : "Create your account"}</p>
          {redirect && (
            <p className="text-sm text-blue-600 mt-2">
              You'll be redirected after {activeTab === "login" ? "logging in" : "signing up"}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm redirect={redirect} />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm redirect={redirect} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
