import * as bg from 'behavior-graph'
import * as msg from './messages.js'
import {BehaviorLinkSpec} from "./messages.js";

export interface DevtoolClientHook {
    allGraphs(): Map<number, bg.Graph>
}

export interface DevtoolClientConnection {
    clientSend(message: msg.Message): void;

    clientListen(listener: (message: msg.Message) => void): void;
}

export class DefaultHook implements DevtoolClientHook {
    allGraphs(): Map<number, bg.Graph> {
        // @ts-ignore
        if (globalThis.__bgAllGraphs !== undefined) {
            // @ts-ignore
            return globalThis.__bgAllGraphs as Map<number, bg.Graph>;
        } else {
            return new Map() as Map<number, bg.Graph>;
        }
    }
}

export class DevtoolClient {

    clientHook: DevtoolClientHook;
    connection: DevtoolClientConnection;
    graph: bg.Graph = new bg.Graph();
    extent: ClientExtent = new ClientExtent(this.graph);

    constructor(connection: DevtoolClientConnection) {
        this.extent.addToGraphWithAction();

        this.clientHook = new DefaultHook();
        this.connection = connection;
        connection.clientListen((message: msg.Message) => {
            this.handleMessage(message);
        });
    }

    handleMessage(message: msg.Message) {
        switch (message.type) {
            case "init":
                this.connection.clientSend(new msg.InitResponseMessage())
                break;
            case "list-graphs": {
                let graphs: msg.GraphSpec[] = [];
                this.clientHook.allGraphs().forEach((value, key) => {
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
                let allGraphs = this.clientHook.allGraphs();
                let graph = this.clientHook.allGraphs().get(detailsMessage.graphId);
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

                    this.connection.clientSend(responseMessage);
                    break;
                }
            }
            case "step-forward": {
                let stepForwardMessage = message as msg.StepForward;
                let graph = this.clientHook.allGraphs().get(stepForwardMessage.graphId);
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
    if (resource.resourceType === bg.ResourceType.moment) {
        let value = (resource as bg.Moment<any>).value;
        if (value === undefined) {
            return value;
        } else {
            return  JSON.parse(JSON.stringify(value));
        }
    } else if (resource.resourceType === bg.ResourceType.state) {
        return JSON.parse(JSON.stringify((resource as bg.State<any>).value));
    } else {
        return undefined;
    }
}

function traceValueFromResource(resource: bg.Resource): any {
    if (resource.resourceType === bg.ResourceType.state) {
        return JSON.parse(JSON.stringify((resource as bg.State<any>).traceValue));
    } else {
        return undefined;
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