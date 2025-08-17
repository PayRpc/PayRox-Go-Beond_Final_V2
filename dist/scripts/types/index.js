export class CompilationError extends Error {
    errors;
    constructor(message, errors) {
        super(message);
        this.errors = errors || [];
    }
}
export class AnalysisError extends Error {
}
