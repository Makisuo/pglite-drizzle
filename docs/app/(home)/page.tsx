import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center space-y-6 text-center">
			<Image src="/logo.svg" alt="PGLite Drizzle Logo" width={600} height={400} />

			<p className="text-fd-muted-foreground">
				You can open{" "}
				<Link href="/docs" className="font-semibold text-fd-foreground underline">
					/docs
				</Link>{" "}
				and see the documentation.
			</p>
		</main>
	)
}
