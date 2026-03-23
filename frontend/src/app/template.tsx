import type { ReactNode } from "react";

type RootTemplateProps = {
  children: ReactNode;
};

export default function RootTemplate({ children }: RootTemplateProps) {
  return <>{children}</>;
}
