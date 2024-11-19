import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './components/App';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#1e1e1e',
            paper: '#252526'
        },
        primary: {
            main: '#007acc'
        }
    },
});

ReactDOM.render(
    <React.StrictMode>
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
);
