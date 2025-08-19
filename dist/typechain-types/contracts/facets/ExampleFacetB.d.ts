import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "../../common";
export declare namespace ExampleFacetB {
    type OperationDataStruct = {
        operationType: BigNumberish;
        timestamp: BigNumberish;
        executor: AddressLike;
        executed: boolean;
        data: BytesLike;
    };
    type OperationDataStructOutput = [
        operationType: bigint,
        timestamp: bigint,
        executor: string,
        executed: boolean,
        data: string
    ] & {
        operationType: bigint;
        timestamp: bigint;
        executor: string;
        executed: boolean;
        data: string;
    };
}
export interface ExampleFacetBInterface extends Interface {
    getFunction(nameOrSignature: "batchExecuteB" | "complexCalculation" | "executeB" | "getAdvancedAnalytics" | "getFacetInfoB" | "getGovernance" | "getInitNonce" | "getOperation" | "getStateSummary" | "getUserOperations" | "getUserStatistics" | "initializeFacetB" | "rotateGovernance" | "rotateOperator" | "simulateOperation" | "validateOperation"): FunctionFragment;
    getEvent(nameOrSignatureOrTopic: "BatchOperationCompleted" | "FacetBExecuted" | "GovernanceRotated" | "Initialized" | "OperatorRotated" | "PausedSet" | "StateChanged"): EventFragment;
    encodeFunctionData(functionFragment: "batchExecuteB", values: [BigNumberish[], BytesLike[]]): string;
    encodeFunctionData(functionFragment: "complexCalculation", values: [BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "executeB", values: [BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "getAdvancedAnalytics", values?: undefined): string;
    encodeFunctionData(functionFragment: "getFacetInfoB", values?: undefined): string;
    encodeFunctionData(functionFragment: "getGovernance", values?: undefined): string;
    encodeFunctionData(functionFragment: "getInitNonce", values?: undefined): string;
    encodeFunctionData(functionFragment: "getOperation", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "getStateSummary", values?: undefined): string;
    encodeFunctionData(functionFragment: "getUserOperations", values: [AddressLike]): string;
    encodeFunctionData(functionFragment: "getUserStatistics", values: [AddressLike]): string;
    encodeFunctionData(functionFragment: "initializeFacetB", values: [AddressLike, AddressLike, BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "rotateGovernance", values: [AddressLike, BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "rotateOperator", values: [AddressLike, BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "simulateOperation", values: [BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "validateOperation", values: [BigNumberish, BytesLike]): string;
    decodeFunctionResult(functionFragment: "batchExecuteB", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "complexCalculation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "executeB", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getAdvancedAnalytics", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getFacetInfoB", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getGovernance", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getInitNonce", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getOperation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getStateSummary", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getUserOperations", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getUserStatistics", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "initializeFacetB", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "rotateGovernance", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "rotateOperator", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "simulateOperation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "validateOperation", data: BytesLike): Result;
}
export declare namespace BatchOperationCompletedEvent {
    type InputTuple = [
        operationCount: BigNumberish,
        successCount: BigNumberish,
        executor: AddressLike
    ];
    type OutputTuple = [
        operationCount: bigint,
        successCount: bigint,
        executor: string
    ];
    interface OutputObject {
        operationCount: bigint;
        successCount: bigint;
        executor: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace FacetBExecutedEvent {
    type InputTuple = [
        caller: AddressLike,
        operationType: BigNumberish,
        dataHash: BytesLike
    ];
    type OutputTuple = [
        caller: string,
        operationType: bigint,
        dataHash: string
    ];
    interface OutputObject {
        caller: string;
        operationType: bigint;
        dataHash: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace GovernanceRotatedEvent {
    type InputTuple = [
        oldGovernance: AddressLike,
        newGovernance: AddressLike
    ];
    type OutputTuple = [oldGovernance: string, newGovernance: string];
    interface OutputObject {
        oldGovernance: string;
        newGovernance: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace InitializedEvent {
    type InputTuple = [operator: AddressLike];
    type OutputTuple = [operator: string];
    interface OutputObject {
        operator: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace OperatorRotatedEvent {
    type InputTuple = [oldOperator: AddressLike, newOperator: AddressLike];
    type OutputTuple = [oldOperator: string, newOperator: string];
    interface OutputObject {
        oldOperator: string;
        newOperator: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace PausedSetEvent {
    type InputTuple = [paused: boolean, by: AddressLike];
    type OutputTuple = [paused: boolean, by: string];
    interface OutputObject {
        paused: boolean;
        by: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace StateChangedEvent {
    type InputTuple = [
        oldValue: BigNumberish,
        newValue: BigNumberish,
        changer: AddressLike
    ];
    type OutputTuple = [
        oldValue: bigint,
        newValue: bigint,
        changer: string
    ];
    interface OutputObject {
        oldValue: bigint;
        newValue: bigint;
        changer: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface ExampleFacetB extends BaseContract {
    connect(runner?: ContractRunner | null): ExampleFacetB;
    waitForDeployment(): Promise<this>;
    interface: ExampleFacetBInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    batchExecuteB: TypedContractMethod<[
        operations: BigNumberish[],
        dataArray: BytesLike[]
    ], [
        string[]
    ], "nonpayable">;
    complexCalculation: TypedContractMethod<[
        inputs: BigNumberish[]
    ], [
        bigint
    ], "view">;
    executeB: TypedContractMethod<[
        operationType: BigNumberish,
        data: BytesLike
    ], [
        string
    ], "nonpayable">;
    getAdvancedAnalytics: TypedContractMethod<[
    ], [
        [
            bigint,
            bigint,
            string,
            boolean,
            boolean,
            string,
            string
        ] & {
            value: bigint;
            totalOps: bigint;
            lastExecutor: string;
            isPaused: boolean;
            isInitialized: boolean;
            operatorAddr: string;
            governanceAddr: string;
        }
    ], "view">;
    getFacetInfoB: TypedContractMethod<[
    ], [
        [
            string,
            string,
            string[]
        ] & {
            name: string;
            version: string;
            selectors: string[];
        }
    ], "view">;
    getGovernance: TypedContractMethod<[], [string], "view">;
    getInitNonce: TypedContractMethod<[], [bigint], "view">;
    getOperation: TypedContractMethod<[
        operationId: BytesLike
    ], [
        ExampleFacetB.OperationDataStructOutput
    ], "view">;
    getStateSummary: TypedContractMethod<[
    ], [
        [
            bigint,
            bigint,
            string,
            boolean
        ] & {
            value: bigint;
            operations: bigint;
            executor: string;
            paused: boolean;
        }
    ], "view">;
    getUserOperations: TypedContractMethod<[
        user: AddressLike
    ], [
        bigint[]
    ], "view">;
    getUserStatistics: TypedContractMethod<[
        user: AddressLike
    ], [
        [
            bigint,
            bigint,
            bigint
        ] & {
            totalUserOps: bigint;
            mostRecentOp: bigint;
            uniqueOpTypes: bigint;
        }
    ], "view">;
    initializeFacetB: TypedContractMethod<[
        operator_: AddressLike,
        governance_: AddressLike,
        deadline: BigNumberish,
        signature: BytesLike
    ], [
        void
    ], "nonpayable">;
    rotateGovernance: TypedContractMethod<[
        newGovernance: AddressLike,
        deadline: BigNumberish,
        signature: BytesLike
    ], [
        void
    ], "nonpayable">;
    rotateOperator: TypedContractMethod<[
        newOperator: AddressLike,
        deadline: BigNumberish,
        signature: BytesLike
    ], [
        void
    ], "nonpayable">;
    simulateOperation: TypedContractMethod<[
        operationType: BigNumberish,
        data: BytesLike
    ], [
        [bigint, bigint] & {
            newValue: bigint;
            gasEstimate: bigint;
        }
    ], "view">;
    validateOperation: TypedContractMethod<[
        operationType: BigNumberish,
        data: BytesLike
    ], [
        [boolean, bigint] & {
            isValid: boolean;
            reason: bigint;
        }
    ], "view">;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getFunction(nameOrSignature: "batchExecuteB"): TypedContractMethod<[
        operations: BigNumberish[],
        dataArray: BytesLike[]
    ], [
        string[]
    ], "nonpayable">;
    getFunction(nameOrSignature: "complexCalculation"): TypedContractMethod<[inputs: BigNumberish[]], [bigint], "view">;
    getFunction(nameOrSignature: "executeB"): TypedContractMethod<[
        operationType: BigNumberish,
        data: BytesLike
    ], [
        string
    ], "nonpayable">;
    getFunction(nameOrSignature: "getAdvancedAnalytics"): TypedContractMethod<[
    ], [
        [
            bigint,
            bigint,
            string,
            boolean,
            boolean,
            string,
            string
        ] & {
            value: bigint;
            totalOps: bigint;
            lastExecutor: string;
            isPaused: boolean;
            isInitialized: boolean;
            operatorAddr: string;
            governanceAddr: string;
        }
    ], "view">;
    getFunction(nameOrSignature: "getFacetInfoB"): TypedContractMethod<[
    ], [
        [
            string,
            string,
            string[]
        ] & {
            name: string;
            version: string;
            selectors: string[];
        }
    ], "view">;
    getFunction(nameOrSignature: "getGovernance"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "getInitNonce"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "getOperation"): TypedContractMethod<[
        operationId: BytesLike
    ], [
        ExampleFacetB.OperationDataStructOutput
    ], "view">;
    getFunction(nameOrSignature: "getStateSummary"): TypedContractMethod<[
    ], [
        [
            bigint,
            bigint,
            string,
            boolean
        ] & {
            value: bigint;
            operations: bigint;
            executor: string;
            paused: boolean;
        }
    ], "view">;
    getFunction(nameOrSignature: "getUserOperations"): TypedContractMethod<[user: AddressLike], [bigint[]], "view">;
    getFunction(nameOrSignature: "getUserStatistics"): TypedContractMethod<[
        user: AddressLike
    ], [
        [
            bigint,
            bigint,
            bigint
        ] & {
            totalUserOps: bigint;
            mostRecentOp: bigint;
            uniqueOpTypes: bigint;
        }
    ], "view">;
    getFunction(nameOrSignature: "initializeFacetB"): TypedContractMethod<[
        operator_: AddressLike,
        governance_: AddressLike,
        deadline: BigNumberish,
        signature: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "rotateGovernance"): TypedContractMethod<[
        newGovernance: AddressLike,
        deadline: BigNumberish,
        signature: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "rotateOperator"): TypedContractMethod<[
        newOperator: AddressLike,
        deadline: BigNumberish,
        signature: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "simulateOperation"): TypedContractMethod<[
        operationType: BigNumberish,
        data: BytesLike
    ], [
        [bigint, bigint] & {
            newValue: bigint;
            gasEstimate: bigint;
        }
    ], "view">;
    getFunction(nameOrSignature: "validateOperation"): TypedContractMethod<[
        operationType: BigNumberish,
        data: BytesLike
    ], [
        [boolean, bigint] & {
            isValid: boolean;
            reason: bigint;
        }
    ], "view">;
    getEvent(key: "BatchOperationCompleted"): TypedContractEvent<BatchOperationCompletedEvent.InputTuple, BatchOperationCompletedEvent.OutputTuple, BatchOperationCompletedEvent.OutputObject>;
    getEvent(key: "FacetBExecuted"): TypedContractEvent<FacetBExecutedEvent.InputTuple, FacetBExecutedEvent.OutputTuple, FacetBExecutedEvent.OutputObject>;
    getEvent(key: "GovernanceRotated"): TypedContractEvent<GovernanceRotatedEvent.InputTuple, GovernanceRotatedEvent.OutputTuple, GovernanceRotatedEvent.OutputObject>;
    getEvent(key: "Initialized"): TypedContractEvent<InitializedEvent.InputTuple, InitializedEvent.OutputTuple, InitializedEvent.OutputObject>;
    getEvent(key: "OperatorRotated"): TypedContractEvent<OperatorRotatedEvent.InputTuple, OperatorRotatedEvent.OutputTuple, OperatorRotatedEvent.OutputObject>;
    getEvent(key: "PausedSet"): TypedContractEvent<PausedSetEvent.InputTuple, PausedSetEvent.OutputTuple, PausedSetEvent.OutputObject>;
    getEvent(key: "StateChanged"): TypedContractEvent<StateChangedEvent.InputTuple, StateChangedEvent.OutputTuple, StateChangedEvent.OutputObject>;
    filters: {
        "BatchOperationCompleted(uint256,uint256,address)": TypedContractEvent<BatchOperationCompletedEvent.InputTuple, BatchOperationCompletedEvent.OutputTuple, BatchOperationCompletedEvent.OutputObject>;
        BatchOperationCompleted: TypedContractEvent<BatchOperationCompletedEvent.InputTuple, BatchOperationCompletedEvent.OutputTuple, BatchOperationCompletedEvent.OutputObject>;
        "FacetBExecuted(address,uint256,bytes32)": TypedContractEvent<FacetBExecutedEvent.InputTuple, FacetBExecutedEvent.OutputTuple, FacetBExecutedEvent.OutputObject>;
        FacetBExecuted: TypedContractEvent<FacetBExecutedEvent.InputTuple, FacetBExecutedEvent.OutputTuple, FacetBExecutedEvent.OutputObject>;
        "GovernanceRotated(address,address)": TypedContractEvent<GovernanceRotatedEvent.InputTuple, GovernanceRotatedEvent.OutputTuple, GovernanceRotatedEvent.OutputObject>;
        GovernanceRotated: TypedContractEvent<GovernanceRotatedEvent.InputTuple, GovernanceRotatedEvent.OutputTuple, GovernanceRotatedEvent.OutputObject>;
        "Initialized(address)": TypedContractEvent<InitializedEvent.InputTuple, InitializedEvent.OutputTuple, InitializedEvent.OutputObject>;
        Initialized: TypedContractEvent<InitializedEvent.InputTuple, InitializedEvent.OutputTuple, InitializedEvent.OutputObject>;
        "OperatorRotated(address,address)": TypedContractEvent<OperatorRotatedEvent.InputTuple, OperatorRotatedEvent.OutputTuple, OperatorRotatedEvent.OutputObject>;
        OperatorRotated: TypedContractEvent<OperatorRotatedEvent.InputTuple, OperatorRotatedEvent.OutputTuple, OperatorRotatedEvent.OutputObject>;
        "PausedSet(bool,address)": TypedContractEvent<PausedSetEvent.InputTuple, PausedSetEvent.OutputTuple, PausedSetEvent.OutputObject>;
        PausedSet: TypedContractEvent<PausedSetEvent.InputTuple, PausedSetEvent.OutputTuple, PausedSetEvent.OutputObject>;
        "StateChanged(uint256,uint256,address)": TypedContractEvent<StateChangedEvent.InputTuple, StateChangedEvent.OutputTuple, StateChangedEvent.OutputObject>;
        StateChanged: TypedContractEvent<StateChangedEvent.InputTuple, StateChangedEvent.OutputTuple, StateChangedEvent.OutputObject>;
    };
}
