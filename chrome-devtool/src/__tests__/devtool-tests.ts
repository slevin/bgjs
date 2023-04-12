import * as dt from "../devtool.js";
import * as dc from "../devtool-client.js";
import * as bg from "behavior-graph";
import {TestConnection} from "./utils/TestConnection";
import {ConnectionState} from "../devtool.js";
import * as msg from "../messages.js";

test("devtool initially has no connection", () => {
    let tool = new dt.Devtool();
    expect(tool.extent.connection.value).toBeNull();
    expect(tool.extent.connectionState.value).toEqual(ConnectionState.notConnected);
});

test("setting connection sends init message and gets response", () => {
    // |> Given we've set up a connection
    let tool = new dt.Devtool();
    let connection = new TestConnection();

    // |> When we connect
    tool.connect(connection);

    // |> Then the tool should be connecting
    expect(tool.extent.connectionState.value).toEqual(ConnectionState.connecting);
    // and we sent init message
    expect(connection.messagesFromTool[0].type).toEqual("init");

    // |> and when client connection.tst_flushClient send the response
    connection.tst_flushClientMessages();

    // |> client sent init-response
    expect(connection.sentMessagesFromClient[0].type).toEqual("init-response");
    // and tool responds by being connected
    expect(tool.extent.connectionState.value).toEqual(ConnectionState.connected);
});

describe("messages", () => {
    let tool: dt.Devtool;
    let connection: TestConnection;
    let testGraph1: bg.Graph;
    let testGraph2: bg.Graph;

    beforeEach(() => {
        tool = new dt.Devtool();
        connection = new TestConnection();

        testGraph1 = new bg.Graph();
        testGraph2 = new bg.Graph();
        //connection.clientHook.graphs.set(testGraph1._graphId, testGraph1);
        //connection.clientHook.graphs.set(testGraph2._graphId, testGraph2);

        tool.connect(connection);
    });

    test("after initialization devtool asks for graphs", () => {
        // |> Given we are initialized
        // |> When we connect
        connection.tst_flushClientMessages();

        // |> Then we request a list of graphs
        expect(connection.messagesFromTool.at(-1)?.type).toEqual("list-graphs");

        // |> And when the client responds
        connection.tst_flushClientMessages();

        // |> We have the graphs available in devtool
        // (note it also includes graphs from the tools itself)
        // TODO: maybe I should not include the devools in the graphs?
        // although that makes it easier to test as well
        expect(connection.sentMessagesFromClient.at(-1)?.type).toEqual("all-graphs");
        let graphs = tool.extent.graphs.value!;
        expect(graphs.find(g => g.id === testGraph1._graphId)).not.toBeUndefined();
        expect(graphs.find(g => g.id === testGraph2._graphId)).not.toBeUndefined();
    });

    test("request for graph details provides that information", () => {
        // |> Given we are initialized
        connection.tst_flushClientMessages();
        connection.tst_flushClientMessages();

        // |> When request graph details
        tool.requestGraphDetails(testGraph1._graphId);

        // |> Then we send a message for graph details
        let sentMessage = connection.messagesFromTool.at(-1) as msg.GraphDetails;
        expect(sentMessage).not.toBeUndefined();
        expect(sentMessage.type).toEqual("graph-details");
        expect(sentMessage.graphId).toEqual(testGraph1._graphId);

        // |> And when the client responds
        let responseMessage = connection.queuedMessagesFromClient.at(-1) as msg.GraphDetailsResponse;

        // |> We have the graph details available in devtool
        expect(responseMessage).not.toBeUndefined();
        expect(responseMessage.type).toEqual("graph-details-response");
        expect(responseMessage.graphId).toEqual(testGraph1._graphId);
    });

    test("specific graph details", () => {
        let graphId = 0;
        let extentId = 0;

        class DetailsExtent extends bg.Extent {
            startResource1 = this.moment();
            startResource2 = this.moment();
            startResource3 = this.moment();
            interiorResource1: bg.State<boolean> = this.state(false);
            interiorResource2 = this.moment();
            interiorResource3 = this.moment();


            constructor(graph: bg.Graph) {
                super(graph);

                this.behavior()
                    .supplies(this.interiorResource1, this.interiorResource2)
                    .demands(this.startResource1, this.startResource2)
                    .runs(ext1 => {
                            ext1.interiorResource1.update(true);

                            tool.requestGraphDetails(graphId);
                            let responseMessage = connection.queuedMessagesFromClient.at(-1) as msg.GraphDetailsResponse;
                            expect(responseMessage).not.toBeUndefined();
                            expect(responseMessage.graphId).toEqual(graphId);
                            expect(responseMessage.actionQueue).toHaveLength(0);
                            let currentAction = responseMessage.currentAction;
                            expect(currentAction).not.toBeNull();
                            expect(currentAction?.debugName).toEqual("update 1");
                            expect(currentAction?.updates).toHaveLength(1);
                            let updatedResource = currentAction!.updates[0];
                            expect(updatedResource.graphId).toEqual(graphId);
                            expect(updatedResource.extentId).toEqual(extentId);
                            expect(updatedResource.resourceId).toEqual(this.startResource1._resourceId);
                            expect(updatedResource.type).toEqual(msg.ResourceType.Moment);
                            expect(updatedResource.debugName).toEqual("startResource1");
                            expect(responseMessage.sideEffectQueue).toHaveLength(0);
                            expect(responseMessage.currentSideEffect).toBeNull();
                            let currentEvent = responseMessage.currentEvent;
                            expect(currentEvent).not.toBeNull();
                            expect(currentEvent?.sequence).toEqual(ext1.graph.currentEvent?.sequence);
                            expect(currentEvent?.timestamp).toEqual(ext1.graph.currentEvent?.timestamp);
                            expect(responseMessage.lastEvent).not.toBeNull();
                            expect(responseMessage.lastEvent?.sequence).toEqual(ext1.graph.lastEvent?.sequence);
                            expect(responseMessage.lastEvent?.timestamp).toEqual(ext1.graph.lastEvent?.timestamp);
                            let currentBehavior = responseMessage.currentBehavior;
                            expect(currentBehavior).not.toBeNull();
                            expect(currentBehavior?.graphId).toEqual(graphId);
                            expect(currentBehavior?.extentId).toEqual(extentId);
                            expect(currentBehavior?.behaviorId).toEqual(ext1.graph.currentBehavior?._behaviorId);
                            expect(currentBehavior?.supplies).toHaveLength(2);
                            let supply = currentBehavior?.supplies[0];
                            expect(supply?.graphId).toEqual(graphId);
                            expect(supply?.extentId).toEqual(extentId);
                            expect(supply?.resourceId).toEqual(this.interiorResource1._resourceId);
                            expect(supply?.type).toEqual(msg.ResourceType.State);
                            expect(supply?.debugName).toEqual("interiorResource1");
                            expect(supply?.value).toEqual(true);
                            expect(supply?.traceValue).toEqual(false);
                            expect(supply?.updated).toEqual(ext1.graph.currentEvent?.sequence);
                            expect(supply?.suppliedBy?.behaviorId).toEqual(ext1.graph.currentBehavior?._behaviorId);
                            expect(supply?.demandedBy).toHaveLength(2);
                            expect(currentBehavior?.demands).toHaveLength(2);
                            let demandLink = currentBehavior?.demands[0];
                            expect(demandLink?.linkType).toEqual(msg.LinkType.Reactive);
                            let demand1 = demandLink!.resource;
                            expect(demand1?.graphId).toEqual(graphId);
                            expect(demand1?.extentId).toEqual(extentId);
                            expect(demand1?.resourceId).toEqual(this.startResource1._resourceId);
                            expect(demand1?.type).toEqual(msg.ResourceType.Moment);
                            expect(demand1?.debugName).toEqual("startResource1");
                            expect(demand1?.value).toEqual(1);
                            expect(demand1?.traceValue).toEqual(null);
                            expect(demand1?.updated).toEqual(ext1.graph.currentEvent?.sequence);
                            expect(demand1?.suppliedBy).toEqual(null);
                            expect(demand1?.demandedBy).toHaveLength(1);
                            let demandedBy = demand1?.demandedBy!;
                            expect(demandedBy[0].linkType).toEqual(msg.LinkType.Reactive);
                            let demandingBehavior = demandedBy[0].behavior;
                            expect(demandingBehavior.graphId).toEqual(graphId);
                            expect(demandingBehavior.extentId).toEqual(extentId);
                            expect(demandingBehavior.behaviorId).toEqual(ext1.graph.currentBehavior?._behaviorId);
                            let supplies = demandingBehavior.supplies;
                            expect(supplies).toHaveLength(2);
                            expect(supplies[0].graphId).toEqual(graphId);
                            expect(supplies[0].extentId).toEqual(extentId);
                            expect(supplies[0].resourceId).toEqual(this.interiorResource1._resourceId);
                            expect(supplies[0].type).toEqual(msg.ResourceType.Moment);
                            expect(supplies[0].debugName).toEqual("interiorResource1");
                            expect(supplies[1].resourceId).toEqual(this.interiorResource2._resourceId);
                            expect(supplies[1].debugName).toEqual("interiorResource2");

                            expect(responseMessage.behaviorQueue).toHaveLength(2);
                            // TODO test behavior queue is in the correct order (I could sort that of course)
                        }
                    );

                this.behavior()
                    .demands(this.interiorResource1)
                    .runs(ext1 => {});

                this.behavior()
                    .demands(this.interiorResource1)
                    .runs(ext1 => {});
            }
        }

        // |> Given we are initialized and with a graph
        let localGraph = new bg.Graph();
        graphId = localGraph._graphId;
        let ext1 = new DetailsExtent(localGraph);
        extentId = ext1._extentId;
        ext1.addToGraphWithAction("adding extent");

        // test without action (should be no current action
        // no current graph etc
        // action without text gets name of updated resources?
        // TODO could turn on this ability to catch messages before happening to speed things up
        // most of the time I don't care right?
        connection.tst_flushClientMessages();
        connection.tst_flushClientMessages();

        // |> When I run an action I can see the graph details at various points
        ext1.startResource1.updateWithAction(1, "update 1");
        /*
        two resources
        starts one
        I'm in behavior that supplies a third and fourth resource
        third activates two more behaviors
        each one supplies a resource
        and creates a side effect which activates the other resource
        inside the first behavior I check
        inside the first side effect I check
        that should cover most things right?
         */

    });
});

// try connecting multiple times does what?
// init comes back from client and I'm not connecting?