import {DevtoolConnection} from "../../devtool";
import {DevtoolClient, DevtoolClientConnection} from "../../devtool-client";
import * as bg from "behavior-graph";
import {Message} from "../../messages.js";

export class TestConnection implements DevtoolConnection, DevtoolClientConnection {
    client: DevtoolClient;
    messagesFromTool: Message[] = [];
    queuedMessagesFromClient: Message[] = [];
    sentMessagesFromClient: Message[] = [];
    clientListener: ((arg0: Message) => void)|null = null;
    listener: ((arg0: Message) => void)|null = null;

    constructor() {
        this.client = new DevtoolClient(this);
    }

    send(message: Message) {
        this.messagesFromTool.push(message);
        this.clientListener?.(message);
    }

    listen(listener: (message: Message) => void) {
        this.listener = listener;
    }

    clientSend(message: Message) {
        this.queuedMessagesFromClient.push(message);
    }

    clientListen(listener: (message: Message) => void) {
        this.clientListener = listener;
    }

    tst_flushClientMessages() {
        for (let message of this.queuedMessagesFromClient) {
            this.listener?.(message);
            this.sentMessagesFromClient.push(message);
        }
        this.queuedMessagesFromClient.length = 0;
    }
}