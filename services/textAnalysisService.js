const natural = require('natural');
const readability = require('text-readability');

class TextAnalysisService {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.tagger = new natural.BrillPOSTagger();
        
        // Initialize frequency analysis
        this.wordFrequency = {};
        this.technicalTerms = new Set();
        
        // Thresholds for suggestions
        this.complexitySuggestionThreshold = 12; // Grade level
        this.frequencyThreshold = 3; // Minimum occurrences for glossary suggestion
    }

    analyzeText(text, existingGlossaryTerms = []) {
        const analysis = {
            complexity: this.analyzeComplexity(text),
            suggestions: this.generateSuggestions(text),
            glossaryTerms: this.findPotentialGlossaryTerms(text, existingGlossaryTerms),
            technicalTerms: this.identifyTechnicalTerms(text)
        };

        return analysis;
    }

    analyzeComplexity(text) {
        return {
            fleschKincaid: readability.fleschKincaidGrade(text),
            automatedReadability: readability.automatedReadabilityIndex(text),
            colemanLiau: readability.colemanLiauIndex(text),
            averageSentenceLength: this.calculateAverageSentenceLength(text),
            complexWords: this.findComplexWords(text)
        };
    }

    calculateAverageSentenceLength(text) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length === 0) return 0;

        const totalWords = sentences.reduce((sum, sentence) => {
            return sum + (sentence.match(/\b\w+\b/g) || []).length;
        }, 0);

        return totalWords / sentences.length;
    }

    findComplexWords(text) {
        const words = this.tokenizer.tokenize(text);
        return words.filter(word => {
            const syllables = natural.Syllable.syllableCount(word);
            return syllables > 2 && word.length > 6;
        });
    }

    generateSuggestions(text) {
        const suggestions = [];
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

        sentences.forEach(sentence => {
            // Check for passive voice
            if (this.containsPassiveVoice(sentence)) {
                suggestions.push({
                    type: 'style',
                    issue: 'passive_voice',
                    sentence,
                    suggestion: 'Consider using active voice for clearer communication'
                });
            }

            // Check for long sentences
            if (sentence.split(' ').length > 25) {
                suggestions.push({
                    type: 'readability',
                    issue: 'long_sentence',
                    sentence,
                    suggestion: 'Consider breaking this long sentence into smaller ones'
                });
            }

            // Check for complex words
            const complexWords = this.findComplexWords(sentence);
            if (complexWords.length > 0) {
                suggestions.push({
                    type: 'vocabulary',
                    issue: 'complex_words',
                    words: complexWords,
                    suggestion: 'Consider using simpler alternatives for: ' + complexWords.join(', ')
                });
            }
        });

        return suggestions;
    }

    containsPassiveVoice(sentence) {
        const words = this.tokenizer.tokenize(sentence);
        const tagged = this.tagger.tag(words);
        
        for (let i = 0; i < tagged.length - 1; i++) {
            if (tagged[i].tag === 'VBN' && // Past participle
                (tagged[i - 1] && ['is', 'are', 'was', 'were'].includes(tagged[i - 1].token.toLowerCase()))) {
                return true;
            }
        }
        return false;
    }

    findPotentialGlossaryTerms(text, existingTerms) {
        const words = this.tokenizer.tokenize(text);
        const tagged = this.tagger.tag(words);
        const existingTermsSet = new Set(existingTerms.map(term => term.toLowerCase()));
        
        // Update word frequency
        words.forEach(word => {
            this.wordFrequency[word] = (this.wordFrequency[word] || 0) + 1;
        });

        // Find technical terms and frequently used words
        const potentialTerms = new Set();
        
        tagged.forEach((item, index) => {
            if (item.tag.startsWith('NN')) { // Nouns
                const term = item.token;
                if (!existingTermsSet.has(term.toLowerCase()) &&
                    this.wordFrequency[term] >= this.frequencyThreshold &&
                    term.length > 3) {
                    potentialTerms.add(term);
                }
            }
        });

        return Array.from(potentialTerms);
    }

    identifyTechnicalTerms(text) {
        const words = this.tokenizer.tokenize(text);
        const technicalTerms = new Set();

        // Look for potential technical terms based on patterns
        words.forEach(word => {
            // Capitalized words in the middle of sentences
            if (word.match(/^[A-Z][a-z]+/) && 
                word !== 'I' && 
                !this.isCommonWord(word)) {
                technicalTerms.add(word);
            }

            // Words with mixed case
            if (word.match(/[A-Z][a-z]+[A-Z]/)) {
                technicalTerms.add(word);
            }

            // Acronyms
            if (word.match(/^[A-Z]{2,}$/)) {
                technicalTerms.add(word);
            }
        });

        return Array.from(technicalTerms);
    }

    isCommonWord(word) {
        const commonWords = new Set([
            'The', 'A', 'An', 'And', 'But', 'Or', 'For', 'Nor', 'Yet', 'So',
            'In', 'On', 'At', 'To', 'By', 'Up', 'Of', 'As'
        ]);
        return commonWords.has(word);
    }

    getSentenceComplexityScore(sentence) {
        const words = this.tokenizer.tokenize(sentence);
        const complexWords = this.findComplexWords(sentence);
        const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        
        return {
            score: (complexWords.length / words.length) * 100 + (averageWordLength - 5) * 10,
            complexWords,
            averageWordLength
        };
    }

    suggestSimplification(sentence) {
        const complexity = this.getSentenceComplexityScore(sentence);
        const suggestions = [];

        if (complexity.score > 50) {
            suggestions.push({
                type: 'simplification',
                original: sentence,
                suggestions: [
                    'Break this sentence into smaller parts',
                    'Use simpler alternatives for: ' + complexity.complexWords.join(', '),
                    'Consider using more common words'
                ]
            });
        }

        return suggestions;
    }
}

module.exports = new TextAnalysisService();
