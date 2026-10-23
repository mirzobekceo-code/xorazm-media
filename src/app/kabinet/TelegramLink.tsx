"use client";
import { useRouter } from "next/navigation";
import TelegramButton from "@/components/TelegramButton";

export default function TelegramLink() {
  const router = useRouter();
  return <TelegramButton mode="link" onDone={() => router.refresh()} />;
}
