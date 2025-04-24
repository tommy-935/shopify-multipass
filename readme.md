# shopify multipass

[Shopify Multipass](https://shopify.dev/docs/api/multipass) module for Node.js.

## Installation

# ignore npm install --save-dev typescript ts-node

```
npm install @tommy-935/shopify-multipass
```

## Usage

```js
import Multipass from '@tommy-935/shopify-multipass';

const multipass = new Multipass(
	'multipass-secret',
	'https://your-store.myshopify.com/'
);

const url = multipass.generateLoginUrl({
	email: 'example@example.com',
});
```