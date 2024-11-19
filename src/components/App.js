import React, { useState } from 'react';
import { Box, Drawer, AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DocumentEditor from './DocumentEditor';
import DocumentStructureTree from './DocumentStructureTree';
import SettingsPanel from './SettingsPanel';

const drawerWidth = 240;

function App() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [settings, setSettings] = useState({
        theme: 'dark',
        fontSize: 14,
        fontFamily: 'Roboto',
        indentSize: 4,
        autoSave: true,
        spellCheck: true,
        aiSuggestions: true,
        wordWrap: true,
        lineNumbers: true,
        highlightCurrentLine: true,
    });

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        Corporate Policy Document Editor
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    <DocumentStructureTree />
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    <DocumentStructureTree />
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                }}
            >
                <Toolbar />
                <DocumentEditor settings={settings} />
                <SettingsPanel settings={settings} onSettingsChange={setSettings} />
            </Box>
        </Box>
    );
}

export default App;
