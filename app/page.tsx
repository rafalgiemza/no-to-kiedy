import { ModeSwitcher } from "@/components/mode-switcher";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="absolute top-0 right-0 flex justify-end items-center p-4">
        <ModeSwitcher />
      </header>
      <div className="flex flex-col gap-5 items-center justify-center h-screen px-5 text-center">
        <Image
          src="/better-auth-starter.png"
          alt="Better Auth"
          width={100}
          height={100}
          className="rounded-lg dark:invert"
        />

        <h1 className="text-4xl font-bold">no to kiedy</h1>

        <p className="text-lg">
          to aplikacja, której głównym celem jest skuteczne znajdowanie
          wspólnego terminu spotkania dla grupy zaproszonych gości.
        </p>

        <div className="flex gap-2">
          <Link href="/login">
            <Button>Login</Button>
          </Link>
          <Link href="/signup">
            <Button>Signup</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
