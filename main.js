import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackConfig from './webpack.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Development middleware
if (process.env.NODE_ENV !== 'production') {
    const compiler = webpack(webpackConfig);
    app.use(webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath || '/',
    }));
}

// Serve static files
app.use(express.static(join(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
