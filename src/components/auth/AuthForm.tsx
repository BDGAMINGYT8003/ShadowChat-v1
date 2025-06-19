
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { auth, db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import type { UserProfile } from "@/types";

const formSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .optional()
    .or(z.literal('').transform(() => undefined)), // Treat empty string as undefined for optional validation
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function AuthForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  const onSubmit = async (values: FormValues, mode: "login" | "register") => {
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        if (!values.username) {
          toast({ variant: "destructive", title: "Error", description: "Username is required for registration." });
          setIsSubmitting(false);
          return;
        }

        // Username uniqueness check REMOVED
        // const usersRef = collection(db, "users");
        // const q = query(usersRef, where("displayName", "==", values.username));
        // const querySnapshot = await getDocs(q);

        // if (!querySnapshot.empty) {
        //   toast({ variant: "destructive", title: "Error", description: "Username already taken. Please choose another." });
        //   setIsSubmitting(false);
        //   return;
        // }

        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(userCredential.user, { displayName: values.username });
        
        const newUserProfile: UserProfile = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: values.username,
        };
        await setDoc(doc(db, "users", userCredential.user.uid), newUserProfile);

        toast({ title: "Success", description: "Registration successful. You are now logged in." });
      } else { 
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast({ title: "Success", description: "Login successful." });
      }
    } catch (error: any) {
      console.error(`${mode} error:`, error);
      let errorMessage = `An error occurred during ${mode}.`;
      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
            errorMessage = "Login failed: No user found with this email.";
            break;
          case "auth/wrong-password":
            errorMessage = "Login failed: Incorrect password.";
            break;
          case "auth/email-already-in-use":
            errorMessage = "Registration failed: This email is already in use.";
            break;
          case "auth/invalid-email":
            errorMessage = "Invalid email address format.";
            break;
          case "auth/weak-password":
            errorMessage = "Password is too weak. It should be at least 6 characters.";
            break;
          case "permission-denied": 
          case "firestore/permission-denied":
             errorMessage = "Missing or insufficient permissions. Please check Firestore rules.";
            break;
          default:
            errorMessage = error.message || `An error occurred during ${mode}.`;
        }
      }
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    form.reset({
      email: "",
      password: "",
      username: "",
    });
    form.clearErrors();
  };


  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-slate-900">
      <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">ShadowChat</CardTitle>
          <CardDescription>
            {activeTab === "login" ? "Welcome back! Sign in to continue." : "Create an account to join the chat."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => onSubmit(data, "login"))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem className="hidden"> 
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogIn className="mr-2 h-4 w-4" /> Login</>}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="register">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => onSubmit(data, "register"))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} autoComplete="username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" {...field} autoComplete="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                           <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="Create a strong password" {...field} autoComplete="new-password" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><UserPlus className="mr-2 h-4 w-4" /> Register</>}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
