"use client";

import { Button } from "@/components/ui/button";
import { JSX } from "react";
import { toast } from "sonner";

export default function Home(): JSX.Element {
  return <Button onClick={() => {
	  toast.success("hi")
  }}>CLICK</Button>;
}
