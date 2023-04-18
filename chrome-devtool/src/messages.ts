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
    debugName: string|null;
    updates: ResourceShortSpec[];
}

export type SideEffectSpec = {
    debugName: string|null;
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
    debugName: string|null;
    value: any;
    traceValue: any;
    updated: number|null;
    suppliedBy: BehaviorShortSpec | null;
    demandedBy: BehaviorLinkSpec[];
}

export type ResourceShortSpec = {
    graphId: number;
    extentId: number;
    resourceId: number;
    type: bg.ResourceType;
    debugName: string|null;
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