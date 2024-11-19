const { Configuration, OpenAIApi } = require('openai');
const { v4: uuidv4 } = require('uuid');
const { EventEmitter } = require('events');

class AIService extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.openai = new OpenAIApi(new Configuration({
            apiKey: config.openaiApiKey
        }));
        this.context = new Map(); // Store conversation context
    }

    // Initialize conversation context
    async initializeContext(documentId, content) {
        const context = {
            id: uuidv4(),
            document: content,
            history: [],
            metadata: {
                created: new Date(),
                lastUpdated: new Date()
            }
        };
        this.context.set(documentId, context);
        return context;
    }

    // Generate writing suggestions
    async generateSuggestions(text, type = 'general') {
        const prompts = {
            general: 'Review this text and provide suggestions for improvement:',
            style: 'Review this text for style and tone consistency:',
            clarity: 'Review this text for clarity and readability:',
            technical: 'Review this text for technical accuracy and terminology:'
        };

        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: prompts[type] },
                    { role: 'user', content: text }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating suggestions:', error);
            throw error;
        }
    }

    // Generate section content
    async generateSection(prompt, context = {}) {
        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in corporate policy writing. Generate professional and clear content for policy documents.'
                    },
                    {
                        role: 'user',
                        content: `Generate content for the following section: ${prompt}\nContext: ${JSON.stringify(context)}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating section:', error);
            throw error;
        }
    }

    // Analyze document structure
    async analyzeStructure(document) {
        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Analyze the structure of this policy document and provide recommendations for improvement.'
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(document)
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            });

            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error('Error analyzing structure:', error);
            throw error;
        }
    }

    // Generate glossary definitions
    async generateDefinitions(terms) {
        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate clear and concise definitions for technical terms in a corporate policy context.'
                    },
                    {
                        role: 'user',
                        content: `Define the following terms: ${terms.join(', ')}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 200
            });

            const definitions = response.data.choices[0].message.content;
            return definitions.split('\n').reduce((acc, def) => {
                const [term, definition] = def.split(': ');
                acc[term.trim()] = definition.trim();
                return acc;
            }, {});
        } catch (error) {
            console.error('Error generating definitions:', error);
            throw error;
        }
    }

    // Check policy compliance
    async checkCompliance(document, regulations = []) {
        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Check this policy document for compliance with specified regulations and standards.'
                    },
                    {
                        role: 'user',
                        content: `Document: ${JSON.stringify(document)}\nRegulations: ${JSON.stringify(regulations)}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 400
            });

            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error('Error checking compliance:', error);
            throw error;
        }
    }

    // Generate document summary
    async generateSummary(document) {
        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate a concise summary of this policy document.'
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(document)
                    }
                ],
                temperature: 0.7,
                max_tokens: 200
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating summary:', error);
            throw error;
        }
    }

    // Real-time content analysis
    async analyzeContent(text) {
        try {
            const [readability, sentiment, complexity] = await Promise.all([
                this.analyzeReadability(text),
                this.analyzeSentiment(text),
                this.analyzeComplexity(text)
            ]);

            return {
                readability,
                sentiment,
                complexity,
                suggestions: await this.generateSuggestions(text)
            };
        } catch (error) {
            console.error('Error analyzing content:', error);
            throw error;
        }
    }

    // Analyze text readability
    async analyzeReadability(text) {
        // Implement readability metrics (Flesch-Kincaid, etc.)
        const words = text.split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).length;
        const syllables = this.countSyllables(text);

        const fleschKincaid = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
        const gradeLevel = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;

        return {
            score: fleschKincaid,
            gradeLevel,
            metrics: {
                words,
                sentences,
                syllables,
                averageWordLength: words / sentences
            }
        };
    }

    // Count syllables (helper function)
    countSyllables(text) {
        return text.toLowerCase()
            .replace(/[^a-z]/g, '')
            .replace(/[^aeiouy]+/g, ' ')
            .trim()
            .split(' ')
            .length;
    }

    // Analyze text sentiment
    async analyzeSentiment(text) {
        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Analyze the sentiment and tone of this text. Return a JSON object with tone, formality, and confidence scores.'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            });

            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error('Error analyzing sentiment:', error);
            throw error;
        }
    }

    // Analyze text complexity
    async analyzeComplexity(text) {
        const words = text.split(/\s+/);
        const uniqueWords = new Set(words);
        const complexWords = words.filter(word => this.countSyllables(word) > 2);

        return {
            vocabularyDiversity: uniqueWords.size / words.length,
            complexWordRatio: complexWords.length / words.length,
            averageWordLength: text.length / words.length
        };
    }

    // Generate alternative phrasings
    async generateAlternatives(text) {
        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate alternative phrasings for this text, maintaining the same meaning but varying in formality and complexity.'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.8,
                max_tokens: 200
            });

            return response.data.choices[0].message.content.split('\n');
        } catch (error) {
            console.error('Error generating alternatives:', error);
            throw error;
        }
    }
}

module.exports = AIService;
