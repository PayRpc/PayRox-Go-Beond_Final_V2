import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Interface, EventFragment, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener } from "../../common";
export interface RefactorSafetyLibInterface extends Interface {
    getEvent(nameOrSignatureOrTopic: "RefactorSafetyCheck" | "SelectorCompatibilityVerified" | "StorageLayoutValidated"): EventFragment;
}
export declare namespace RefactorSafetyCheckEvent {
    type InputTuple = [
        facetId: BytesLike,
        version: BigNumberish,
        passed: boolean
    ];
    type OutputTuple = [facetId: string, version: bigint, passed: boolean];
    interface OutputObject {
        facetId: string;
        version: bigint;
        passed: boolean;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace SelectorCompatibilityVerifiedEvent {
    type InputTuple = [selectors: BytesLike[], compatible: boolean];
    type OutputTuple = [selectors: string[], compatible: boolean];
    interface OutputObject {
        selectors: string[];
        compatible: boolean;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace StorageLayoutValidatedEvent {
    type InputTuple = [namespace_: BytesLike, structHash: BytesLike];
    type OutputTuple = [namespace_: string, structHash: string];
    interface OutputObject {
        namespace: string;
        structHash: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface RefactorSafetyLib extends BaseContract {
    connect(runner?: ContractRunner | null): RefactorSafetyLib;
    waitForDeployment(): Promise<this>;
    interface: RefactorSafetyLibInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getEvent(key: "RefactorSafetyCheck"): TypedContractEvent<RefactorSafetyCheckEvent.InputTuple, RefactorSafetyCheckEvent.OutputTuple, RefactorSafetyCheckEvent.OutputObject>;
    getEvent(key: "SelectorCompatibilityVerified"): TypedContractEvent<SelectorCompatibilityVerifiedEvent.InputTuple, SelectorCompatibilityVerifiedEvent.OutputTuple, SelectorCompatibilityVerifiedEvent.OutputObject>;
    getEvent(key: "StorageLayoutValidated"): TypedContractEvent<StorageLayoutValidatedEvent.InputTuple, StorageLayoutValidatedEvent.OutputTuple, StorageLayoutValidatedEvent.OutputObject>;
    filters: {
        "RefactorSafetyCheck(bytes32,uint256,bool)": TypedContractEvent<RefactorSafetyCheckEvent.InputTuple, RefactorSafetyCheckEvent.OutputTuple, RefactorSafetyCheckEvent.OutputObject>;
        RefactorSafetyCheck: TypedContractEvent<RefactorSafetyCheckEvent.InputTuple, RefactorSafetyCheckEvent.OutputTuple, RefactorSafetyCheckEvent.OutputObject>;
        "SelectorCompatibilityVerified(bytes4[],bool)": TypedContractEvent<SelectorCompatibilityVerifiedEvent.InputTuple, SelectorCompatibilityVerifiedEvent.OutputTuple, SelectorCompatibilityVerifiedEvent.OutputObject>;
        SelectorCompatibilityVerified: TypedContractEvent<SelectorCompatibilityVerifiedEvent.InputTuple, SelectorCompatibilityVerifiedEvent.OutputTuple, SelectorCompatibilityVerifiedEvent.OutputObject>;
        "StorageLayoutValidated(bytes32,bytes32)": TypedContractEvent<StorageLayoutValidatedEvent.InputTuple, StorageLayoutValidatedEvent.OutputTuple, StorageLayoutValidatedEvent.OutputObject>;
        StorageLayoutValidated: TypedContractEvent<StorageLayoutValidatedEvent.InputTuple, StorageLayoutValidatedEvent.OutputTuple, StorageLayoutValidatedEvent.OutputObject>;
    };
}
