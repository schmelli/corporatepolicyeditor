import React, { useState, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Typography,
    TextField,
    Switch,
    Select,
    MenuItem,
    FormControl,
    FormControlLabel,
    InputLabel,
    Button,
    Divider,
    Alert,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {
    Brightness4,
    Language,
    Security,
    Notifications,
    Accessibility,
    Backup,
    Code,
    Group,
    Print,
    Lock,
} from '@mui/icons-material';

const SettingsPanel = ({ settingsService, onClose }) => {
    const [settings, setSettings] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [themes, setThemes] = useState([]);
    const [locales, setLocales] = useState([]);
    const [fonts, setFonts] = useState([]);
    const [apiKeyValidation, setApiKeyValidation] = useState({});
    const [saveStatus, setSaveStatus] = useState(null);
    const [editorSettings, setEditorSettings] = useState({
        theme: 'dark',
        fontSize: 14,
        fontFamily: 'Consolas',
        autoSave: true,
        autoSaveInterval: 5,
        spellCheck: true,
        aiSuggestions: true,
        aiSuggestionDelay: 1000,
        indentSize: 4,
        wordWrap: true,
        lineNumbers: true,
        highlightCurrentLine: true
    });

    useEffect(() => {
        const loadSettings = async () => {
            const currentSettings = await settingsService.getSettings();
            setSettings(currentSettings);
            setThemes(settingsService.getThemes());
            setLocales(settingsService.getLocales());
            setFonts(settingsService.getFontFamilies());
        };
        loadSettings();
    }, [settingsService]);

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleSettingChange = async (category, key, value) => {
        try {
            const updatedSettings = await settingsService.updateSettings(category, {
                [key]: value,
            });
            setSettings({
                ...settings,
                [category]: updatedSettings,
            });
            setSaveStatus({ type: 'success', message: 'Settings saved successfully' });
        } catch (error) {
            setSaveStatus({ type: 'error', message: `Failed to save settings: ${error.message}` });
        }
    };

    const handleApiKeyValidation = async () => {
        const validations = await settingsService.validateApiKeys();
        setApiKeyValidation(
            validations.reduce((acc, val) => ({
                ...acc,
                [val.service]: val,
            }), {})
        );
    };

    const handleReset = async (category) => {
        try {
            const resetSettings = await settingsService.resetSettings(category);
            setSettings(resetSettings);
            setSaveStatus({ type: 'success', message: 'Settings reset successfully' });
        } catch (error) {
            setSaveStatus({ type: 'error', message: `Failed to reset settings: ${error.message}` });
        }
    };

    const handleChange = (setting, value) => {
        setEditorSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const fontFamilies = [
        'Consolas',
        'Courier New',
        'Monaco',
        'Source Code Pro',
        'Fira Code',
        'JetBrains Mono'
    ];

    if (!settings) return null;

    const renderGeneralSettings = () => (
        <Box>
            <Typography variant="h6" gutterBottom>General Settings</Typography>
            <FormControl fullWidth margin="normal">
                <InputLabel>Theme</InputLabel>
                <Select
                    value={settings.general.theme}
                    onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
                >
                    {Object.entries(themes).map(([key, theme]) => (
                        <MenuItem key={key} value={key}>{theme.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
                <InputLabel>Language</InputLabel>
                <Select
                    value={settings.general.locale}
                    onChange={(e) => handleSettingChange('general', 'locale', e.target.value)}
                >
                    {locales.map((locale) => (
                        <MenuItem key={locale.code} value={locale.code}>{locale.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
                <InputLabel>Font Family</InputLabel>
                <Select
                    value={settings.general.fontFamily}
                    onChange={(e) => handleSettingChange('general', 'fontFamily', e.target.value)}
                >
                    {fonts.map((font) => (
                        <MenuItem key={font} value={font}>{font}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <TextField
                fullWidth
                type="number"
                label="Font Size"
                value={settings.general.fontSize}
                onChange={(e) => handleSettingChange('general', 'fontSize', parseInt(e.target.value))}
                margin="normal"
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={settings.general.autoSave}
                        onChange={(e) => handleSettingChange('general', 'autoSave', e.target.checked)}
                    />
                }
                label="Auto Save"
            />

            <TextField
                fullWidth
                type="number"
                label="Auto Save Interval (ms)"
                value={settings.general.autoSaveInterval}
                onChange={(e) => handleSettingChange('general', 'autoSaveInterval', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.general.autoSave}
            />
        </Box>
    );

    const renderAISettings = () => (
        <Box>
            <Typography variant="h6" gutterBottom>AI Settings</Typography>
            <TextField
                fullWidth
                type="password"
                label="OpenAI API Key"
                value={settings.ai.openaiApiKey}
                onChange={(e) => handleSettingChange('ai', 'openaiApiKey', e.target.value)}
                margin="normal"
            />
            {apiKeyValidation.openai && (
                <Alert severity={apiKeyValidation.openai.valid ? 'success' : 'error'}>
                    {apiKeyValidation.openai.valid ? 'OpenAI API key is valid' : apiKeyValidation.openai.error}
                </Alert>
            )}

            <TextField
                fullWidth
                type="password"
                label="Anthropic API Key"
                value={settings.ai.anthropicApiKey}
                onChange={(e) => handleSettingChange('ai', 'anthropicApiKey', e.target.value)}
                margin="normal"
            />
            {apiKeyValidation.anthropic && (
                <Alert severity={apiKeyValidation.anthropic.valid ? 'success' : 'error'}>
                    {apiKeyValidation.anthropic.valid ? 'Anthropic API key is valid' : apiKeyValidation.anthropic.error}
                </Alert>
            )}

            <Button
                variant="contained"
                color="primary"
                onClick={handleApiKeyValidation}
                sx={{ mt: 2 }}
            >
                Validate API Keys
            </Button>

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
                control={
                    <Switch
                        checked={settings.ai.enableSuggestions}
                        onChange={(e) => handleSettingChange('ai', 'enableSuggestions', e.target.checked)}
                    />
                }
                label="Enable AI Suggestions"
            />

            <TextField
                fullWidth
                type="number"
                label="Suggestion Delay (ms)"
                value={settings.ai.suggestionDelay}
                onChange={(e) => handleSettingChange('ai', 'suggestionDelay', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.ai.enableSuggestions}
            />

            <TextField
                fullWidth
                type="number"
                label="Max Suggestions"
                value={settings.ai.maxSuggestions}
                onChange={(e) => handleSettingChange('ai', 'maxSuggestions', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.ai.enableSuggestions}
            />
        </Box>
    );

    const renderSecuritySettings = () => (
        <Box>
            <Typography variant="h6" gutterBottom>Security Settings</Typography>
            <FormControlLabel
                control={
                    <Switch
                        checked={settings.security.encryptDocuments}
                        onChange={(e) => handleSettingChange('security', 'encryptDocuments', e.target.checked)}
                    />
                }
                label="Encrypt Documents"
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={settings.security.autoLock}
                        onChange={(e) => handleSettingChange('security', 'autoLock', e.target.checked)}
                    />
                }
                label="Auto Lock"
            />

            <TextField
                fullWidth
                type="number"
                label="Auto Lock Timeout (ms)"
                value={settings.security.autoLockTimeout}
                onChange={(e) => handleSettingChange('security', 'autoLockTimeout', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.security.autoLock}
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={settings.security.requirePassword}
                        onChange={(e) => handleSettingChange('security', 'requirePassword', e.target.checked)}
                    />
                }
                label="Require Password"
            />
        </Box>
    );

    const renderAccessibilitySettings = () => (
        <Box>
            <Typography variant="h6" gutterBottom>Accessibility Settings</Typography>
            <FormControlLabel
                control={
                    <Switch
                        checked={settings.accessibility.highContrast}
                        onChange={(e) => handleSettingChange('accessibility', 'highContrast', e.target.checked)}
                    />
                }
                label="High Contrast"
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={settings.accessibility.reducedMotion}
                        onChange={(e) => handleSettingChange('accessibility', 'reducedMotion', e.target.checked)}
                    />
                }
                label="Reduced Motion"
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={settings.accessibility.screenReader}
                        onChange={(e) => handleSettingChange('accessibility', 'screenReader', e.target.checked)}
                    />
                }
                label="Screen Reader Support"
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={settings.accessibility.keyboardNavigation}
                        onChange={(e) => handleSettingChange('accessibility', 'keyboardNavigation', e.target.checked)}
                    />
                }
                label="Keyboard Navigation"
            />
        </Box>
    );

    const renderEditorSettings = () => (
        <Dialog
            open={true}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    backgroundImage: 'none'
                }
            }}
        >
            <DialogTitle>
                <Typography variant="h6">Editor Settings</Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Editor
                    </Typography>
                    <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel>Theme</InputLabel>
                        <Select
                            value={editorSettings.theme}
                            onChange={(e) => handleChange('theme', e.target.value)}
                            label="Theme"
                        >
                            <MenuItem value="dark">Dark</MenuItem>
                            <MenuItem value="light">Light</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel>Font Family</InputLabel>
                        <Select
                            value={editorSettings.fontFamily}
                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                            label="Font Family"
                        >
                            {fontFamilies.map(font => (
                                <MenuItem key={font} value={font}>{font}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Font Size"
                        type="number"
                        value={editorSettings.fontSize}
                        onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                        size="small"
                        InputProps={{ inputProps: { min: 8, max: 32 } }}
                    />

                    <TextField
                        label="Indent Size"
                        type="number"
                        value={editorSettings.indentSize}
                        onChange={(e) => handleChange('indentSize', parseInt(e.target.value))}
                        size="small"
                        InputProps={{ inputProps: { min: 2, max: 8 } }}
                    />

                    <Divider />

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Features
                    </Typography>

                    <List disablePadding>
                        <ListItem>
                            <ListItemText 
                                primary="Auto Save"
                                secondary={`Save changes automatically every ${editorSettings.autoSaveInterval} minutes`}
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    edge="end"
                                    checked={editorSettings.autoSave}
                                    onChange={(e) => handleChange('autoSave', e.target.checked)}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText 
                                primary="Spell Check"
                                secondary="Check spelling while typing"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    edge="end"
                                    checked={editorSettings.spellCheck}
                                    onChange={(e) => handleChange('spellCheck', e.target.checked)}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText 
                                primary="AI Suggestions"
                                secondary="Show AI-powered writing suggestions"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    edge="end"
                                    checked={editorSettings.aiSuggestions}
                                    onChange={(e) => handleChange('aiSuggestions', e.target.checked)}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText 
                                primary="Word Wrap"
                                secondary="Wrap long lines to fit the window"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    edge="end"
                                    checked={editorSettings.wordWrap}
                                    onChange={(e) => handleChange('wordWrap', e.target.checked)}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText 
                                primary="Line Numbers"
                                secondary="Show line numbers in the editor"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    edge="end"
                                    checked={editorSettings.lineNumbers}
                                    onChange={(e) => handleChange('lineNumbers', e.target.checked)}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText 
                                primary="Highlight Current Line"
                                secondary="Highlight the line where the cursor is"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    edge="end"
                                    checked={editorSettings.highlightCurrentLine}
                                    onChange={(e) => handleChange('highlightCurrentLine', e.target.checked)}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" color="primary" onClick={onClose}>
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom>Settings</Typography>
            
            {saveStatus && (
                <Alert 
                    severity={saveStatus.type}
                    onClose={() => setSaveStatus(null)}
                    sx={{ mb: 2 }}
                >
                    {saveStatus.message}
                </Alert>
            )}

            <Tabs
                value={currentTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 3 }}
            >
                <Tab icon={<Brightness4 />} label="General" />
                <Tab icon={<Code />} label="AI" />
                <Tab icon={<Security />} label="Security" />
                <Tab icon={<Accessibility />} label="Accessibility" />
                <Tab icon={<Code />} label="Editor" />
            </Tabs>

            <Box sx={{ mt: 2 }}>
                {currentTab === 0 && renderGeneralSettings()}
                {currentTab === 1 && renderAISettings()}
                {currentTab === 2 && renderSecuritySettings()}
                {currentTab === 3 && renderAccessibilitySettings()}
                {currentTab === 4 && renderEditorSettings()}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleReset(
                        currentTab === 0 ? 'general' :
                        currentTab === 1 ? 'ai' :
                        currentTab === 2 ? 'security' :
                        currentTab === 3 ? 'accessibility' :
                        'editor'
                    )}
                >
                    Reset Current Settings
                </Button>
                <Button variant="contained" color="primary" onClick={onClose}>
                    Close
                </Button>
            </Box>
        </Box>
    );
};

export default SettingsPanel;
