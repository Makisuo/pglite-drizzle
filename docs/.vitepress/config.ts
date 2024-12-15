import { defineConfig } from "vitepress"

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "PGlite Drizzle",
	description: "",
	themeConfig: {
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Getting Started", link: "/getting-started" },
		],

		sidebar: [
			{
				text: "Guide",
				items: [{ text: "Getting Started", link: "/getting-started" }],
			},
		],

		socialLinks: [{ icon: "github", link: "https://github.com/vuejs/vitepress" }],
	},
})
