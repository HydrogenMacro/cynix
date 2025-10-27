"use client"
import dynamic from "next/dynamic";
import Link from "next/link";
import { View } from "./view/View";

export default function Home() {
  return (
    <div className="flex flex-col items-stretch h-dvh">
      <div className="flex-1 flex relative overflow-hidden bg-blue-200">
        <div className="absolute left-2 top-2 text-sm leading-[1]">
          Move - WASD<br/>
          Fly Down - Shift<br/>
          Fly Up - Spacebar<br/>
          Look - Arrow Keys
        </div>
        <View />
      </div>
    </div>
  );
}

