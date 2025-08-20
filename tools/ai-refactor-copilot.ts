#!/usr/bin/env node
/* eslint-disable */
/**
 * PayRox AI Refactor Copilot
 * 
 * Self-correcting AI system for automated code quality and security improvements
 * Integrates with Ollama for intelligent refactoring suggestions
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface RefactorSuggestion {
    file: string;
    line: number;
    type: 'security' | 'performance' | 'style' | 'bug';
    severity: 'high' | 'medium' | 'low';
    description: string;
    suggestion: string;
    autoFix?: boolean;
}

class PayRoxAIRefactorCopilot {
    private projectRoot: string;
    private ollamaModel: string;

    constructor(projectRoot: string = process.cwd(), ollamaModel: string = 'llama3.1:latest') {
        this.projectRoot = projectRoot;
        this.ollamaModel = ollamaModel;
    }

    /**
     * Analyze a file for potential improvements using Ollama AI
     */
    async analyzeFile(filePath: string): Promise<RefactorSuggestion[]> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const fileExtension = path.extname(filePath);
            
            // Create context-aware prompt based on file type
            const prompt = this.createAnalysisPrompt(content, fileExtension, filePath);
            
            // Query Ollama for suggestions
            const suggestions = await this.queryOllama(prompt);
            
            return this.parseSuggestions(suggestions, filePath);
        } catch (error) {
            console.error(`Error analyzing file ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Create context-aware analysis prompt for Ollama
     */
    private createAnalysisPrompt(content: string, extension: string, filePath: string): string {
        const fileType = this.getFileType(extension);
        
        return `
Analyze this ${fileType} file for potential improvements based on PayRox Diamond proxy best practices:

File: ${filePath}
Content:
\`\`\`${fileType}
${content}
\`\`\`

Please identify:
1. Security vulnerabilities or anti-patterns
2. Performance optimization opportunities
3. Code style improvements
4. Potential bugs or edge cases
5. Diamond proxy specific improvements (if applicable)

Focus on:
- EIP-2535 Diamond Standard compliance
- Storage collision prevention
- Reentrancy protection
- Gas optimization
- Access control patterns
- Upgrade safety

Return suggestions in JSON format:
{
  "suggestions": [
    {
      "line": number,
      "type": "security|performance|style|bug",
      "severity": "high|medium|low",
      "description": "Brief description",
      "suggestion": "Specific improvement recommendation",
      "autoFix": boolean
    }
  ]
}
`;
    }

    /**
     * Query Ollama with the analysis prompt
     */
    private async queryOllama(prompt: string): Promise<string> {
        try {
            const command = `ollama run ${this.ollamaModel} "${prompt.replace(/"/g, '\\"')}"`;
            const result = execSync(command, { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
            return result.trim();
        } catch (error) {
            console.error('Error querying Ollama:', error);
            return '{"suggestions": []}';
        }
    }

    /**
     * Parse Ollama response into structured suggestions
     */
    private parseSuggestions(response: string, filePath: string): RefactorSuggestion[] {
        try {
            // Extract JSON from response (Ollama might include extra text)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('No JSON found in Ollama response');
                return [];
            }

            const parsed = JSON.parse(jsonMatch[0]);
            const suggestions: RefactorSuggestion[] = [];

            if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                for (const suggestion of parsed.suggestions) {
                    suggestions.push({
                        file: filePath,
                        line: suggestion.line || 0,
                        type: suggestion.type || 'style',
                        severity: suggestion.severity || 'low',
                        description: suggestion.description || '',
                        suggestion: suggestion.suggestion || '',
                        autoFix: suggestion.autoFix || false
                    });
                }
            }

            return suggestions;
        } catch (error) {
            console.error('Error parsing Ollama response:', error);
            return [];
        }
    }

    /**
     * Get file type from extension
     */
    private getFileType(extension: string): string {
        const typeMap: Record<string, string> = {
            '.sol': 'solidity',
            '.ts': 'typescript',
            '.js': 'javascript',
            '.json': 'json',
            '.md': 'markdown'
        };
        return typeMap[extension] || 'text';
    }

    /**
     * Analyze entire project for refactoring opportunities
     */
    async analyzeProject(): Promise<RefactorSuggestion[]> {
        const allSuggestions: RefactorSuggestion[] = [];
        
        // Find all relevant files
        const files = this.findProjectFiles();
        
        console.log(`🔍 Analyzing ${files.length} files...`);
        
        for (const file of files) {
            console.log(`📄 Analyzing: ${file}`);
            const suggestions = await this.analyzeFile(file);
            allSuggestions.push(...suggestions);
        }
        
        return allSuggestions;
    }

    /**
     * Find all relevant files in the project
     */
    private findProjectFiles(): string[] {
        const files: string[] = [];
        const extensions = ['.sol', '.ts', '.js'];
        const excludeDirs = ['node_modules', '.git', 'coverage', 'artifacts', 'cache'];

        const walkDir = (dir: string) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !excludeDirs.includes(item)) {
                    walkDir(fullPath);
                } else if (stat.isFile() && extensions.includes(path.extname(item))) {
                    files.push(fullPath);
                }
            }
        };

        walkDir(this.projectRoot);
        return files;
    }

    /**
     * Generate refactor report
     */
    generateReport(suggestions: RefactorSuggestion[]): string {
        const report = [`# PayRox AI Refactor Report`, `Generated: ${new Date().toISOString()}`, ''];
        
        // Group by severity
        const bySeverity = {
            high: suggestions.filter(s => s.severity === 'high'),
            medium: suggestions.filter(s => s.severity === 'medium'),
            low: suggestions.filter(s => s.severity === 'low')
        };

        // Summary
        report.push('## Summary');
        report.push(`- **High Priority**: ${bySeverity.high.length} issues`);
        report.push(`- **Medium Priority**: ${bySeverity.medium.length} issues`);
        report.push(`- **Low Priority**: ${bySeverity.low.length} issues`);
        report.push('');

        // Detailed suggestions
        for (const [severity, items] of Object.entries(bySeverity)) {
            if (items.length === 0) continue;
            
            report.push(`## ${severity.toUpperCase()} Priority`);
            report.push('');
            
            for (const suggestion of items) {
                report.push(`### ${suggestion.file}:${suggestion.line} (${suggestion.type})`);
                report.push(`**Description**: ${suggestion.description}`);
                report.push(`**Suggestion**: ${suggestion.suggestion}`);
                if (suggestion.autoFix) {
                    report.push('✅ *Auto-fix available*');
                }
                report.push('');
            }
        }

        return report.join('\n');
    }

    /**
     * Run the AI refactor copilot
     */
    async run(): Promise<void> {
        console.log('🤖 PayRox AI Refactor Copilot Starting...');
        console.log(`📁 Project Root: ${this.projectRoot}`);
        console.log(`🧠 AI Model: ${this.ollamaModel}`);
        console.log('');

        // Analyze project
        const suggestions = await this.analyzeProject();
        
        // Generate report
        const report = this.generateReport(suggestions);
        
        // Save report
        const reportPath = path.join(this.projectRoot, 'AI_REFACTOR_REPORT.md');
        fs.writeFileSync(reportPath, report);
        
        console.log('');
        console.log('🎉 Analysis Complete!');
        console.log(`📋 Found ${suggestions.length} suggestions`);
        console.log(`📄 Report saved to: ${reportPath}`);
        
        // Show summary
        const highPriority = suggestions.filter(s => s.severity === 'high').length;
        if (highPriority > 0) {
            console.log(`⚠️  ${highPriority} high-priority issues found!`);
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const projectRoot = args[0] || process.cwd();
    const model = args[1] || 'llama3.1:latest';
    
    const copilot = new PayRoxAIRefactorCopilot(projectRoot, model);
    copilot.run().catch(console.error);
}

export default PayRoxAIRefactorCopilot;
