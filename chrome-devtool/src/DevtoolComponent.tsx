import {LocalConnection} from "./local-connection";
import {Devtool, DevtoolExtent} from "./devtool";
import {DevtoolClient} from "./devtool-client";
import {useBGState} from "../../react-behavior-graph";
import * as msg from "./messages";
import {ReactElement} from "react";
import {Tabs, Tab} from "@blueprintjs/core";
import {Column, Cell, Table2, JSONFormat2} from "@blueprintjs/table";

import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/table/lib/css/table.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";

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

type LogViewProps = {
    graph: msg.GraphDetailsResponse;
    tool: DevtoolExtent;
}

export function LogView({graph, tool}: LogViewProps) {
    let log = useBGState(tool.logMessages);

    let eventCellRenderer = (rowIndex: number) => {
        return (<Cell>{log[rowIndex].type}</Cell>)
    }
    let detailsCellRenderer = (rowIndex: number) => {
        return (<Cell><JSONFormat2 detectTruncation={true}>{log[rowIndex]}</JSONFormat2></Cell>)
    }
    return (
        <Table2 numRows={log.length}>
            <Column name="Event" cellRenderer={eventCellRenderer} />
            <Column name="Details" cellRenderer={detailsCellRenderer} />
        </Table2>
    )
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
        let graphView = <GraphView graph={currentGraph} tool={tool}/>;
        let logView = <LogView graph={currentGraph} tool={tool}/>;
        content = <Tabs id="Graph Views">
            <Tab id="gv" title="Graph View" panel={graphView}/>
            <Tab id="lv" title="Log View" panel={logView}/>
        </Tabs>
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