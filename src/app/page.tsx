"use server";

import { cookies } from "next/headers";
import ImageProcessor from "@/components/ImageProcessor";
import Auth from "@/components/Auth";

export default async function Home() {
  const cookieStore = await cookies();
  const isAuthenticated =
    cookieStore.get("authToken")?.value === process.env.PRIVATE_ACCESS_PASSWORD;

  return <main>{isAuthenticated ? <ImageProcessor /> : <Auth />}</main>;
}
