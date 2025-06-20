const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const acorn = require('acorn');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to extract JavaScript variables using Acorn parser
function extractJSVariables(scriptContent) {
    const variables = [];
    
    try {
        // Parse the JavaScript code using Acorn
        const ast = acorn.parse(scriptContent, {
            ecmaVersion: 'latest',
            sourceType: 'script',
            allowReturnOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true
        });
        
        // Walk through the AST to find variable declarations and assignments
        function walkNode(node, parent = null) {
            if (!node || typeof node !== 'object') return;
            
            // Handle variable declarations (var, let, const)
            if (node.type === 'VariableDeclaration') {
                for (const declarator of node.declarations) {
                    if (declarator.id && declarator.id.type === 'Identifier' && declarator.init) {
                        const varName = declarator.id.name;
                        const value = extractValueFromNode(declarator.init, scriptContent);
                        
                        if (value && (value.type === 'object' || value.type === 'array')) {
                            variables.push({
                                name: varName,
                                value: value.formatted,
                                type: value.type,
                                original: value.original,
                                parsedData: value.parsed
                            });
                        }
                    }
                }
            }
            else if (node.type === 'MemberExpression') {
                // Handle member expressions (obj.prop, window.prop)
                const varName = getMemberExpressionName(node);
                if (varName) {
                    const value = extractValueFromNode(node, scriptContent);
                    
                    if (value && (value.type === 'object' || value.type === 'array')) {
                        variables.push({
                            name: varName,
                            value: value.formatted,
                            type: value.type,
                            original: value.original,
                            parsedData: value.parsed
                        });
                    }
                }
            }
            // Handle assignment expressions (obj.prop = value, window.prop = value)
            else if (node.type === 'AssignmentExpression' && node.operator === '=') {
                let varName = null;
                
                // Handle different types of left-hand side assignments
                if (node.left.type === 'Identifier') {
                    varName = node.left.name;
                } else if (node.left.type === 'MemberExpression') {
                    varName = getMemberExpressionName(node.left);
                }
                
                if (varName && node.right) {
                    const value = extractValueFromNode(node.right, scriptContent);
                    
                    if (value && (value.type === 'object' || value.type === 'array')) {
                        variables.push({
                            name: varName,
                            value: value.formatted,
                            type: value.type,
                            original: value.original,
                            parsedData: value.parsed
                        });
                    }
                }
            }
            
            // Handle expression statements that might contain assignments
            else if (node.type === 'ExpressionStatement') {
                walkNode(node.expression, node);
            }
            
            // Handle sequence expressions (comma-separated expressions)
            else if (node.type === 'SequenceExpression') {
                for (const expr of node.expressions) {
                    walkNode(expr, node);
                }
            }
            
            // Handle conditional expressions that might contain assignments
            else if (node.type === 'ConditionalExpression') {
                walkNode(node.test, node);
                walkNode(node.consequent, node);
                walkNode(node.alternate, node);
            }
            
            // Handle logical expressions (&&, ||) that might contain assignments
            else if (node.type === 'LogicalExpression') {
                walkNode(node.left, node);
                walkNode(node.right, node);
            }
            
            // Handle binary expressions that might contain assignments
            else if (node.type === 'BinaryExpression') {
                walkNode(node.left, node);
                walkNode(node.right, node);
            }
            
            // Handle function declarations and expressions
            else if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
                if (node.body) {
                    walkNode(node.body, node);
                }
            }
            
            // Handle block statements
            else if (node.type === 'BlockStatement') {
                for (const stmt of node.body) {
                    walkNode(stmt, node);
                }
            }
            
            // Handle if statements
            else if (node.type === 'IfStatement') {
                walkNode(node.test, node);
                walkNode(node.consequent, node);
                if (node.alternate) {
                    walkNode(node.alternate, node);
                }
            }
            
            // Handle try-catch statements
            else if (node.type === 'TryStatement') {
                walkNode(node.block, node);
                if (node.handler) {
                    walkNode(node.handler.body, node);
                }
                if (node.finalizer) {
                    walkNode(node.finalizer, node);
                }
            }
            
            // Handle loops
            else if (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
                if (node.init) walkNode(node.init, node);
                if (node.test) walkNode(node.test, node);
                if (node.update) walkNode(node.update, node);
                if (node.body) walkNode(node.body, node);
            }
            
            // Handle for-in and for-of loops
            else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
                walkNode(node.left, node);
                walkNode(node.right, node);
                walkNode(node.body, node);
            }
            
            // Handle call expressions (function calls that might assign to global variables)
            else if (node.type === 'CallExpression') {
                // Check for patterns like Object.defineProperty(window, 'varName', {...})
                if (node.callee && node.callee.type === 'MemberExpression' && 
                    node.callee.object && node.callee.object.name === 'Object' &&
                    node.callee.property && node.callee.property.name === 'defineProperty' &&
                    node.arguments && node.arguments.length >= 3) {
                    
                    const target = node.arguments[0];
                    const propName = node.arguments[1];
                    const descriptor = node.arguments[2];
                    
                    if (target.type === 'Identifier' && target.name === 'window' &&
                        propName.type === 'Literal' && typeof propName.value === 'string' &&
                        descriptor) {
                        
                        const value = extractValueFromNode(descriptor, scriptContent);
                        if (value && (value.type === 'object' || value.type === 'array')) {
                            variables.push({
                                name: propName.value,
                                value: value.formatted,
                                type: value.type,
                                original: value.original,
                                parsedData: value.parsed
                            });
                        }
                    }
                }
                
                // Recursively check arguments
                for (const arg of node.arguments) {
                    walkNode(arg, node);
                }
                walkNode(node.callee, node);
            }
            
            // Handle other node types recursively
            else {
                for (const key in node) {
                    if (key !== 'parent' && node[key] && typeof node[key] === 'object') {
                        if (Array.isArray(node[key])) {
                            for (const child of node[key]) {
                                walkNode(child, node);
                            }
                        } else {
                            walkNode(node[key], node);
                        }
                    }
                }
            }
        }
        
        // Helper function to get member expression name
        function getMemberExpressionName(node) {
            if (node.type !== 'MemberExpression') return null;
            
            let parts = [];
            let current = node;
            
            while (current.type === 'MemberExpression') {
                if (current.property.type === 'Identifier') {
                    parts.unshift(current.property.name);
                } else if (current.property.type === 'Literal') {
                    parts.unshift(current.property.value);
                } else {
                    // Complex property access, get the source code
                    parts.unshift(`[${scriptContent.substring(current.property.start, current.property.end)}]`);
                }
                current = current.object;
            }
            
            if (current.type === 'Identifier') {
                parts.unshift(current.name);
                
                // Special handling for window properties
                if (current.name === 'window' && parts.length === 2) {
                    return parts[1]; // Return just the property name for window.prop
                }
                
                return parts.join('.');
            }
            
            return null;
        }
        
        walkNode(ast);
        
    } catch (error) {
        console.log('Acorn parsing failed, falling back to regex method:', error.message);
    }
    
    return variables;
}

// Function to extract value from AST node
function extractValueFromNode(node, scriptContent) {
    if (!node) return null;
    
    try {
        // Get the original source code for this node
        const original = scriptContent.substring(node.start, node.end);
        
        // Handle different node types
        if (node.type === 'ObjectExpression' || node.type === 'ArrayExpression') {
            // Try to evaluate the expression safely
            const parsed = eval('(' + original + ')');
            const type = Array.isArray(parsed) ? 'array' : 'object';
            const formatted = JSON.stringify(parsed, null, 2);
            
            return {
                original: original,
                parsed: parsed,
                formatted: formatted,
                type: type
            };
        }
        
        // Handle function calls that return objects/arrays
        else if (node.type === 'CallExpression') {
            // Try to evaluate if it's a simple call that returns an object/array
            try {
                const result = eval('(' + original + ')');
                if (result && (typeof result === 'object')) {
                    const type = Array.isArray(result) ? 'array' : 'object';
                    const formatted = JSON.stringify(result, null, 2);
                    
                    return {
                        original: original,
                        parsed: result,
                        formatted: formatted,
                        type: type
                    };
                }
            } catch (e) {
                // If evaluation fails, check if it looks like it should return an object
                if (original.includes('JSON.parse') || original.includes('Object.') || original.includes('Array.')) {
                    return {
                        original: original,
                        parsed: null,
                        formatted: original,
                        type: 'unknown'
                    };
                }
            }
        }
        
        // Handle conditional expressions that resolve to objects/arrays
        else if (node.type === 'ConditionalExpression') {
            try {
                const result = eval('(' + original + ')');
                if (result && (typeof result === 'object')) {
                    const type = Array.isArray(result) ? 'array' : 'object';
                    const formatted = JSON.stringify(result, null, 2);
                    
                    return {
                        original: original,
                        parsed: result,
                        formatted: formatted,
                        type: type
                    };
                }
            } catch (e) {
                // If evaluation fails, still capture the original if it looks like an object assignment
                if (original.includes('{') || original.includes('[')) {
                    return {
                        original: original,
                        parsed: null,
                        formatted: original,
                        type: 'conditional'
                    };
                }
            }
        }
        
        // Handle logical expressions (&&, ||) that might resolve to objects
        else if (node.type === 'LogicalExpression') {
            try {
                const result = eval('(' + original + ')');
                if (result && (typeof result === 'object')) {
                    const type = Array.isArray(result) ? 'array' : 'object';
                    const formatted = JSON.stringify(result, null, 2);
                    
                    return {
                        original: original,
                        parsed: result,
                        formatted: formatted,
                        type: type
                    };
                }
            } catch (e) {
                // Capture logical expressions that might contain objects
                if (original.includes('{') || original.includes('[')) {
                    return {
                        original: original,
                        parsed: null,
                        formatted: original,
                        type: 'logical'
                    };
                }
            }
        }
        
        // Handle member expressions that might point to objects
        else if (node.type === 'MemberExpression') {
            try {
                const result = eval(original);
                if (result && (typeof result === 'object')) {
                    const type = Array.isArray(result) ? 'array' : 'object';
                    const formatted = JSON.stringify(result, null, 2);
                    
                    return {
                        original: original,
                        parsed: result,
                        formatted: formatted,
                        type: type
                    };
                }
            } catch (e) {
                // Can't evaluate, but keep if it looks significant
                return null;
            }
        }
        
        // Handle identifiers that might reference objects
        else if (node.type === 'Identifier') {
            try {
                const result = eval(original);
                if (result && (typeof result === 'object')) {
                    const type = Array.isArray(result) ? 'array' : 'object';
                    const formatted = JSON.stringify(result, null, 2);
                    
                    return {
                        original: original,
                        parsed: result,
                        formatted: formatted,
                        type: type
                    };
                }
            } catch (e) {
                // Can't evaluate identifier
                return null;
            }
        }
        
    } catch (error) {
        console.error('Error extracting value from node:', error.message);
    }
    
    return null;
}

// API endpoint to scrape URL
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        // Validate URL
        new URL(url);
        
        // Fetch the webpage
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Parse HTML
        const $ = cheerio.load(response.data);
        const scriptTags = $('script');
        const results = [];
        
        scriptTags.each((index, element) => {
            const scriptContent = $(element).html();
            if (scriptContent && scriptContent.trim()) {
                const variables = extractJSVariables(scriptContent);
                if (variables.length > 0) {
                    results.push({
                        scriptIndex: index + 1,
                        variables: variables
                    });
                } else {
                    try {
                        // If no variables found, try to parse the script content as JSON
                        const parsed = JSON.parse(scriptContent);
                        results.push({
                            scriptIndex: index + 1,
                            variables: [{
                                name: $(element).attr('id') ?? '[::Unknown::]',
                                value: JSON.stringify(parsed, null, 2),
                                type: Array.isArray(parsed) ? 'array' : 'object',
                                original: scriptContent,
                                parsedData: parsed
                            }]
                        });
                    } catch (error) {}
                }
            }
        });
        
        res.json({
            success: true,
            url: url,
            totalScripts: scriptTags.length,
            scriptsWithVariables: results.length,
            results: results
        });
        
    } catch (error) {
        console.error('Scraping error:', error.message);
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            res.status(400).json({ error: 'Unable to reach the URL. Please check if the URL is correct and accessible.' });
        } else if (error.name === 'TypeError' && error.message.includes('Invalid URL')) {
            res.status(400).json({ error: 'Invalid URL format. Please include http:// or https://' });
        } else {
            res.status(500).json({ error: 'Failed to scrape the URL: ' + error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Web scraper server running on http://localhost:${PORT}`);
});