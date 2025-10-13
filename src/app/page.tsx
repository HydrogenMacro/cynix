"use client"
import dynamic from "next/dynamic";
import Link from "next/link";
import { View } from "./view/View";

export default function Home() {
  return (
    <div className="flex flex-col items-stretch h-dvh">
      <div className="h-12 bg-blue-400 flex-none">

      </div>
      <div className="flex-1 flex relative overflow-hidden bg-blue-200">
        <View />
      </div>
    </div>
  );
}

