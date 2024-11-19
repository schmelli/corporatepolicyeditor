const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SettingsService extends EventEmitter {
    constructor(configPath) {
        super();
        this.configPath = configPath;
        this.settings = null;
        this.encryptionKey = null;
    }

    // Initialize settings with defaults
    async initialize() {
        try {
            await this.loadSettings();
        } catch (error) {
            // Create default settings if none exist
            this.settings = {
                general: {
                    locale: 'en-US',
                    theme: 'light',
                    fontSize: 14,
                    fontFamily: 'Arial',
                    autoSave: true,
                    autoSaveInterval: 300000, // 5 minutes
                },
                editor: {
                    indentSize: 4,
                    wordWrap: true,
                    lineNumbers: true,
                    highlightCurrentLine: true,
                    matchBrackets: true,
                    autoCloseBrackets: true,
                    showWhitespace: false,
                    rulers: [80, 120],
                },
                ai: {
                    openaiApiKey: '',
                    anthropicApiKey: '',
                    enableSuggestions: true,
                    suggestionDelay: 1000,
                    maxSuggestions: 5,
                },
                collaboration: {
                    userName: '',
                    userEmail: '',
                    showCursors: true,
                    showSelections: true,
                    notifyOnChanges: true,
                },
                security: {
                    encryptDocuments: false,
                    autoLock: true,
                    autoLockTimeout: 900000, // 15 minutes
                    requirePassword: false,
                },
                backup: {
                    enabled: true,
                    interval: 86400000, // 24 hours
                    maxBackups: 10,
                    location: 'backups',
                },
                export: {
                    defaultFormat: 'pdf',
                    paperSize: 'A4',
                    margin: '2.5cm',
                    headerTemplate: '',
                    footerTemplate: '',
                },
                notifications: {
                    enabled: true,
                    sound: true,
                    desktop: true,
                    collaborationUpdates: true,
                    aiSuggestions: true,
                },
                privacy: {
                    collectAnalytics: false,
                    shareUsageData: false,
                    storageLocation: 'local',
                },
                accessibility: {
                    highContrast: false,
                    reducedMotion: false,
                    screenReader: false,
                    keyboardNavigation: true,
                }
            };
            await this.saveSettings();
        }

        // Set up encryption key if needed
        if (this.settings.security.encryptDocuments && !this.encryptionKey) {
            this.encryptionKey = await this.generateEncryptionKey();
        }

        return this.settings;
    }

    // Load settings from file
    async loadSettings() {
        const data = await fs.readFile(this.configPath, 'utf8');
        this.settings = JSON.parse(data);
        this.emit('settings-loaded', this.settings);
        return this.settings;
    }

    // Save settings to file
    async saveSettings() {
        const data = JSON.stringify(this.settings, null, 2);
        await fs.writeFile(this.configPath, data, 'utf8');
        this.emit('settings-saved', this.settings);
        return true;
    }

    // Update specific settings
    async updateSettings(category, updates) {
        if (!this.settings[category]) {
            throw new Error(`Invalid settings category: ${category}`);
        }

        this.settings[category] = {
            ...this.settings[category],
            ...updates
        };

        await this.saveSettings();
        this.emit('settings-updated', {
            category,
            updates,
            settings: this.settings
        });

        return this.settings[category];
    }

    // Get specific settings category
    getSettings(category) {
        if (!category) return this.settings;
        if (!this.settings[category]) {
            throw new Error(`Invalid settings category: ${category}`);
        }
        return this.settings[category];
    }

    // Reset settings to defaults
    async resetSettings(category = null) {
        if (category) {
            if (!this.settings[category]) {
                throw new Error(`Invalid settings category: ${category}`);
            }
            await this.initialize();
            this.settings[category] = { ...this.settings[category] };
        } else {
            await this.initialize();
        }

        await this.saveSettings();
        this.emit('settings-reset', {
            category,
            settings: this.settings
        });

        return this.settings;
    }

    // Validate API keys
    async validateApiKeys() {
        const validations = [];

        if (this.settings.ai.openaiApiKey) {
            try {
                // Implement OpenAI API validation
                validations.push({
                    service: 'openai',
                    valid: true
                });
            } catch (error) {
                validations.push({
                    service: 'openai',
                    valid: false,
                    error: error.message
                });
            }
        }

        if (this.settings.ai.anthropicApiKey) {
            try {
                // Implement Anthropic API validation
                validations.push({
                    service: 'anthropic',
                    valid: true
                });
            } catch (error) {
                validations.push({
                    service: 'anthropic',
                    valid: false,
                    error: error.message
                });
            }
        }

        return validations;
    }

    // Generate encryption key
    async generateEncryptionKey() {
        return crypto.randomBytes(32);
    }

    // Export settings
    async exportSettings(exportPath) {
        const exportData = {
            settings: this.settings,
            timestamp: new Date(),
            version: '1.0'
        };

        await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
        return exportData;
    }

    // Import settings
    async importSettings(importPath) {
        try {
            const data = await fs.readFile(importPath, 'utf8');
            const importData = JSON.parse(data);

            // Validate import data
            if (!importData.settings || !importData.version) {
                throw new Error('Invalid settings file format');
            }

            this.settings = importData.settings;
            await this.saveSettings();

            this.emit('settings-imported', this.settings);
            return this.settings;
        } catch (error) {
            throw new Error(`Failed to import settings: ${error.message}`);
        }
    }

    // Get available themes
    getThemes() {
        return {
            light: {
                name: 'Light',
                colors: {
                    background: '#ffffff',
                    foreground: '#000000',
                    primary: '#007acc',
                    secondary: '#6c757d',
                    success: '#28a745',
                    warning: '#ffc107',
                    error: '#dc3545'
                }
            },
            dark: {
                name: 'Dark',
                colors: {
                    background: '#1e1e1e',
                    foreground: '#ffffff',
                    primary: '#0098ff',
                    secondary: '#808080',
                    success: '#4caf50',
                    warning: '#ff9800',
                    error: '#f44336'
                }
            },
            highContrast: {
                name: 'High Contrast',
                colors: {
                    background: '#000000',
                    foreground: '#ffffff',
                    primary: '#00ff00',
                    secondary: '#ffff00',
                    success: '#00ff00',
                    warning: '#ffff00',
                    error: '#ff0000'
                }
            }
        };
    }

    // Get available locales
    getLocales() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Español' },
            { code: 'fr-FR', name: 'Français' },
            { code: 'de-DE', name: 'Deutsch' },
            { code: 'it-IT', name: 'Italiano' },
            { code: 'pt-BR', name: 'Português (Brasil)' },
            { code: 'ja-JP', name: '日本語' },
            { code: 'zh-CN', name: '简体中文' },
            { code: 'zh-TW', name: '繁體中文' },
            { code: 'ko-KR', name: '한국어' }
        ];
    }

    // Get font families
    getFontFamilies() {
        return [
            'Arial',
            'Helvetica',
            'Times New Roman',
            'Courier New',
            'Georgia',
            'Verdana',
            'Monaco',
            'Consolas',
            'Fira Code',
            'JetBrains Mono'
        ];
    }
}

module.exports = SettingsService;
