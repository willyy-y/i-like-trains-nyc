"use client";

import { Suspense } from "react";
import SubwayMap from "@/components/SubwayMap";

export default function Home() {
  return (
    <Suspense fallback={<div className="w-screen h-screen bg-black" />}>
      <SubwayMap />
    </Suspense>
  );
}
