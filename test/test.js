import { Multipass } from "../lib/index.js";

const multipass = new Multipass("test", "https://test.myshopify.com/");
const url = multipass.generateLoginUrl({ email: "aaaa@esr.com" });
console.log(url)