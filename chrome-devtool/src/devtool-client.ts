import * as bg from 'behavior-graph'
import * as msg from './messages.js'

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
                    let eventLoopState = graph.eventLoopState;
                    if (eventLoopState !== null) {
                        let currentAction = {
                            debugName: eventLoopState.action.debugName,
                            updates: eventLoopState.actionUpdates.map((update) => {

                            }

                        }
                    }
                    let currentAction: msg.ActionSpec | null = null;
                    if (graph.currentAction !== null) {

                    }
                    this.connection.clientSend(responseMessage);
                    break;
                }
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
            updates: eventLoopState.actionUpdates.map((update) => {
                return {
                    debugName: update.debugName,
                    value: update.value
                }
            })
        }
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

function resourceSpecFromResource(resource: bg.Resource): msg.ResourceSpec {
    let f = function(thing): boolean {
        return true;
    }(resource);
    return {
        graphId: resource.graph._graphId,
        extentId: resource.extent._extentId,
        resourceId: resource._resourceId,
        type: resource.resourceType,
        debugName: resource.debugName,
        value: function(res): string | null {
            if (res.resourceType === bg.ResourceType.moment) {
                return (res as! bg.Moment).value.toString();
            } else if (res.resourceType === bg.ResourceType.state) {
                return (res.as bg.State).value.toString();
            } else {
                return null;
            }
        }(resource),
        traceValue: (() => {
            if (resource.resourceType === bg.ResourceType.state) {
                return (resource as bg.State).traceValue.toString();
            } else {
                return null;
            }
        )
            (),
                updated
        :
            (() => {
                if (resource.resourceType === bg.ResourceType.resource) {
                    return null;
                } else if (resource.resourceType === bg.ResourceType.moment) {
                    return (resource as bg.Moment).event.sequence;
                } else if (resource.resourceType === = bg.ResourceType.state) {
                    return (resource as bg.State).event.sequence;
                } else {
                    return null;
                }
            })(),


        }
        return {
            debugName: resource.debugName ?? null,
            value: resource.value
        }
    }

    class ClientExtent extends bg.Extent {

        constructor(graph: bg.Graph) {
            super(graph);


        }

    }