### cognimates-training
Platform where kids train their own AI models 

#### setup

- copy `config.js.example` in the project root as `config.js`
- modify vars as needed
- `npm install` to download necessary node packages

#### dev
- `npm run dev` to start server and watch for js + scss file changes. The browser still needs a refresh on each change, and handlebars files are not watched
- open in `http://localhost:xxxx/`, with xxxx being the `module.exports.SERVER_PORT` is set in config.js  

#### build just the scss
- `npm run sass-build` 

#### run server on production (no file watching)
- `npm run prod-node-server`
