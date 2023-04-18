import React from 'react'
import { createRoot } from "react-dom/client";
import { App } from "./App";
import * as bg from "behavior-graph";
import { AllCountersExtent } from "./AllCountersExtent";
import {DevtoolComponent} from "../DevtoolComponent";

let g = new bg.Graph();
let allCounters = new AllCountersExtent(g);
allCounters.addToGraphWithAction();
g.dbg_stepMode = true;
const container = document.getElementById("app");
const root = createRoot(container!)
console.log("rendering root")
root.render(
    <React.StrictMode>
        <App allCounters={allCounters} />
        <DevtoolComponent />
    </React.StrictMode>
);