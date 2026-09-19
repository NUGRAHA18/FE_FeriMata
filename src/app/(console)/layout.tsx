import { ConsoleFrame } from "./console-frame";

export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return <ConsoleFrame>{children}</ConsoleFrame>;
}
