# WebTrit Click2Dial Widget

In any case, if you would like to build development or production version, run the command 'npm install'.
To build dev version (hosted on localhost), run the command 'npm run dev'. After that please look at the console and follow the URL from that to verify the widget works properly.
To build production version, execute the command 'npm run build' and check the content of the /dist directory. It contains the content files that must be hosted at the service provider's site.
To embed the widget into end-client's website, just put two lines of code to the target websites page (see example at index.html):

	<link rel="stylesheet" href="http://localhost:5173/dist/src/widget.css">
    <script crossorigin type="module" src="http://localhost:5173/dist/widget.js" async></script>
  
Replace http://localhost:5173/dist/ - with the site URL/location on the service provider's side.


## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
