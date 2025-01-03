import "./global.css"
import { RootProvider } from "fumadocs-ui/provider"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type { ReactNode } from "react"

const inter = Inter({
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "PGLite Drizzle",
	description: "Enables you to use drizzle-orm together with PGLite and React",
}

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	)
}

export const runtime = "edge"
