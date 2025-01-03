import { source } from "@/lib/source"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page"
import { notFound } from "next/navigation"

import { createTypeTable } from "fumadocs-typescript/ui"
import { Step, Steps } from "fumadocs-ui/components/steps"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"

export default async function Page(props: {
	params: Promise<{ slug?: string[] }>
}) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body

	return (
		<DocsPage toc={page.data.toc} full={page.data.full}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<DocsBody>
				<MDX components={{ ...defaultMdxComponents, Tab, Tabs, Step, Steps }} />
			</DocsBody>
		</DocsPage>
	)
}

export async function generateStaticParams() {
	return source.generateParams()
}

export async function generateMetadata(props: {
	params: Promise<{ slug?: string[] }>
}) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	return {
		title: page.data.title,
		description: page.data.description,
	}
}