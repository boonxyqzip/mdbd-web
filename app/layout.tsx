import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Moodboard Manager",
  description: "무드보드를 생성/편집/삭제하는 클라이언트",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

