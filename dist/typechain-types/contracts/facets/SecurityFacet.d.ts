import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "../../common";
export declare namespace SecurityFacet {
    type SecurityConfigStruct = {
        antibotEnabled: boolean;
        buybackPaused: boolean;
        circuitBroken: boolean;
        throttleBlocks: BigNumberish;
        pauseThresholdBps: BigNumberish;
        circuitThresholdBps: BigNumberish;
    };
    type SecurityConfigStructOutput = [
        antibotEnabled: boolean,
        buybackPaused: boolean,
        circuitBroken: boolean,
        throttleBlocks: bigint,
        pauseThresholdBps: bigint,
        circuitThresholdBps: bigint
    ] & {
        antibotEnabled: boolean;
        buybackPaused: boolean;
        circuitBroken: boolean;
        throttleBlocks: bigint;
        pauseThresholdBps: bigint;
        circuitThresholdBps: bigint;
    };
}
export interface SecurityFacetInterface extends Interface {
    getFunction(nameOrSignature: "GOVERNANCE_ROLE" | "MONITOR_ROLE" | "addTrusted" | "ensureBuybackAllowed" | "getSecurityConfig" | "initializeSecurityFacet" | "isSecurityInitialized" | "isTrusted" | "removeTrusted" | "reportMarketMove" | "resetCircuitBreaker" | "setBuybackPaused" | "setEnabled" | "setThresholds" | "setThrottleBlocks" | "validateTransaction"): FunctionFragment;
    getEvent(nameOrSignatureOrTopic: "AntibotStatusUpdated" | "BuybackPaused" | "CircuitBreaker" | "MonitorPing" | "RoleGranted" | "RoleRevoked" | "ThresholdsUpdated" | "ThrottleUpdated" | "Throttled" | "TrustedAdded" | "TrustedRemoved"): EventFragment;
    encodeFunctionData(functionFragment: "GOVERNANCE_ROLE", values?: undefined): string;
    encodeFunctionData(functionFragment: "MONITOR_ROLE", values?: undefined): string;
    encodeFunctionData(functionFragment: "addTrusted", values: [AddressLike]): string;
    encodeFunctionData(functionFragment: "ensureBuybackAllowed", values?: undefined): string;
    encodeFunctionData(functionFragment: "getSecurityConfig", values?: undefined): string;
    encodeFunctionData(functionFragment: "initializeSecurityFacet", values: [
        boolean,
        BigNumberish,
        BigNumberish,
        BigNumberish,
        AddressLike[],
        AddressLike,
        AddressLike
    ]): string;
    encodeFunctionData(functionFragment: "isSecurityInitialized", values?: undefined): string;
    encodeFunctionData(functionFragment: "isTrusted", values: [AddressLike]): string;
    encodeFunctionData(functionFragment: "removeTrusted", values: [AddressLike]): string;
    encodeFunctionData(functionFragment: "reportMarketMove", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "resetCircuitBreaker", values?: undefined): string;
    encodeFunctionData(functionFragment: "setBuybackPaused", values: [boolean]): string;
    encodeFunctionData(functionFragment: "setEnabled", values: [boolean]): string;
    encodeFunctionData(functionFragment: "setThresholds", values: [BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "setThrottleBlocks", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "validateTransaction", values: [AddressLike]): string;
    decodeFunctionResult(functionFragment: "GOVERNANCE_ROLE", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "MONITOR_ROLE", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addTrusted", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "ensureBuybackAllowed", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSecurityConfig", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "initializeSecurityFacet", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "isSecurityInitialized", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "isTrusted", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "removeTrusted", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "reportMarketMove", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "resetCircuitBreaker", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setBuybackPaused", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setEnabled", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setThresholds", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setThrottleBlocks", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "validateTransaction", data: BytesLike): Result;
}
export declare namespace AntibotStatusUpdatedEvent {
    type InputTuple = [enabled: boolean];
    type OutputTuple = [enabled: boolean];
    interface OutputObject {
        enabled: boolean;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace BuybackPausedEvent {
    type InputTuple = [status: boolean];
    type OutputTuple = [status: boolean];
    interface OutputObject {
        status: boolean;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace CircuitBreakerEvent {
    type InputTuple = [status: boolean, moveBps: BigNumberish];
    type OutputTuple = [status: boolean, moveBps: bigint];
    interface OutputObject {
        status: boolean;
        moveBps: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace MonitorPingEvent {
    type InputTuple = [monitor: AddressLike, moveBps: BigNumberish];
    type OutputTuple = [monitor: string, moveBps: bigint];
    interface OutputObject {
        monitor: string;
        moveBps: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RoleGrantedEvent {
    type InputTuple = [role: BytesLike, account: AddressLike];
    type OutputTuple = [role: string, account: string];
    interface OutputObject {
        role: string;
        account: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RoleRevokedEvent {
    type InputTuple = [role: BytesLike, account: AddressLike];
    type OutputTuple = [role: string, account: string];
    interface OutputObject {
        role: string;
        account: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace ThresholdsUpdatedEvent {
    type InputTuple = [pauseBps: BigNumberish, circuitBps: BigNumberish];
    type OutputTuple = [pauseBps: bigint, circuitBps: bigint];
    interface OutputObject {
        pauseBps: bigint;
        circuitBps: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace ThrottleUpdatedEvent {
    type InputTuple = [blocks: BigNumberish];
    type OutputTuple = [blocks: bigint];
    interface OutputObject {
        blocks: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace ThrottledEvent {
    type InputTuple = [user: AddressLike, untilBlock: BigNumberish];
    type OutputTuple = [user: string, untilBlock: bigint];
    interface OutputObject {
        user: string;
        untilBlock: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace TrustedAddedEvent {
    type InputTuple = [account: AddressLike];
    type OutputTuple = [account: string];
    interface OutputObject {
        account: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace TrustedRemovedEvent {
    type InputTuple = [account: AddressLike];
    type OutputTuple = [account: string];
    interface OutputObject {
        account: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface SecurityFacet extends BaseContract {
    connect(runner?: ContractRunner | null): SecurityFacet;
    waitForDeployment(): Promise<this>;
    interface: SecurityFacetInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    GOVERNANCE_ROLE: TypedContractMethod<[], [string], "view">;
    MONITOR_ROLE: TypedContractMethod<[], [string], "view">;
    addTrusted: TypedContractMethod<[a: AddressLike], [void], "nonpayable">;
    ensureBuybackAllowed: TypedContractMethod<[], [boolean], "view">;
    getSecurityConfig: TypedContractMethod<[
    ], [
        SecurityFacet.SecurityConfigStructOutput
    ], "view">;
    initializeSecurityFacet: TypedContractMethod<[
        enabled: boolean,
        throttleBlocks: BigNumberish,
        pauseBps: BigNumberish,
        circuitBps: BigNumberish,
        initialTrusted: AddressLike[],
        governance: AddressLike,
        monitor: AddressLike
    ], [
        void
    ], "nonpayable">;
    isSecurityInitialized: TypedContractMethod<[], [boolean], "view">;
    isTrusted: TypedContractMethod<[a: AddressLike], [boolean], "view">;
    removeTrusted: TypedContractMethod<[a: AddressLike], [void], "nonpayable">;
    reportMarketMove: TypedContractMethod<[
        moveBps: BigNumberish
    ], [
        void
    ], "nonpayable">;
    resetCircuitBreaker: TypedContractMethod<[], [void], "nonpayable">;
    setBuybackPaused: TypedContractMethod<[
        paused: boolean
    ], [
        void
    ], "nonpayable">;
    setEnabled: TypedContractMethod<[enabled: boolean], [void], "nonpayable">;
    setThresholds: TypedContractMethod<[
        pauseBps_: BigNumberish,
        circuitBps_: BigNumberish
    ], [
        void
    ], "nonpayable">;
    setThrottleBlocks: TypedContractMethod<[
        blocks_: BigNumberish
    ], [
        void
    ], "nonpayable">;
    validateTransaction: TypedContractMethod<[
        sender: AddressLike
    ], [
        boolean
    ], "nonpayable">;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getFunction(nameOrSignature: "GOVERNANCE_ROLE"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "MONITOR_ROLE"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "addTrusted"): TypedContractMethod<[a: AddressLike], [void], "nonpayable">;
    getFunction(nameOrSignature: "ensureBuybackAllowed"): TypedContractMethod<[], [boolean], "view">;
    getFunction(nameOrSignature: "getSecurityConfig"): TypedContractMethod<[
    ], [
        SecurityFacet.SecurityConfigStructOutput
    ], "view">;
    getFunction(nameOrSignature: "initializeSecurityFacet"): TypedContractMethod<[
        enabled: boolean,
        throttleBlocks: BigNumberish,
        pauseBps: BigNumberish,
        circuitBps: BigNumberish,
        initialTrusted: AddressLike[],
        governance: AddressLike,
        monitor: AddressLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "isSecurityInitialized"): TypedContractMethod<[], [boolean], "view">;
    getFunction(nameOrSignature: "isTrusted"): TypedContractMethod<[a: AddressLike], [boolean], "view">;
    getFunction(nameOrSignature: "removeTrusted"): TypedContractMethod<[a: AddressLike], [void], "nonpayable">;
    getFunction(nameOrSignature: "reportMarketMove"): TypedContractMethod<[moveBps: BigNumberish], [void], "nonpayable">;
    getFunction(nameOrSignature: "resetCircuitBreaker"): TypedContractMethod<[], [void], "nonpayable">;
    getFunction(nameOrSignature: "setBuybackPaused"): TypedContractMethod<[paused: boolean], [void], "nonpayable">;
    getFunction(nameOrSignature: "setEnabled"): TypedContractMethod<[enabled: boolean], [void], "nonpayable">;
    getFunction(nameOrSignature: "setThresholds"): TypedContractMethod<[
        pauseBps_: BigNumberish,
        circuitBps_: BigNumberish
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "setThrottleBlocks"): TypedContractMethod<[blocks_: BigNumberish], [void], "nonpayable">;
    getFunction(nameOrSignature: "validateTransaction"): TypedContractMethod<[sender: AddressLike], [boolean], "nonpayable">;
    getEvent(key: "AntibotStatusUpdated"): TypedContractEvent<AntibotStatusUpdatedEvent.InputTuple, AntibotStatusUpdatedEvent.OutputTuple, AntibotStatusUpdatedEvent.OutputObject>;
    getEvent(key: "BuybackPaused"): TypedContractEvent<BuybackPausedEvent.InputTuple, BuybackPausedEvent.OutputTuple, BuybackPausedEvent.OutputObject>;
    getEvent(key: "CircuitBreaker"): TypedContractEvent<CircuitBreakerEvent.InputTuple, CircuitBreakerEvent.OutputTuple, CircuitBreakerEvent.OutputObject>;
    getEvent(key: "MonitorPing"): TypedContractEvent<MonitorPingEvent.InputTuple, MonitorPingEvent.OutputTuple, MonitorPingEvent.OutputObject>;
    getEvent(key: "RoleGranted"): TypedContractEvent<RoleGrantedEvent.InputTuple, RoleGrantedEvent.OutputTuple, RoleGrantedEvent.OutputObject>;
    getEvent(key: "RoleRevoked"): TypedContractEvent<RoleRevokedEvent.InputTuple, RoleRevokedEvent.OutputTuple, RoleRevokedEvent.OutputObject>;
    getEvent(key: "ThresholdsUpdated"): TypedContractEvent<ThresholdsUpdatedEvent.InputTuple, ThresholdsUpdatedEvent.OutputTuple, ThresholdsUpdatedEvent.OutputObject>;
    getEvent(key: "ThrottleUpdated"): TypedContractEvent<ThrottleUpdatedEvent.InputTuple, ThrottleUpdatedEvent.OutputTuple, ThrottleUpdatedEvent.OutputObject>;
    getEvent(key: "Throttled"): TypedContractEvent<ThrottledEvent.InputTuple, ThrottledEvent.OutputTuple, ThrottledEvent.OutputObject>;
    getEvent(key: "TrustedAdded"): TypedContractEvent<TrustedAddedEvent.InputTuple, TrustedAddedEvent.OutputTuple, TrustedAddedEvent.OutputObject>;
    getEvent(key: "TrustedRemoved"): TypedContractEvent<TrustedRemovedEvent.InputTuple, TrustedRemovedEvent.OutputTuple, TrustedRemovedEvent.OutputObject>;
    filters: {
        "AntibotStatusUpdated(bool)": TypedContractEvent<AntibotStatusUpdatedEvent.InputTuple, AntibotStatusUpdatedEvent.OutputTuple, AntibotStatusUpdatedEvent.OutputObject>;
        AntibotStatusUpdated: TypedContractEvent<AntibotStatusUpdatedEvent.InputTuple, AntibotStatusUpdatedEvent.OutputTuple, AntibotStatusUpdatedEvent.OutputObject>;
        "BuybackPaused(bool)": TypedContractEvent<BuybackPausedEvent.InputTuple, BuybackPausedEvent.OutputTuple, BuybackPausedEvent.OutputObject>;
        BuybackPaused: TypedContractEvent<BuybackPausedEvent.InputTuple, BuybackPausedEvent.OutputTuple, BuybackPausedEvent.OutputObject>;
        "CircuitBreaker(bool,int256)": TypedContractEvent<CircuitBreakerEvent.InputTuple, CircuitBreakerEvent.OutputTuple, CircuitBreakerEvent.OutputObject>;
        CircuitBreaker: TypedContractEvent<CircuitBreakerEvent.InputTuple, CircuitBreakerEvent.OutputTuple, CircuitBreakerEvent.OutputObject>;
        "MonitorPing(address,int256)": TypedContractEvent<MonitorPingEvent.InputTuple, MonitorPingEvent.OutputTuple, MonitorPingEvent.OutputObject>;
        MonitorPing: TypedContractEvent<MonitorPingEvent.InputTuple, MonitorPingEvent.OutputTuple, MonitorPingEvent.OutputObject>;
        "RoleGranted(bytes32,address)": TypedContractEvent<RoleGrantedEvent.InputTuple, RoleGrantedEvent.OutputTuple, RoleGrantedEvent.OutputObject>;
        RoleGranted: TypedContractEvent<RoleGrantedEvent.InputTuple, RoleGrantedEvent.OutputTuple, RoleGrantedEvent.OutputObject>;
        "RoleRevoked(bytes32,address)": TypedContractEvent<RoleRevokedEvent.InputTuple, RoleRevokedEvent.OutputTuple, RoleRevokedEvent.OutputObject>;
        RoleRevoked: TypedContractEvent<RoleRevokedEvent.InputTuple, RoleRevokedEvent.OutputTuple, RoleRevokedEvent.OutputObject>;
        "ThresholdsUpdated(uint256,uint256)": TypedContractEvent<ThresholdsUpdatedEvent.InputTuple, ThresholdsUpdatedEvent.OutputTuple, ThresholdsUpdatedEvent.OutputObject>;
        ThresholdsUpdated: TypedContractEvent<ThresholdsUpdatedEvent.InputTuple, ThresholdsUpdatedEvent.OutputTuple, ThresholdsUpdatedEvent.OutputObject>;
        "ThrottleUpdated(uint256)": TypedContractEvent<ThrottleUpdatedEvent.InputTuple, ThrottleUpdatedEvent.OutputTuple, ThrottleUpdatedEvent.OutputObject>;
        ThrottleUpdated: TypedContractEvent<ThrottleUpdatedEvent.InputTuple, ThrottleUpdatedEvent.OutputTuple, ThrottleUpdatedEvent.OutputObject>;
        "Throttled(address,uint256)": TypedContractEvent<ThrottledEvent.InputTuple, ThrottledEvent.OutputTuple, ThrottledEvent.OutputObject>;
        Throttled: TypedContractEvent<ThrottledEvent.InputTuple, ThrottledEvent.OutputTuple, ThrottledEvent.OutputObject>;
        "TrustedAdded(address)": TypedContractEvent<TrustedAddedEvent.InputTuple, TrustedAddedEvent.OutputTuple, TrustedAddedEvent.OutputObject>;
        TrustedAdded: TypedContractEvent<TrustedAddedEvent.InputTuple, TrustedAddedEvent.OutputTuple, TrustedAddedEvent.OutputObject>;
        "TrustedRemoved(address)": TypedContractEvent<TrustedRemovedEvent.InputTuple, TrustedRemovedEvent.OutputTuple, TrustedRemovedEvent.OutputObject>;
        TrustedRemoved: TypedContractEvent<TrustedRemovedEvent.InputTuple, TrustedRemovedEvent.OutputTuple, TrustedRemovedEvent.OutputObject>;
    };
}
