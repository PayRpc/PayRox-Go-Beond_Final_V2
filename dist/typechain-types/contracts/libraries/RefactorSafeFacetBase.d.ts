import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "../../common";
export interface RefactorSafeFacetBaseInterface extends Interface {
    getFunction(nameOrSignature: "emergencyRefactorValidation"): FunctionFragment;
    getEvent(nameOrSignatureOrTopic: "RefactorSafetyInitialized" | "RefactorValidationPassed"): EventFragment;
    encodeFunctionData(functionFragment: "emergencyRefactorValidation", values?: undefined): string;
    decodeFunctionResult(functionFragment: "emergencyRefactorValidation", data: BytesLike): Result;
}
export declare namespace RefactorSafetyInitializedEvent {
    type InputTuple = [version: BigNumberish, codeHash: BytesLike];
    type OutputTuple = [version: bigint, codeHash: string];
    interface OutputObject {
        version: bigint;
        codeHash: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RefactorValidationPassedEvent {
    type InputTuple = [checkId: BytesLike, checkType: string];
    type OutputTuple = [checkId: string, checkType: string];
    interface OutputObject {
        checkId: string;
        checkType: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface RefactorSafeFacetBase extends BaseContract {
    connect(runner?: ContractRunner | null): RefactorSafeFacetBase;
    waitForDeployment(): Promise<this>;
    interface: RefactorSafeFacetBaseInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    emergencyRefactorValidation: TypedContractMethod<[], [boolean], "view">;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getFunction(nameOrSignature: "emergencyRefactorValidation"): TypedContractMethod<[], [boolean], "view">;
    getEvent(key: "RefactorSafetyInitialized"): TypedContractEvent<RefactorSafetyInitializedEvent.InputTuple, RefactorSafetyInitializedEvent.OutputTuple, RefactorSafetyInitializedEvent.OutputObject>;
    getEvent(key: "RefactorValidationPassed"): TypedContractEvent<RefactorValidationPassedEvent.InputTuple, RefactorValidationPassedEvent.OutputTuple, RefactorValidationPassedEvent.OutputObject>;
    filters: {
        "RefactorSafetyInitialized(uint256,bytes32)": TypedContractEvent<RefactorSafetyInitializedEvent.InputTuple, RefactorSafetyInitializedEvent.OutputTuple, RefactorSafetyInitializedEvent.OutputObject>;
        RefactorSafetyInitialized: TypedContractEvent<RefactorSafetyInitializedEvent.InputTuple, RefactorSafetyInitializedEvent.OutputTuple, RefactorSafetyInitializedEvent.OutputObject>;
        "RefactorValidationPassed(bytes32,string)": TypedContractEvent<RefactorValidationPassedEvent.InputTuple, RefactorValidationPassedEvent.OutputTuple, RefactorValidationPassedEvent.OutputObject>;
        RefactorValidationPassed: TypedContractEvent<RefactorValidationPassedEvent.InputTuple, RefactorValidationPassedEvent.OutputTuple, RefactorValidationPassedEvent.OutputObject>;
    };
}
