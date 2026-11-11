import type { Metadata } from "next";
import { Login } from "@/features/auth/Login";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return <Login />;
}
