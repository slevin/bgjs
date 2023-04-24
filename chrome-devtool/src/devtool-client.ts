import * as bg from 'behavior-graph'
import * as msg from './messages.js'
import {BehaviorLinkSpec} from "./messages.js";


export interface DevtoolClientConnection {
    clientSend(message: msg.Message): void;

    clientListen(listener: (message: msg.Message) => void): void;
}

export class DevtoolClient implements bg._BG_DebugClient {

    connection: DevtoolClientConnection;
    graph: bg.Graph = new bg.Graph();
    extent: ClientExtent = new ClientExtent(this.graph);

    constructor(connection: DevtoolClientConnection) {
        this.extent.addToGraphWithAction();

        this.connection = connection;
        this.clientHook.client = this;
        connection.clientListen((message: msg.Message) => {
            this.handleMessage(message);
        });
    }

    get clientHook(): bg._BG_DebugHook {
        // @ts-ignore
        let maybeHook: _BG_DebugHook | undefined = globalThis.__bg_debugHook;
        if (maybeHook === undefined) {
            // @ts-ignore
            globalThis.__bg_debugHook = new _BG_DebugHook();
            // @ts-ignore
            maybeHook = globalThis.__bg_debugHook;
        }
        return maybeHook!;
    }

    stoppedAtStep(graph: bg.Graph) {
        let message = new msg.StoppedAtStep(graph._graphId);
        this.connection.clientSend(message);
    }

    handleMessage(message: msg.Message) {
        switch (message.type) {
            case "init":
                this.connection.clientSend(new msg.InitResponseMessage())
                break;
            case "list-graphs": {
                let graphs: msg.GraphSpec[] = [];
                this.clientHook.allGraphs.forEach((value, key) => {
                    graphs.push({
                        id: key,
                        debugName: ""
                    });
                });
                let responseMessage = new msg.AllGraphs(graphs);
                this.connection.clientSend(responseMessage);
                break;
            }
            case "graph-details": {
                let detailsMessage = message as msg.GraphDetails;
                let allGraphs = this.clientHook.allGraphs;
                let graph = this.clientHook.allGraphs.get(detailsMessage.graphId);
                if (graph === undefined) {
                    // TODO respond with not found
                } else {
                    let responseMessage = new msg.GraphDetailsResponse(graph._graphId);
                    responseMessage.actionQueue = graph.actions.map(action => {
                        return {
                            debugName: action.debugName ?? null,
                            updates: []
                        }
                    });
                    responseMessage.currentAction = actionSpecFromGraph(graph);
                    responseMessage.currentEvent = eventSpecFromEvent(graph.currentEvent);
                    responseMessage.lastEvent = eventSpecFromEvent(graph.lastEvent);
                    responseMessage.currentBehavior = behaviorSpecFromBehavior(graph.currentBehavior);
                    responseMessage.behaviorQueue = graph.activatedBehaviors.orderedSnapshot().map(behaviorShortSpecFromBehavior);
                    let currentSideEffect = graph.eventLoopState?.currentSideEffect;
                    responseMessage.currentSideEffect = currentSideEffect ? { debugName: currentSideEffect.debugName ?? null } : null;
                    responseMessage.sideEffectQueue = graph.effects.map(sideEffect => { return { debugName: sideEffect.debugName ?? null } });
                    responseMessage.runLoopState = runLoopStateFromGraph(graph);
                    this.connection.clientSend(responseMessage);
                    break;
                }
            }
            case "step-forward": {
                let stepForwardMessage = message as msg.StepForward;
                let graph = this.clientHook.allGraphs.get(stepForwardMessage.graphId);
                graph?.dbg_step();
            }
        }
    }
}

function actionSpecFromGraph(graph: bg.Graph): msg.ActionSpec | null {
    let eventLoopState = graph.eventLoopState;
    if (eventLoopState === null) {
        return null;
    } else {
        return {
            debugName: eventLoopState.action.debugName ?? null,
            updates: eventLoopState.actionUpdates.map(resourceShortSpecFromResource),
        }
    }
}

function eventSpecFromEvent(event: bg.GraphEvent | null): msg.EventSpec | null {
    if (event != null) {
        return {
            sequence: event.sequence,
            timestamp: event.timestamp
        }
    } else {
        return null;
    }
}

function resourceShortSpecFromResource(resource: bg.Resource): msg.ResourceShortSpec {
    return {
        graphId: resource.graph._graphId,
        extentId: resource.extent._extentId,
        resourceId: resource._resourceId,
        type: resource.resourceType,
        debugName: resource.debugName
    }
}

function valueFromResource(resource: bg.Resource): any {
    try {
        if (resource.resourceType === bg.ResourceType.moment) {
            let value = (resource as bg.Moment<any>).value;
            if (value === undefined) {
                return value;
            } else {
                //return parse(stringify(value));
                return  JSON.parse(JSON.stringify(value));
            }
        } else if (resource.resourceType === bg.ResourceType.state) {
            //return parse(stringify((resource as bg.State<any>).value));
            return JSON.parse(JSON.stringify((resource as bg.State<any>).value));
        } else {
            return undefined;
        }
    } catch (e) {
        return "unserializable";
    }
}

function traceValueFromResource(resource: bg.Resource): any {
    try {
        if (resource.resourceType === bg.ResourceType.state) {
            //return parse(stringify((resource as bg.State<any>).traceValue));
            return JSON.parse(JSON.stringify((resource as bg.State<any>).traceValue));
        } else {
            return undefined;
        }
    } catch (e) {
        return "unserializable";
    }
}

function updatedFromResource(resource: bg.Resource): number | null {
    if (resource.resourceType === bg.ResourceType.resource) {
        return null;
    } else if (resource.resourceType === bg.ResourceType.moment) {
        return (resource as bg.Moment<any>).event?.sequence ?? null;
    } else if (resource.resourceType === bg.ResourceType.state) {
        return (resource as bg.State<any>).event.sequence;
    } else {
        return null;
    }
}

function resourceSpecFromResource(resource: bg.Resource): msg.ResourceSpec {
    return {
        graphId: resource.graph._graphId,
        extentId: resource.extent._extentId,
        resourceId: resource._resourceId,
        type: resource.resourceType,
        debugName: resource.debugName,
        value: valueFromResource(resource),
        traceValue: traceValueFromResource(resource),
        updated: updatedFromResource(resource),
        suppliedBy: resource.suppliedBy ? behaviorShortSpecFromBehavior(resource.suppliedBy) : null,
        demandedBy: (() => {
            let demandedBys: BehaviorLinkSpec[] = [];
            for (let item of resource.subsequents) {
                let behaviorShortSpec = behaviorShortSpecFromBehavior(item);
                let linkType = bg.LinkType.reactive;
                if (item.orderingDemands?.has(resource)) {
                    linkType = bg.LinkType.order;
                }
                demandedBys.push({
                    behavior: behaviorShortSpec,
                    linkType: linkType
                });
            }
            return demandedBys;
        })()
    }
}

function behaviorShortSpecFromBehavior(behavior: bg.Behavior): msg.BehaviorShortSpec {
    return {
        graphId: behavior.extent.graph._graphId,
        extentId: behavior.extent._extentId,
        behaviorId: behavior._behaviorId,
        supplies: (() => {
            let supplies: msg.ResourceShortSpec[] = [];
            for (let item of behavior.supplies?.values() ?? []) {
                supplies.push(resourceShortSpecFromResource(item));
            }
            return supplies;
        })(),
    }
}

function runLoopStateFromGraph(graph: bg.Graph): msg.RunLoopState {
    if (graph.eventLoopState === null) {
        return msg.RunLoopState.notStarted;
    } else if (graph.eventLoopState.phase === bg._EventLoopPhase.action) {
        if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.notStarted) {
            return msg.RunLoopState.beforeAction;
        } else if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.ran) {
            return msg.RunLoopState.afterAction;
        }
    } else if (graph.eventLoopState.phase === bg._EventLoopPhase.updates) {
        if (graph.currentBehavior !== null) {
            if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.notStarted) {
                return msg.RunLoopState.beforeBehavior;
            } else if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.ran) {
                return msg.RunLoopState.afterBehavior;
            }
        } else if (graph.eventLoopState.runningGraphUpdates) {
            if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.notStarted) {
                return msg.RunLoopState.beforeGraphUpdate;
            } else if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.ran) {
                return msg.RunLoopState.afterGraphUpdate;
            }
        }
    } else if (graph.eventLoopState.phase === bg._EventLoopPhase.sideEffects) {
        if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.notStarted) {
            return msg.RunLoopState.beforeSideEffect;
        } else if (graph.eventLoopState.runnablePhase === bg._RunnablePhase.ran) {
            return msg.RunLoopState.afterSideEffect;
        }
    } else if (graph.eventLoopState.phase === bg._EventLoopPhase.atEnd) {
        return msg.RunLoopState.atEventEnd;
    }
    return msg.RunLoopState.unknown;
}

function behaviorSpecFromBehavior(behavior: bg.Behavior | null): msg.BehaviorSpec | null {
    if (behavior === null) {
        return null;
    }

    return {
        graphId: behavior.extent.graph._graphId,
        extentId: behavior.extent._extentId,
        behaviorId: behavior._behaviorId,
        supplies: (() => {
            let supplies: msg.ResourceSpec[] = [];
            for (let item of behavior.supplies?.values() ?? []) {
                supplies.push(resourceSpecFromResource(item));
            }
            return supplies;
        })(),
        demands: (() => {
            let demands: msg.DemandLinkSpec[] = [];
            for (let item of behavior.demands?.values() ?? []) {
                let demandLinkSpec: msg.DemandLinkSpec = {
                    resource: resourceSpecFromResource(item),
                    linkType: bg.LinkType.reactive
                };
                if (behavior.orderingDemands?.has(item)) {
                    demandLinkSpec.linkType = bg.LinkType.order;
                }
                demands.push(demandLinkSpec);
            }
            return demands;
        })(),
        order: behavior.order
    }
}

class ClientExtent extends bg.Extent {

    constructor(graph: bg.Graph) {
        super(graph);


    }

}