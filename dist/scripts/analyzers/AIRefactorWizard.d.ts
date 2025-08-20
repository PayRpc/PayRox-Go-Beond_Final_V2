import { ParsedContract } from '../types/index';
export interface StrictFacet {
    name: string;
    selectors: string[];
    signatures: string[];
    notes?: string[];
    codehash?: string;
    predictedAddress?: string;
}
export interface StrictPlan {
    facets: StrictFacet[];
    init_sequence: string[];
    loupe_coverage: string[];
    missing_info: string[];
}
export declare class AIRefactorWizard {
    makeStrictPlan(parsed: ParsedContract, root?: string): StrictPlan;
}
export default AIRefactorWizard;
