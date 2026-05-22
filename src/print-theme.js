import { readFile } from "node:fs/promises";

const theme = await readFile(new URL("../blogger-theme.xml", import.meta.url), "utf8");
console.log(theme);
