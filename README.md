### cognimates-training
Platform where kids train their own AI models

#### setup

Required environment variables:
- `CLARIFAI_API_KEY` - API key for Clarifai image classification
- `UCLASSIFY_READ_API_KEY` - API key for uClassify text classification (read access)
- `UCLASSIFY_WRITE_API_KEY` - API key for uClassify text classification (write access)
- `PORT` or `SERVER_PORT` - Server port (defaults to 2634)

- `npm install` to download necessary node packages

#### dev
- `npm run dev` to start server and watch for js + scss file changes. The browser still needs a refresh on each change, and handlebars files are not watched
- open in `http://localhost:2634/` (or your configured port)

#### build just the scss
- `npm run sass-build`

#### run server on production (no file watching)
- `npm run prod-node-server`
