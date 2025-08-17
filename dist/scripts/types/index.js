"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisError = exports.CompilationError = void 0;
class CompilationError extends Error {
    errors;
    constructor(message, errors) {
        super(message);
        this.errors = errors || [];
    }
}
exports.CompilationError = CompilationError;
class AnalysisError extends Error {
}
exports.AnalysisError = AnalysisError;
