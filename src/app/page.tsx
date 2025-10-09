import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-stretch">
      <div className="h-[80svh] bg-gradient-to-l from-red-500 to-blue-500 flex items-center justify-center">
        <h1 className="text-6xl font-light text-white">Cynix</h1>
        <Link href={"/game"} />
      </div>
      <div className="">
        
      </div>
    </div>
  );
}
