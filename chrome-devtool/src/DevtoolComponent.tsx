import {LocalConnection} from "./local-connection";
import {Devtool, DevtoolExtent} from "./devtool";
import {DevtoolClient} from "./devtool-client";
import {useBGState} from "../../react-behavior-graph";
import * as msg from "./messages";
import {ReactElement} from "react";

console.log("creating devtool objects");
let connection = new LocalConnection();
let devtool  = new Devtool();
let client = new DevtoolClient(connection);
devtool.connect(connection);

type InnerProps = {
    tool: DevtoolExtent;
}


type GraphListProps = {
    graphs: msg.GraphSpec[];
    tool: DevtoolExtent;
}

export function GraphList({ graphs, tool } : GraphListProps) {
    return (
        <div>
            <button onClick={() => { tool.refreshGraphs()}}>♻️</button>
            <ul>
                {graphs.map((graph) =>
                    <li key={graph.id}><button onClick={() => { tool.selectGraph.updateWithAction(graph.id)}}>{graph.debugName} {graph.id}</button></li>
                )}
            </ul>
        </div>
    );
}

type GraphViewProps = {
    graph: msg.GraphDetailsResponse;
    tool: DevtoolExtent;
}

export function GraphView({ graph, tool }: GraphViewProps) {

    let actions = <ul>{graph.actionQueue.map(item => { return (<li>Action: {item.debugName }</li>)})}</ul>;
    let currentAction = (
        <p>Current Action: {graph.currentAction?.debugName}
        <ul>Updates:{(graph.currentAction?.updates ?? []).map(update => { return (<li>{update.debugName}</li>)})}</ul></p>
    );
    let currentBehavior = graph.currentBehavior != null && (
        <p>Current Behavior:</p>

    );


    return (
        <div>
            <h1>Graph View</h1>
            <button onClick={() => { tool.currentGraph.updateWithAction(null)}}>List Graphs</button>
            <button onClick={() => { tool.selectGraph.updateWithAction(graph.graphId)}}>🔃</button>
            <button onClick={() => { tool.stepForward() }}>⏩</button>
            <div>
                <p>Graph id: { graph.graphId }</p>
                {actions}
                {currentAction}
                {currentBehavior}

            </div>
        </div>
    );
}

export function InnerDevtool({ tool }: InnerProps) {
    let connectionState = useBGState(tool.connectionState);
    let graphs = useBGState(tool.graphs);
    let currentGraph = useBGState(tool.currentGraph);

    let content: ReactElement;
    if (currentGraph === null) {
        content = <GraphList graphs={graphs ?? []} tool={tool} />;
    } else {
        content = <GraphView graph={currentGraph} tool={tool} />;
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
        <InnerDevtool tool={devtool.extent} />
    );
}