import * as bg from "behavior-graph";

export interface Message {
    type: string;
}

export class InitMessage implements Message {
    type: string = "init";
}

export class InitResponseMessage implements Message {
    type: string = "init-response";
}

export class ListGraphs implements Message {
    type: string = "list-graphs";
}

export type GraphSpec = {
    id: number;
    debugName: string | null;
}

export class AllGraphs implements Message {
    type: string = "all-graphs";
    graphs: GraphSpec[];

    constructor(allGraphs: GraphSpec[]) {
        this.graphs = allGraphs;
    }
}

export class GraphDetails implements Message {
    type: string = "graph-details";
    graphId: number;

    constructor(graphId: number) {
        this.graphId = graphId;
    }
}

export type ActionSpec = {
    debugName: string | null;
    updates: ResourceShortSpec[];
}

export type SideEffectSpec = {
    debugName: string | null;
}

export type EventSpec = {
    sequence: number;
    timestamp: Date;
}

export type ResourceSpec = {
    graphId: number;
    extentId: number;
    resourceId: number;
    type: bg.ResourceType;
    debugName: string | null;
    value: any;
    traceValue: any;
    updated: number | null;
    suppliedBy: BehaviorShortSpec | null;
    demandedBy: BehaviorLinkSpec[];
}

export type ResourceShortSpec = {
    graphId: number;
    extentId: number;
    resourceId: number;
    type: bg.ResourceType;
    debugName: string | null;
}

export type DemandLinkSpec = {
    linkType: bg.LinkType;
    resource: ResourceSpec;
}

export type BehaviorLinkSpec = {
    linkType: bg.LinkType;
    behavior: BehaviorShortSpec;
}

export type BehaviorSpec = {
    graphId: number;
    extentId: number;
    behaviorId: number;
    supplies: ResourceSpec[];
    demands: DemandLinkSpec[];
    order: number;
}

export type BehaviorShortSpec = {
    graphId: number;
    extentId: number;
    behaviorId: number;
    supplies: ResourceShortSpec[];
}

export type ExtentShortSpec = {
    graphId: number;
    extentId: number;
    debugName: string | null;
    instanceName: string | null;
}

export enum RunLoopState {
    notStarted = "notStarted",
    beforeAction = "beforeAction",
    afterAction = "afterAction",
    beforeGraphUpdate = "beforeGraphUpdate",
    afterGraphUpdate = "afterGraphUpdate",
    beforeBehavior = "beforeBehavior",
    afterBehavior = "afterBehavior",
    beforeSideEffect = "beforeSideEffect",
    afterSideEffect = "afterSideEffect",
    atEventEnd = "atEventEnd",
    unknown = "unknown"
}

export class GraphDetailsResponse implements Message {
    type: string = "graph-details-response";
    graphId: number;
    actionQueue: ActionSpec[] = [];
    currentAction: ActionSpec | null = null;
    sideEffectQueue: SideEffectSpec[] = [];
    currentSideEffect: SideEffectSpec | null = null;
    currentEvent: EventSpec | null = null;
    lastEvent: EventSpec | null = {sequence: 0, timestamp: new Date(0)};
    currentBehavior: BehaviorSpec | null = null;
    behaviorQueue: BehaviorShortSpec[] = [];
    runLoopState: RunLoopState = RunLoopState.unknown;

    constructor(graphId: number) {
        this.graphId = graphId;
    }
}

export class StepForward implements Message {
    type: string = "step-forward";
    graphId: number;

    constructor(graphId: number) {
        this.graphId = graphId;
    }
}

export class StoppedAtStep implements Message {
    type: string = "stopped-at-step";
    graphId: number;

    constructor(graphId: number) {
        this.graphId = graphId;
    }
}

export class LogEventStarted implements Message {
    type: string = "log-event-started";
    graphId: number;
    event: EventSpec;

    constructor(graphId: number, event: EventSpec) {
        this.graphId = graphId;
        this.event = event;
    }
}

export class LogActionQueued implements Message {
    type: string = "log-action-queued";
    graphId: number;
    action: ActionSpec;

    constructor(graphId: number, action: ActionSpec) {
        this.graphId = graphId;
        this.action = action;
    }
}

export class LogEventEnded implements Message {
    type: string = "log-event-ended";
    graphId: number;
    event: EventSpec;

    constructor(graphId: number, event: EventSpec) {
        this.graphId = graphId;
        this.event = event;
    }
}

export class LogActionStarted implements Message {
    type: string = "log-action-started";
    graphId: number;
    action: ActionSpec;

    constructor(graphId: number, action: ActionSpec) {
        this.graphId = graphId;
        this.action = action;
    }
}

export class LogActionEnded implements Message {
    type: string = "log-action-ended";
    graphId: number;
    action: ActionSpec;

    constructor(graphId: number, action: ActionSpec) {
        this.graphId = graphId;
        this.action = action;
    }
}

export class LogBehaviorActivated implements Message {
    type: string = "log-behavior-activated";
    graphId: number;
    behavior: BehaviorShortSpec;

    constructor(graphId: number, behavior: BehaviorShortSpec) {
        this.graphId = graphId;
        this.behavior = behavior;
    }
}

export class LogBehaviorStarted implements Message {
    type: string = "log-behavior-started";
    graphId: number;
    behavior: BehaviorShortSpec;

    constructor(graphId: number, behavior: BehaviorShortSpec) {
        this.graphId = graphId;
        this.behavior = behavior;
    }
}

export class LogBehaviorEnded implements Message {
    type: string = "log-behavior-ended";
    graphId: number;
    behavior: BehaviorShortSpec;

    constructor(graphId: number, behavior: BehaviorShortSpec) {
        this.graphId = graphId;
        this.behavior = behavior;
    }
}

export class LogResourceUpdated implements Message {
    type: string = "log-resource-updated";
    graphId: number;
    resource: ResourceShortSpec;

    constructor(graphId: number, resource: ResourceShortSpec) {
        this.graphId = graphId;
        this.resource = resource;
    }
}

export class LogExtentAdded implements Message {
    type: string = "log-extent-added";
    graphId: number;
    extent: ExtentShortSpec;

    constructor(graphId: number, extent: ExtentShortSpec) {
        this.graphId = graphId;
        this.extent = extent;
    }
}

export class LogExtentRemoved implements Message {
    type: string = "log-extent-removed";
    graphId: number;
    extent: ExtentShortSpec;

    constructor(graphId: number, extent: ExtentShortSpec) {
        this.graphId = graphId;
        this.extent = extent;
    }
}

export class LogGraphUpdatesStarted implements Message {
    type: string = "log-graph-updates-started";
    graphId: number;

    constructor(graphId: number) {
        this.graphId = graphId;
    }
}

export class LogGraphUpdatesEnded implements Message {
    type: string = "log-graph-updates-ended";
    graphId: number;

    constructor(graphId: number) {
        this.graphId = graphId;
    }
}

export class LogSideEffectQueued implements Message {
    type: string = "log-side-effect-queued";
    graphId: number;
    sideEffect: SideEffectSpec;

    constructor(graphId: number, sideEffect: SideEffectSpec) {
        this.graphId = graphId;
        this.sideEffect = sideEffect;
    }
}

export class LogSideEffectStarted implements Message {
    type: string = "log-side-effect-started";
    graphId: number;
    sideEffect: SideEffectSpec;

    constructor(graphId: number, sideEffect: SideEffectSpec) {
        this.graphId = graphId;
        this.sideEffect = sideEffect;
    }
}

export class LogSideEffectEnded implements Message {
    type: string = "log-side-effect-ended";
    graphId: number;
    sideEffect: SideEffectSpec;

    constructor(graphId: number, sideEffect: SideEffectSpec) {
        this.graphId = graphId;
        this.sideEffect = sideEffect;
    }
}