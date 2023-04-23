import {LocalConnection} from "./local-connection";
import {Devtool, DevtoolExtent} from "./devtool";
import {DevtoolClient} from "./devtool-client";
import {useBGState} from "../../react-behavior-graph";
import * as msg from "./messages";
import {ReactElement} from "react";

console.log("creating devtool objects");
let connection = new LocalConnection();
let devtool = new Devtool();
let client = new DevtoolClient(connection);
devtool.connect(connection);

type InnerProps = {
    tool: DevtoolExtent;
}


type GraphListProps = {
    graphs: msg.GraphSpec[];
    tool: DevtoolExtent;
}

export function GraphList({graphs, tool}: GraphListProps) {
    return (
        <div>
            <button onClick={() => {
                tool.refreshGraphs()
            }}>♻️
            </button>
            <ul>
                {graphs.map((graph) =>
                    <li key={graph.id}>
                        <button onClick={() => {
                            tool.selectGraph.updateWithAction(graph.id)
                        }}>{graph.debugName} {graph.id}</button>
                    </li>
                )}
            </ul>
        </div>
    );
}

type GraphViewProps = {
    graph: msg.GraphDetailsResponse;
    tool: DevtoolExtent;
}

export function GraphView({graph, tool}: GraphViewProps) {

    let currentEvent = graph.currentEvent != null && <><p>Current Sequence:{graph.currentEvent?.sequence}</p></>;
     //{graph.currentEvent?.timestamp}
    let actions = graph.actionQueue.length > 0 && <><p>Actions:</p>
        <ul>{graph.actionQueue.map(item => {
            return (<li>Action: {item.debugName}</li>)
        })}</ul>
    </>;
    let currentAction = graph.currentAction != null && (
        <>
            <p>Current Action: {graph.currentAction?.debugName}</p>
            <ul>Updates:{(graph.currentAction?.updates ?? []).map(update => {
                return (<li>{update.debugName}</li>)
            })}</ul>
        </>
    );
    let currentBehavior = graph.currentBehavior != null && (
        <>
            <p>Current Behavior:</p>
            {graph.currentBehavior?.supplies && <p>Supplies:</p>}
            {graph.currentBehavior?.supplies && graph.currentBehavior?.supplies.map(supply => {
                return (<li>{supply.debugName} {supply.type} {supply.value} {supply.updated}</li>)
            })}
            {graph.currentBehavior?.demands && <p>Demands:</p>}
            {graph.currentBehavior?.demands && graph.currentBehavior?.demands.map(demand => {
                return (
                    <li>{demand.resource.debugName} {demand.linkType} {demand.resource.type} {demand.resource.value} {demand.resource.updated}</li>)
            })}
            <p>Order: {graph.currentBehavior?.order}</p>
        </>
    );
    let sideEffects = graph.sideEffectQueue.length > 0 && <><p>Side Effects:</p>
        <ul>{graph.sideEffectQueue.map(item => {
            return (<li>{item.debugName}</li>)
        })}</ul>
    </>;
    let currentSideEffect = graph.currentSideEffect != null && (
        <>
            <p>Current Side Effect: {graph.currentSideEffect?.debugName}</p>
        </>);

    return (
        <div>
            <h1>Graph View</h1>
            <button onClick={() => {
                tool.currentGraph.updateWithAction(null)
            }}>List Graphs
            </button>
            <button onClick={() => {
                tool.selectGraph.updateWithAction(graph.graphId)
            }}>🔃
            </button>
            <button onClick={() => {
                tool.stepForward()
            }}>⏩
            </button>
            <div>
                <p>Graph id: {graph.graphId}</p>
                <p>Run Loop State: {graph.runLoopState} </p>
                {currentEvent}
                {actions}
                {currentAction}
                {currentBehavior}
                {sideEffects}
                {currentSideEffect}

            </div>
        </div>
    );
}

export function InnerDevtool({tool}: InnerProps) {
    let connectionState = useBGState(tool.connectionState);
    let graphs = useBGState(tool.graphs);
    let currentGraph = useBGState(tool.currentGraph);

    let content: ReactElement;
    if (currentGraph === null) {
        content = <GraphList graphs={graphs ?? []} tool={tool}/>;
    } else {
        content = <GraphView graph={currentGraph} tool={tool}/>;
    }
    return (
        <div>
            <h1>Devtool</h1>
            <div>Connection Status: {connectionState}</div>
            {content}
        </div>
    );
}

export function DevtoolComponent() {
    console.log("rendering DevtoolComponent");
    return (
        <InnerDevtool tool={devtool.extent}/>
    );
}